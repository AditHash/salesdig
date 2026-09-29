import { GoogleGenAI, Type } from "@google/genai";
import { CompanyIntelData } from "../../types/agent.types.js";
import { DEFAULT_WORKSPACE_SETTINGS, WorkspaceSettings } from "../../config/workspaceDefaults.js";
import {
  extractCompanyContactSourceUrls,
  hasStructuredCompanyContacts,
  pickPrimaryCompanyEmail,
  pickPrimaryCompanyPhone,
  sanitizeCompanyContactDetails
} from "../../utils/companyContactDetails.js";

const getClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing from environment variables.");
  return new GoogleGenAI({ apiKey });
};

const cleanJsonString = (text: string): string => {
  if (!text) return "{}";
  let clean = text;
  clean = clean.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  clean = clean.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/g, "");
  return clean;
};

interface MissingFields {
  needsDecisionMakers: boolean;
  needsRevenue: boolean;
  needsEmployeeCount: boolean;
  needsCompanyContacts: boolean;
  needsCloudEvidence: boolean;
  needsPotential: boolean;
}

const detectMissing = (profile: CompanyIntelData): MissingFields => ({
  needsDecisionMakers: !profile.decisionMakers || profile.decisionMakers.length < 3,
  needsRevenue: !profile.revenueData || profile.revenueData.length === 0,
  needsEmployeeCount: profile.numberOfEmployees == null || profile.numberOfEmployees === 0,
  needsCompanyContacts: !hasStructuredCompanyContacts(profile.companyContactDetails) || !profile.companyEmail || !profile.companyPhone,
  needsCloudEvidence: !profile.cloudEvidence || profile.currentCloud === "Unknown",
  needsPotential: !profile.salesPotential
});

const hasMissing = (m: MissingFields): boolean =>
  Object.values(m).some(v => v);

/**
 * Verification agent: checks what's missing from the initial research,
 * then makes a targeted follow-up Gemini call with Google Search to fill gaps.
 */
export const verifyAndFillGaps = async (
  profile: CompanyIntelData & { sourceUrls: string[] },
  customerName: string,
  companyDomain: string,
  workspace: WorkspaceSettings = DEFAULT_WORKSPACE_SETTINGS
): Promise<CompanyIntelData & { sourceUrls: string[] }> => {
  const missing = detectMissing(profile);
  if (!hasMissing(missing)) return profile;

  const gapList: string[] = [];
  const schemaProps: Record<string, any> = {};

  if (missing.needsDecisionMakers) {
    gapList.push(`- **Decision Makers**: Search for "${customerName} leadership team site:${companyDomain}", "${customerName} about us site:${companyDomain}", "${customerName} annual report directors". Find REAL verified leaders. **STRICTLY ONLY these roles**: Founder, Co-founder, CEO, CTO, CIO, CFO. **DO NOT include ANY other role** — no COO, no VP, no Head, no Director, no Manager. If fewer exist, return fewer. **VALIDATION**: Only include people found on official company domain, annual reports, press releases, or regulatory filings. For each: name, title, location, background (past companies, years exp), interestAreas, pitchStrategy. DO NOT HALLUCINATE.`);
    schemaProps.decisionMakers = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          title: { type: Type.STRING },
          location: { type: Type.STRING },
          background: { type: Type.STRING },
          interestAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
          pitchStrategy: { type: Type.STRING }
        }
      }
    };
  }

  if (missing.needsRevenue) {
    gapList.push(`- **Revenue Data**: Search for "${customerName} annual revenue 2026", "${customerName} financial results 2026", "${customerName} annual report 2026". Find real reported revenue for ONLY 2026. Express in INR Crores. DO NOT estimate. If 2026 data is not found, return empty array. Include CAC estimate.`);
    schemaProps.revenueData = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          year: { type: Type.STRING },
          amount: { type: Type.STRING },
          cac: { type: Type.STRING },
          trend: { type: Type.STRING, enum: ["up", "down", "flat"] }
        }
      }
    };
  }

  if (missing.needsEmployeeCount) {
    gapList.push(`- **Employee Count**: Search for "${customerName} number of employees", "${customerName} headcount", check LinkedIn company page or Glassdoor. Provide approximate number.`);
    schemaProps.numberOfEmployees = { type: Type.NUMBER };
  }

  if (missing.needsCompanyContacts) {
    gapList.push(`- **Official Company Contact Details**: Search official contact, investor relations, corporate information, legal notice, and annual report pages for "${customerName}" on ${companyDomain}. Return "companyContactDetails" with:
      - "officialContactPageUrl"
      - "addresses": [{ label, value, sourceUrl }]
      - "phoneNumbers": [{ label, value, sourceUrl }]
      - "emails": [{ label, value, sourceUrl }]
      RULES:
      1. ONLY official company sources or official statutory filings for the same company
      2. Preserve published formatting for phone numbers and addresses
      3. Include department labels exactly when shown, such as "General / Sales", "Support", "HR / Jobs", "Compliance", "Investor queries", "Registered / Head Office"
      4. Include a sourceUrl for each item whenever possible
      5. No Justdial, RocketReach, Apollo, or other third-party directories`);
    schemaProps.companyContactDetails = {
      type: Type.OBJECT,
      properties: {
        officialContactPageUrl: { type: Type.STRING },
        addresses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING },
              sourceUrl: { type: Type.STRING }
            }
          }
        },
        phoneNumbers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING },
              sourceUrl: { type: Type.STRING }
            }
          }
        },
        emails: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING },
              sourceUrl: { type: Type.STRING }
            }
          }
        }
      }
    };
  }

  if (missing.needsCloudEvidence) {
    gapList.push(`- **Cloud Provider & Evidence**: Search for "${customerName} AWS", "${customerName} Azure", "${customerName} cloud", job postings, engineering blogs, StackShare. Identify primary cloud provider and provide evidence string.`);
    schemaProps.currentCloud = { type: Type.STRING };
    schemaProps.cloudEvidence = { type: Type.STRING };
  }

  if (missing.needsPotential) {
    gapList.push(`- **${workspace.companyName} Sales Opportunity Score**: Score 0-100 for cloudMigration, genAi, modernization, partnerProducts (configured catalog: ${workspace.partnerProducts.map(product => product.split(":")[0]).join(", ")}), and overall. Add a 1-sentence summary of the strongest opportunity.`);
    schemaProps.salesPotential = {
      type: Type.OBJECT,
      properties: {
        cloudMigration: { type: Type.NUMBER },
        genAi: { type: Type.NUMBER },
        modernization: { type: Type.NUMBER },
        partnerProducts: { type: Type.NUMBER },
        overall: { type: Type.NUMBER },
        summary: { type: Type.STRING }
      }
    };
  }

  const prompt = `
You are a verification agent. The initial research for "${customerName}" (domain: ${companyDomain}) returned INCOMPLETE data.

What we already know:
- Industry: ${profile.industry}
- Segment: ${profile.segment}
- Current Cloud: ${profile.currentCloud}
- Decision Makers found: ${profile.decisionMakers?.length || 0}
- Revenue years found: ${profile.revenueData?.length || 0}
- Employee count: ${profile.numberOfEmployees ?? "MISSING"}
- Company email: ${profile.companyEmail ?? "MISSING"}
- Company phone: ${profile.companyPhone ?? "MISSING"}

**YOUR TASK**: Use Google Search to find ONLY the missing data below. Do NOT repeat data we already have.

MISSING DATA TO FIND:
${gapList.join("\n")}

**RULES**:
- Use Google Search grounding to find real, verifiable data.
- DO NOT HALLUCINATE. Only return data you can verify.
- ALL output text MUST be in English only. Do not use any other language.
- Return strict JSON matching the schema.
`;

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        maxOutputTokens: 65536,
        responseSchema: {
          type: Type.OBJECT,
          properties: schemaProps
        }
      }
    });

    const text = response.text;
    if (!text) return profile;

    const parsed = JSON.parse(cleanJsonString(text));

    // Merge only missing fields back into profile
    const merged = { ...profile };

    if (missing.needsDecisionMakers && parsed.decisionMakers?.length > 0) {
      merged.decisionMakers = parsed.decisionMakers.map((dm: any) => ({
        name: dm.name,
        title: dm.title,
        location: dm.location,
        background: dm.background,
        interestAreas: dm.interestAreas || [],
        pitchStrategy: dm.pitchStrategy,
        sourceUrls: []
      }));
    }

    if (missing.needsRevenue && parsed.revenueData?.length > 0) {
      merged.revenueData = parsed.revenueData;
    }

    if (missing.needsEmployeeCount && typeof parsed.numberOfEmployees === "number" && parsed.numberOfEmployees > 0) {
      merged.numberOfEmployees = parsed.numberOfEmployees;
    }

    if (missing.needsCompanyContacts) {
      const companyContactDetails = sanitizeCompanyContactDetails(parsed.companyContactDetails);
      if (companyContactDetails) {
        merged.companyContactDetails = companyContactDetails;
        merged.companyEmail = pickPrimaryCompanyEmail(companyContactDetails, merged.companyEmail);
        merged.companyPhone = pickPrimaryCompanyPhone(companyContactDetails, merged.companyPhone);
      }
    }

    if (missing.needsCloudEvidence) {
      if (parsed.currentCloud) merged.currentCloud = parsed.currentCloud;
      if (parsed.cloudEvidence) merged.cloudEvidence = parsed.cloudEvidence;
    }

    if (missing.needsPotential && (parsed.salesPotential || parsed.workmatesPotential)) {
      const potential = parsed.salesPotential || parsed.workmatesPotential;
      merged.salesPotential = {
        ...potential,
        partnerProducts: potential.partnerProducts ?? potential.zoho
      };
    }

    // Collect any new source URLs
    const groundingChunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) merged.sourceUrls.push(chunk.web.uri);
      });
    }
    merged.sourceUrls = Array.from(new Set([
      ...merged.sourceUrls,
      ...extractCompanyContactSourceUrls(merged.companyContactDetails)
    ])).slice(0, 15);

    return merged;
  } catch (error) {
    console.error("Verification agent error (non-fatal, returning original):", error);
    return profile;
  }
};
