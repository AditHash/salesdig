import AnalysisReport from "../../models/analysisReport.model.js";
import AnalysisRun from "../../models/analysisRun.model.js";
import { RunAnalysisInput } from "../../types/agent.types.js";
import { researchCustomer, generateRecommendations, generatePartnerProductRecommendations } from "../llm/gemini.client.js";
import { verifyAndFillGaps } from "./verify.agent.js";
import { getDomainIntel, DomainIntel } from "../../utils/domainIntel.js";
import { buildDigest } from "../rag/digest.service.js";
import { embedDocument } from "../llm/embedding.service.js";
import { upsertVector } from "../rag/pgvector.client.js";
import { DEFAULT_WORKSPACE_ID, DEFAULT_WORKSPACE_SETTINGS } from "../../config/workspaceDefaults.js";
import { getWorkspaceSettings } from "../../config/postgres.js";

type EntityCheckStatus = "confirmed" | "possible_mismatch" | "mismatch_blocked";

type RunResult = {
  runId: string;
  reportId: string;
  status: "completed";
  overallConfidence: number;
  entityCheck: {
    requestedName: string;
    requestedDomain: string;
    resolvedName: string;
    resolvedDomain?: string;
    nameSimilarity: number;
    domainMatch: boolean;
    isMatch: boolean;
    status: EntityCheckStatus;
    message: string;
  };
  meta: {
    annualSpendUsed: number;
    annualSpendSource: "provided" | "estimated";
    warnings: string[];
    durationMs: number;
  };
  data: {
    companyProfile: any;
    directors: {
      verified: any[];
      rejected: any[];
    };
    recommendations: any[];
    strategy: any;
    partnerProductRecommendations: any[];
  };
};

const estimateAnnualSpend = (segment: string): number => {
  switch (segment) {
    case "Enterprise": return 250000;
    case "SMB": return 75000;
    case "Startup": return 20000;
    default: return 50000;
  }
};

const normalizeDomain = (value?: string): string | undefined => {
  if (!value) return undefined;
  const raw = value.trim().toLowerCase();
  if (!raw) return undefined;
  try {
    const withScheme = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
    return new URL(withScheme).hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].trim();
  }
};

const COMPANY_STOPWORDS = new Set([
  "limited", "ltd", "inc", "llc", "corp", "corporation", "technologies",
  "technology", "solutions", "services", "group", "company"
]);

const companyTokens = (value: string): string[] =>
  value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
    .split(" ").filter((x) => x.length > 1 && !COMPANY_STOPWORDS.has(x));

const tokenSimilarity = (a: string, b: string): number => {
  const aTokens = new Set(companyTokens(a));
  const bTokens = new Set(companyTokens(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let intersect = 0;
  for (const token of aTokens) if (bTokens.has(token)) intersect++;
  const union = new Set([...aTokens, ...bTokens]).size;
  return union === 0 ? 0 : intersect / union;
};

export const runOrchestratorAgent = async (
  userId: string,
  input: RunAnalysisInput,
  workspaceId = DEFAULT_WORKSPACE_ID,
  existingReportId?: string
): Promise<RunResult> => {
  const startedAt = new Date();
  const workspace = await getWorkspaceSettings(workspaceId) || DEFAULT_WORKSPACE_SETTINGS;

  const runDoc = (await AnalysisRun.create({
    userId,
    workspaceId,
    status: "running",
    input: { customerName: input.customerName, companyDomain: input.companyDomain },
    agentRuns: {},
    startedAt
  } as any)) as any;

  try {
    // Step 0: Domain intelligence (MX lookup — no AI, no cost)
    const domainIntel: DomainIntel = await getDomainIntel(input.companyDomain);

    // Step 1: Research customer
    const rawProfile = await researchCustomer(input.customerName, input.companyDomain, workspace);

    // Step 2: Verify & fill gaps (targeted follow-up for missing data)
    const profile = await verifyAndFillGaps(rawProfile, input.customerName, input.companyDomain, workspace);

    // Step 3: Generate recommendations
    const annualSpend = estimateAnnualSpend(profile.segment);
    const { funding, strategy } = await generateRecommendations(profile, annualSpend, workspace);

    // Step 3b: Zoho product mapping — SEPARATE call, never blocks the report
    let partnerProductRecommendations: any[] = [];
    try {
      if (workspace.enabledRecommendations.partnerProducts && workspace.partnerProducts.length > 0) {
        partnerProductRecommendations = await generatePartnerProductRecommendations(profile, workspace);
      }
    } catch (e) {
      console.error("[zoho] recommendation generation failed", e);
      partnerProductRecommendations = [];
    }

    // Entity resolution
    const resolvedName = profile.companyName || input.customerName;
    const resolvedDomain = normalizeDomain(profile.websiteUrl) || normalizeDomain(profile.companyDomain);
    const requestedDomain = normalizeDomain(input.companyDomain) || input.companyDomain;
    const similarity = tokenSimilarity(input.customerName, resolvedName);
    const domainMatch = !!(requestedDomain && resolvedDomain &&
      (requestedDomain === resolvedDomain || resolvedDomain.endsWith(`.${requestedDomain}`) || requestedDomain.endsWith(`.${resolvedDomain}`)));
    const isMatch = similarity >= 0.45 && domainMatch;

    const entityCheckStatus: EntityCheckStatus = isMatch ? "confirmed" : "possible_mismatch";
    const entityCheckMessage = isMatch
      ? "Resolved company matched requested name and domain."
      : "Possible mismatch detected. Verify company name/domain before using results.";

    // Build verified company profile (matching existing shape)
    const verifiedCompany = {
      companyName: profile.companyName,
      websiteUrl: profile.websiteUrl,
      companyDomain: resolvedDomain,
      companyEmail: profile.companyEmail,
      companyPhone: profile.companyPhone,
      companyContactDetails: profile.companyContactDetails,
      industry: profile.industry,
      segment: profile.segment,
      numberOfEmployees: profile.numberOfEmployees,
      currentCloud: profile.currentCloud,
      cloudEvidence: profile.cloudEvidence,
      isAwsCustomer: profile.isAwsCustomer,
      description: profile.description,
      techStack: profile.techStack,
      painPoints: profile.painPoints,
      knownIssues: profile.knownIssues,
      competitorAnalysis: profile.competitorAnalysis,
      revenueData: profile.revenueData,
      salesPotential: profile.salesPotential,
      sourceUrls: profile.sourceUrls,
      domainIntel
    };

    const directors = profile.decisionMakers || [];
    const overallConfidence = isMatch ? 0.75 : 0.45;
    const warnings: string[] = [];
    if (!isMatch) warnings.push("Possible entity mismatch detected.");
    if (directors.length < 3) warnings.push("Low number of decision makers found.");

    // Save report
    const reportPayload = {
      userId,
      workspaceId,
      runId: runDoc._id,
      customerName: input.customerName,
      companyDomain: input.companyDomain,
      annualSpend,
      validatedProfile: {
        verifiedCompany,
        verifiedDirectors: directors,
        rejectedDirectors: [],
        entityResolution: {
          requestedName: input.customerName,
          requestedDomain: requestedDomain,
          resolvedName,
          resolvedDomain,
          domainMatch,
          similarity,
          isMatch,
          reason: entityCheckMessage
        },
        rejectedFields: [],
        fieldConfidence: [],
        overallConfidence,
        warnings
      },
      recommendations: funding,
      strategy,
      partnerProductRecommendations,
      overallConfidence
    };

    const reportDoc = existingReportId
      ? await AnalysisReport.findByIdAndUpdate(existingReportId, reportPayload, { new: true })
      : await AnalysisReport.create(reportPayload as any);

    if (!reportDoc) throw new Error("Failed to save report document");

    // Fire-and-forget: embed report and upsert to Pinecone
    (async () => {
      try {
        const digest = buildDigest(reportDoc);
        const vector = await embedDocument(digest);
        await upsertVector(String(reportDoc._id), vector, userId, workspaceId);
        await AnalysisReport.findByIdAndUpdate(reportDoc._id, { digestText: digest });
      } catch (e) {
        console.error("[embedding] failed for report", String(reportDoc._id), e);
      }
    })();

    const endedAt = new Date();
    const durationMs = endedAt.getTime() - startedAt.getTime();

    runDoc.status = "completed";
    runDoc.agentRuns = {
      research: { agent: "research-agent", ok: true, durationMs },
      strategy: { agent: "strategy-agent", ok: true, durationMs }
    };
    runDoc.validatedProfile = reportPayload.validatedProfile;
    runDoc.finalRecommendations = {
      annualSpendUsed: annualSpend,
      annualSpendSource: "estimated",
      recommendations: funding,
      strategy,
      warnings
    };
    runDoc.overallConfidence = overallConfidence;
    runDoc.reportId = reportDoc._id;
    runDoc.endedAt = endedAt;
    runDoc.durationMs = durationMs;
    await runDoc.save();

    return {
      runId: String(runDoc._id),
      reportId: String(reportDoc._id),
      status: "completed",
      overallConfidence,
      entityCheck: {
        requestedName: input.customerName,
        requestedDomain: requestedDomain,
        resolvedName,
        resolvedDomain,
        nameSimilarity: similarity,
        domainMatch,
        isMatch,
        status: entityCheckStatus,
        message: entityCheckMessage
      },
      meta: {
        annualSpendUsed: annualSpend,
        annualSpendSource: "estimated",
        warnings,
        durationMs
      },
      data: {
        companyProfile: verifiedCompany,
        directors: {
          verified: directors,
          rejected: []
        },
        recommendations: funding,
        strategy,
        partnerProductRecommendations
      }
    };
  } catch (error) {
    const endedAt = new Date();
    runDoc.status = "failed";
    runDoc.error = error instanceof Error ? error.message : String(error);
    runDoc.endedAt = endedAt;
    runDoc.durationMs = endedAt.getTime() - startedAt.getTime();
    await runDoc.save();
    throw error;
  }
};
