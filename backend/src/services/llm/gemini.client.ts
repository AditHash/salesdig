import { GoogleGenAI, Type } from "@google/genai";
import { AWS_FUNDING_PROGRAMS, GENAI_USE_CASES_LIBRARY } from "../../config/domainKnowledge.js";
import { CompanyIntelData, FundingRecommendation, StrategyData, PartnerProductRecommendation } from "../../types/agent.types.js";
import { DEFAULT_WORKSPACE_SETTINGS, WorkspaceSettings } from "../../config/workspaceDefaults.js";
import {
  extractCompanyContactSourceUrls,
  pickPrimaryCompanyEmail,
  pickPrimaryCompanyPhone,
  sanitizeCompanyContactDetails
} from "../../utils/companyContactDetails.js";

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRetryable = err?.status === 503 || err?.message?.includes("timeout") || err?.message?.includes("UNAVAILABLE");
      if (!isRetryable || i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs * 2 ** i));
    }
  }
  throw new Error("Max retries exceeded");
};

const getClient = (): GoogleGenAI => {
  const apiKey =process.env.GEMINI_API_KEY;
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

/**
 * Step 1: Research the customer using Google Search Grounding.
 */
export const researchCustomer = async (
  customerName: string,
  companyDomain: string,
  workspace: WorkspaceSettings = DEFAULT_WORKSPACE_SETTINGS
): Promise<CompanyIntelData & { sourceUrls: string[] }> => {
  const ai = getClient();
  const modelId = "gemini-3-flash-preview";

  const prompt = `
    Research the company "${customerName}" (official website/domain: ${companyDomain}).
    
    **IMPORTANT**: Use the domain "${companyDomain}" to anchor ALL your searches. 
    Search for "${customerName} site:${companyDomain}", "${customerName} ${companyDomain}" to ensure you are researching the CORRECT entity.
    
    I need a deep technical, financial, and strategic profile for a cloud sales analysis. 
    
    CRITICAL INSTRUCTIONS:
    1. **General Info**: Exact Industry (e.g., EdTech, Fintech, E-commerce) and Segment (Startup/SMB/Enterprise).
       - **Number of Employees**: Search for "${customerName} number of employees" or "${customerName} headcount" or check LinkedIn company page, Glassdoor, or annual reports. Provide approximate headcount. This is MANDATORY.
    2. **Financials**: 
       - Search for "${customerName} annual revenue 2026", "${customerName} financial results 2026", "${customerName} annual report 2026".
       - Find the reported revenue for **ONLY the year 2026**. Do NOT include any other year.
       - **IMPORTANT**: Convert and express the revenue figure in **INR Crores** (e.g., "120 Cr", "1500 Cr"). If only USD is available, convert it to INR (approx 1 USD = 85 INR) and format as "Cr".
       - Find or estimate the **Customer Acquisition Cost (CAC)** for 2026. If exact data is missing, provide an industry-standard estimate for their segment (e.g., "$150", "₹12,000").
       - **DO NOT MAKE UP NUMBERS**. If real 2026 revenue data is not found, return an empty array.
    3. **Cloud Infrastructure Deep Dive**: 
       - Identify if they are primarily on AWS, Azure, GCP, or On-Premise.
       - **SEARCH DEEPLY for EVIDENCE**: Look for job postings (e.g. "Hiring AWS Solutions Architect"), engineering blogs (e.g. "How we scaled on Azure"), tech stack sites (StackShare), or case studies.
       - **OUTPUT**: Provide the Provider Name AND the Evidence string (e.g. "Primary: AWS. Evidence: 15 open roles for AWS Engineers on LinkedIn").
    4. Key Decision Makers (STRICT – ZERO HALLUCINATION):

CRITICAL RULES:
- ONLY include people if you can VERIFY they CURRENTLY work at "${customerName}"
- Verification MUST come from:
  1. Official company website
  2. LinkedIn (current role must show company)
  3. Press release or trusted article

- If verification is missing → EXCLUDE the person
- DO NOT guess, infer, or approximate

ROLE FILTER (STRICT):
- ONLY include:
  Founder, Co-founder, CEO, CTO, CIO, CFO
- DO NOT include ANY other role under ANY condition

SEARCH STRATEGY:
- "${customerName} leadership team site:${companyDomain}"
- "${customerName} CEO CTO CFO CIO site:linkedin.com"
- "${customerName} founders"
- "${customerName} press release leadership"

VALIDATION RULE:
For EACH person:
- Confirm: Name + Role + Company match EXACTLY "${customerName}"
- If mismatch → DISCARD

OUTPUT RULES:
- Return ONLY 5–8 people MAX
- If fewer valid → return fewer (NO FILLING)
- ALL text fields (background, pitchStrategy, interestAreas, location) MUST be in English only

FOR EACH PERSON PROVIDE:

- Name
- Role (ONLY allowed roles)
- Location (if available)

- Background:
  - Previous companies (ONLY if verifiable)
  - Years of experience (approx allowed ONLY if logical)

- Key Interests:
  - Based on role + background (NO generic fluff)

- Engagement Strategy:
  - Highly personalized pitch aligned to:
    - their role
    - their past experience
    - their likely KPIs

- sourceType: ("official_site" | "linkedin" | "press_release")

FINAL SAFETY CHECK:
- Every name MUST be traceable to "${customerName}"
- If even 1 doubtful → REMOVE it
    4b. **Official Company Contact Details (SEPARATE from Decision Makers)**:
       Search official contact, investor relations, corporate information, annual report, and legal notice pages tied to "${companyDomain}".
       Return a structured "companyContactDetails" object with:
       - "officialContactPageUrl"
       - "addresses": array of { label, value, sourceUrl }
       - "phoneNumbers": array of { label, value, sourceUrl }
       - "emails": array of { label, value, sourceUrl }
       RULES:
       1. ONLY use official company sources (${companyDomain}) or official statutory filings for the same company
       2. NO third-party directories, aggregators, Justdial, RocketReach, Apollo, or random blogs
       3. Preserve the exact published formatting for phone numbers and addresses
       4. Include the original department labels when published, e.g. "General / Sales", "Support", "HR / Jobs", "Compliance", "Investor queries", "Registered / Head Office"
       5. Include a direct sourceUrl for each item whenever possible
       6. If "companyEmail" and "companyPhone" are returned, they MUST be the best primary official email/phone selected from "companyContactDetails"
       7. Do not invent missing contacts; use empty arrays when not found
    5. **Detailed Tech Stack**: Be specific (e.g., "React, Python, Postgres, Kubernetes"). **MANDATORY**: Always include a "Cloud Infrastructure" entry in techStack with comma-separated cloud services/products (e.g., "AWS EC2, S3, Lambda, RDS" or "GCP GKE, Cloud Build, BigQuery"). Keep details short — only product/service names, no sentences.
    6. **Competitor & Gap Analysis**: 
       - Identify **2** key competitors.
       - For EACH competitor provide:
         - **domainAdvantages**: An array of domain-wise advantages the competitor has over "${customerName}". Cover multiple domains such as:
           * GenAI / AI-ML (e.g., "Uses AI-powered recommendations, chatbots")
           * Cloud Infrastructure (e.g., "Multi-region deployment, edge computing")
           * Data & Analytics (e.g., "Real-time dashboards, data lake")
           * E-Commerce / Digital Experience (e.g., "Faster checkout, personalization")
           * Supply Chain / Operations (e.g., "Automated logistics, demand forecasting")
           * Security / Compliance (e.g., "SOC2 certified, zero-trust architecture")
           * Modernization (e.g., "Microservices, serverless, containerized")
           For each domain, specify: domain name and the specific advantage the competitor has that "${customerName}" is NOT doing.
         - **customerGap**: The specific weakness in "${customerName}" that this competitor exploits — detailed explanation.
         - **proposedInnovation**: Concrete innovation "${customerName}" can implement to close this gap — detailed explanation.
         - **Service Mapping**: Select the BEST matching service from this list: ${JSON.stringify(workspace.salesServices)}
         - **valueProposition**: Measurable business outcome (e.g., % increase in conversion, % reduction in cost).
    7. **Sales Opportunity Score**: Score this company as a potential customer for ${workspace.companyName} (0-100) across:
       - **cloudMigration**: Readiness/need to migrate to cloud.
       - **genAi**: Opportunity to adopt GenAI solutions.
       - **modernization**: Legacy system modernization need.
       - **partnerProducts**: Potential fit for the configured partner products based on their operations, size, and pain points.
       - Configured product catalog: ${JSON.stringify(workspace.partnerProducts.map(product => product.split(":")[0]))}
       - **overall**: Overall score.
       - **summary**: 1-sentence summary explaining the biggest opportunity.
    
    **JSON FORMATTING RULES (STRICT)**:
    - Output MUST be valid JSON.
    - ALL text values MUST be in English only. Do not use any other language under any circumstances.
    - **Verify all arrays have commas between elements.**
    - **Escape all double quotes inside strings (e.g. use \\" instead of ").**
    - Do not use trailing commas.
    - Do not include comments (// or /* ... */).
    - Do not output markdown code blocks.
    
    Return the result in JSON format matching the schema.
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            industry: { type: Type.STRING },
            segment: { type: Type.STRING, enum: ["Startup", "SMB", "Enterprise", "Unknown"] },
            numberOfEmployees: { type: Type.NUMBER, description: "Approximate employee headcount" },
            currentCloud: { type: Type.STRING },
            cloudEvidence: { type: Type.STRING, description: "Concise summary (max 500 chars) of specific evidence found for cloud usage" },
            isAwsCustomer: { type: Type.BOOLEAN },
            description: { type: Type.STRING },
            websiteUrl: { type: Type.STRING },
            companyEmail: { type: Type.STRING, description: "Verified corporate contact email from official filings or contact page" },
            companyPhone: { type: Type.STRING, description: "Verified HQ switchboard or registered office phone number" },
            companyContactDetails: {
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
            },
            painPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "General business challenges" },
            knownIssues: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific negative news, outages, or technical debt" },
            competitorAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  competitorName: { type: Type.STRING },
                  domainAdvantages: {
                    type: Type.ARRAY,
                    description: "Domain-wise advantages competitor has over the searched company",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        domain: { type: Type.STRING, description: "e.g. GenAI, Cloud Infrastructure, Data & Analytics, Security" },
                        advantage: { type: Type.STRING, description: "What the competitor does in this domain that the searched company does not" }
                      }
                    }
                  },
                  customerGap: { type: Type.STRING, description: "Why the customer is losing" },
                  proposedInnovation: { type: Type.STRING, description: "The specific fix" },
                  workmatesService: { type: Type.STRING, description: "Must be one of the Workmates Services provided in prompt" },
                  valueProposition: { type: Type.STRING, description: "The business value statement" }
                }
              }
            },
            revenueData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  year: { type: Type.STRING },
                  amount: { type: Type.STRING, description: "Real reported revenue in INR Crores. Do NOT estimate." },
                  cac: { type: Type.STRING, description: "Customer Acquisition Cost estimate" },
                  trend: { type: Type.STRING, enum: ["up", "down", "flat"] }
                }
              }
            },
            decisionMakers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  title: { type: Type.STRING },
                  location: { type: Type.STRING },
                  background: { type: Type.STRING, description: "Professional history: 'Ex-Company, Years Exp, Key Skills'." },
                  interestAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
                  pitchStrategy: { type: Type.STRING, description: "Specific angle to pitch this person based on their profile." }
                }
              }
            },
            techStack: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  details: { type: Type.STRING }
                }
              }
            },
            salesPotential: {
              type: Type.OBJECT,
              properties: {
                cloudMigration: { type: Type.NUMBER, description: "Score 0-100" },
                genAi: { type: Type.NUMBER, description: "Score 0-100" },
                modernization: { type: Type.NUMBER, description: "Score 0-100" },
                partnerProducts: { type: Type.NUMBER, description: "Configured partner product fit, Score 0-100" },
                overall: { type: Type.NUMBER, description: "Score 0-100" },
                summary: { type: Type.STRING, description: "1-sentence summary of biggest opportunity" }
              }
            }
          },
          required: ["name", "industry", "segment", "isAwsCustomer", "description", "competitorAnalysis", "decisionMakers"]
        }
      }
    }));

    const text = response.text;
    if (!text) throw new Error("No text content in response from AI");

    const cleanText = cleanJsonString(text);
    const parsed = JSON.parse(cleanText);
    const companyContactDetails = sanitizeCompanyContactDetails(parsed.companyContactDetails);

    const groundingChunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sourceUrls: string[] = [];
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) sourceUrls.push(chunk.web.uri);
      });
    }

    const profile: CompanyIntelData & { sourceUrls: string[] } = {
      companyName: parsed.name || customerName,
      websiteUrl: parsed.websiteUrl,
      companyDomain,
      companyEmail: pickPrimaryCompanyEmail(companyContactDetails, parsed.companyEmail),
      companyPhone: pickPrimaryCompanyPhone(companyContactDetails, parsed.companyPhone),
      companyContactDetails,
      industry: parsed.industry || "Unknown",
      segment: parsed.segment || "Unknown",
      numberOfEmployees: typeof parsed.numberOfEmployees === "number" ? parsed.numberOfEmployees : null,
      currentCloud: parsed.currentCloud || "Unknown",
      cloudEvidence: parsed.cloudEvidence,
      isAwsCustomer: !!parsed.isAwsCustomer,
      description: parsed.description || "",
      techStack: parsed.techStack || [],
      painPoints: parsed.painPoints || [],
      knownIssues: parsed.knownIssues || [],
      competitorAnalysis: parsed.competitorAnalysis || [],
      revenueData: parsed.revenueData || [],
      salesPotential: parsed.salesPotential ?? parsed.workmatesPotential ?? undefined,
      decisionMakers: (parsed.decisionMakers || []).map((dm: any) => ({
        name: dm.name,
        title: dm.title,
        location: dm.location,
        background: dm.background,
        interestAreas: dm.interestAreas || [],
        pitchStrategy: dm.pitchStrategy,
        sourceUrls: []
      })),
      sourceUrls: Array.from(new Set([...sourceUrls, ...extractCompanyContactSourceUrls(companyContactDetails)])).slice(0, 15)
    };

    return profile;
  } catch (error) {
    console.error("Error researching customer:", error);
    return {
      companyName: customerName,
      companyDomain,
      industry: "Unknown",
      segment: "Unknown",
      currentCloud: "Unknown",
      companyEmail: undefined,
      companyPhone: undefined,
      companyContactDetails: undefined,
      techStack: [],
      decisionMakers: [],
      painPoints: [],
      knownIssues: [],
      competitorAnalysis: [],
      revenueData: [],
      description: "Could not retrieve public information due to a processing error. Please try again.",
      isAwsCustomer: false,
      sourceUrls: []
    };
  }
};

/**
 * Step 2: Generate Strategic Analysis & Funding Recommendations.
 */
export const generateRecommendations = async (
  profile: CompanyIntelData,
  annualSpend: number,
  workspace: WorkspaceSettings = DEFAULT_WORKSPACE_SETTINGS
): Promise<{ funding: FundingRecommendation[]; strategy: StrategyData }> => {
  const ai = getClient();
  const modelId = "gemini-3-flash-preview";
  const awsFundingEnabled = workspace.enabledRecommendations.awsFunding && workspace.primaryCloudProvider === "AWS";
  const fundingInstructions = awsFundingEnabled
    ? `4. Funding Selection & Calculation:
       - Review the AWS funding programs and eligibility rules listed above.
       - Recommend only programs that match customer eligibility and spend.
       - Explain why each recommendation fits, and estimate benefits from annual spend ($${annualSpend}).`
    : `4. Funding Recommendations:
       - Funding recommendations are disabled for this workspace's cloud focus.
       - Return an empty funding array. Do not invent or recommend AWS programs.`;

  const slimProfile = {
    name: profile.companyName,
    industry: profile.industry,
    segment: profile.segment,
    painPoints: profile.painPoints,
    knownIssues: profile.knownIssues,
    currentCloud: profile.currentCloud,
    cloudEvidence: profile.cloudEvidence
  };

  const prompt = `
    You are a ${workspace.primaryCloudProvider} sales solution architect supporting ${workspace.companyName}. ${workspace.companyDescription}
    
    Analyze the customer profile and spend ($${annualSpend}) to provide a comprehensive sales strategy.
    
    Customer Profile:
    ${JSON.stringify(slimProfile)}

    **${workspace.companyName} Service Catalog**:
    ${JSON.stringify(workspace.salesServices)}

    **Available ${workspace.primaryCloudProvider} Funding Programs & Eligibility Rules**:
    ${JSON.stringify(awsFundingEnabled ? AWS_FUNDING_PROGRAMS : [])}
    
    INSTRUCTIONS:
    
    1. **${workspace.companyName} Resolutions**: 
       For each 'knownIssue' or 'painPoint', propose a detailed resolution.
       - **workmatesService**: Select the MOST relevant service from the ${workspace.companyName} catalog provided above.
       - **solutionStrategy**: A detailed sentence on how this service fixes the issue.
       - **businessImpact**: The direct business value.
    
    2. **Strategic Roadmap (3 Phases)**:
       Create a 3-Phase Cloud Adoption Plan for this specific customer.
       - Phase 1: Mobilize & Assess.
       - Phase 2: Migrate to or modernize ${workspace.primaryCloudProvider} environments.
       - Phase 3: Innovate & Scale.

    3. **Industry-Specific Innovation (AI/ML/Data) - 5 to 7 ITEMS**: 
       - Create **5-7** distinct use cases specifically for the **${profile.industry}** industry.
    
    ${fundingInstructions}
       
    5. **Sales Email**: Draft a cold email targeting the decision maker.
       - MANDATORY: Every single funding program entry MUST have a non-empty emailSubject and emailBody. Write a real personalized cold email — never leave blank.
       - MANDATORY: Every single funding program entry MUST have a non-empty customerValue and partnerValue. Describe the concrete benefit — never leave blank or use "N/A". 
       - **MANDATORY**: Every funding program MUST have a non-empty emailSubject and emailBody. Write a real, personalized cold email for each program — never leave these blank or use placeholder text.
       - **MANDATORY**: Every funding program MUST have a non-empty customerValue and partnerValue. Describe the concrete benefit — never leave these blank.
    
    **JSON FORMATTING RULES**:
    - Output MUST be valid JSON.
    - ALL text values MUST be in English only. Do not use any other language.
    - Escape all double quotes inside strings.
    - Do not use trailing commas.
    - Do not include comments.

    Return a JSON object with 'funding' and 'strategy'.
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategy: {
              type: Type.OBJECT,
              properties: {
                resolutions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      painPoint: { type: Type.STRING },
                      workmatesService: { type: Type.STRING },
                      solutionStrategy: { type: Type.STRING },
                      businessImpact: { type: Type.STRING }
                    }
                  }
                },
                roadmap: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      phaseName: { type: Type.STRING },
                      duration: { type: Type.STRING },
                      focusArea: { type: Type.STRING },
                      activities: { type: Type.ARRAY, items: { type: Type.STRING } },
                      outcome: { type: Type.STRING }
                    }
                  }
                },
                genAiOpportunities: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      example: { type: Type.STRING },
                      businessValue: { type: Type.STRING }
                    }
                  }
                }
              }
            },
            funding: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  programId: { type: Type.STRING },
                  programName: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  fitScore: { type: Type.NUMBER },
                  customerValue: { type: Type.STRING },
                  partnerValue: { type: Type.STRING },
                  emailSubject: { type: Type.STRING },
                  emailBody: { type: Type.STRING }
                }
              }
            }
          },
          required: ["strategy", "funding"]
        }
      }
    }));

    const text = response.text;
    if (!text) throw new Error("Empty response");

    const cleanText = cleanJsonString(text);
    const data = JSON.parse(cleanText);

    return {
      funding: awsFundingEnabled ? data.funding || [] : [],
      strategy: data.strategy || { resolutions: [], genAiOpportunities: [], roadmap: [] }
    };
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return {
      funding: [],
      strategy: { resolutions: [], genAiOpportunities: [], roadmap: [] }
    };
  }
};

/**
 * Zoho product mapping — a SEPARATE, self-contained call (does not touch the
 * research or generateRecommendations calls). No Google Search: it selects
 * products by reasoning over the injected Zoho catalog + the company profile.
 */
export const generatePartnerProductRecommendations = async (
  profile: CompanyIntelData,
  workspace: WorkspaceSettings
): Promise<PartnerProductRecommendation[]> => {
  const ai = getClient();
  const modelId = "gemini-3-flash-preview";

  const slimProfile = {
    name: profile.companyName,
    industry: profile.industry,
    segment: profile.segment,
    description: profile.description,
    painPoints: profile.painPoints,
    knownIssues: profile.knownIssues,
    currentCloud: profile.currentCloud,
    techStack: (profile.techStack || []).map((t) => `${t.category}: ${t.details}`)
  };

  const prompt = `
    You are a partner product consultant for ${workspace.companyName}. Given a company profile and
    the configured catalog below, select products that BEST fit this specific company.

    Company Profile:
    ${JSON.stringify(slimProfile)}

    Configured Product Catalog (each line names a product and its business use):
    ${JSON.stringify(workspace.partnerProducts)}

    INSTRUCTIONS:
    1. Recommend between 1 and 8 catalog products that map to this company's actual pain points,
       known issues, industry, segment, and tech stack. Quality over quantity.
    2. For EACH recommended product provide:
       - productName: EXACT product name from the catalog above (do not invent products). If an entry is "NAME: DESCRIPTION", return only NAME.
       - category: a practical category for the product (e.g. Sales, Finance, HR, Service).
       - reason: WHY it fits THIS company — reference the specific pain point / need it addresses.
       - fitScore: integer 0-100 indicating how strongly it fits (be honest, spread the scores).
       - useCase: a concrete sentence on how this company would use the product day-to-day.
       - mappedNeed: the specific company pain point, known issue, or need this product resolves.
       - customerValue: the tangible business outcome (e.g. faster collections, higher conversion).
    3. Prefer products that solve stated pain points; use industry/segment fit only as a secondary signal.
    4. Do NOT recommend more than one near-duplicate for the same need unless clearly justified.

    JSON FORMATTING RULES:
    - Output MUST be valid JSON. All text in English only.
    - Escape double quotes inside strings. No trailing commas. No comments. No markdown.

    Return a JSON object with a single key "partnerProductRecommendations" (an array).
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            partnerProductRecommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING },
                  category: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  fitScore: { type: Type.NUMBER },
                  useCase: { type: Type.STRING },
                  mappedNeed: { type: Type.STRING },
                  customerValue: { type: Type.STRING }
                },
                required: ["productName", "category", "reason", "fitScore", "useCase", "customerValue"]
              }
            }
          },
          required: ["partnerProductRecommendations"]
        }
      }
    }));

    const text = response.text;
    if (!text) throw new Error("Empty response");

    const cleanText = cleanJsonString(text);
    const data = JSON.parse(cleanText);
    const recs: PartnerProductRecommendation[] = Array.isArray(data.partnerProductRecommendations) ? data.partnerProductRecommendations : [];

    return recs
      .filter((r) => r && typeof r.productName === "string" && r.productName.trim().length > 0)
      .map((r) => ({
        productName: r.productName,
        category: r.category || "General",
        reason: r.reason || "",
        fitScore: Math.max(0, Math.min(100, Math.round(Number(r.fitScore) || 0))),
        useCase: r.useCase || "",
        mappedNeed: r.mappedNeed,
        customerValue: r.customerValue || ""
      }));
  } catch (error) {
    console.error("Error generating partner product recommendations:", error);
    return [];
  }
};
