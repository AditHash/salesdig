import { IAnalysisReport } from "../../models/analysisReport.model.js";

export const buildDigest = (report: IAnalysisReport): string => {
  const vp = report.validatedProfile as any;
  const company = vp?.verifiedCompany ?? {};
  const s = report.strategy as any;
  const recs = report.recommendations as any[];

  const directors: any[] = vp?.verifiedDirectors ?? [];
  const techStack: any[] = company?.techStack ?? [];
  const genAiOps: any[] = s?.genAiOpportunities ?? [];
  const roadmap: any[] = s?.roadmap ?? [];
  const resolutions: any[] = s?.resolutions ?? [];
  const revenueData: any[] = company?.revenueData ?? [];
  const competitorAnalysis: any[] = company?.competitorAnalysis ?? [];
  const painPoints: string[] = company?.painPoints ?? [];
  const knownIssues: string[] = company?.knownIssues ?? [];
  const wp = company?.salesPotential ?? company?.workmatesPotential;
  const partnerProductRecs: any[] = (report.partnerProductRecommendations as any[]) ?? (report.zohoRecommendations as any[]) ?? [];

  // overallConfidence stored as 0–1, display as percentage
  const confidence = report.overallConfidence <= 1
    ? Math.round(report.overallConfidence * 100)
    : Math.round(report.overallConfidence);

  const lines: string[] = [
    // ── Company Overview ──────────────────────────────────────────
    `Company: ${report.customerName}`,
    `Official Name: ${company?.companyName ?? "N/A"}`,
    `Domain: ${report.companyDomain}`,
    `Website: ${company?.websiteUrl ?? "N/A"}`,
    `Industry: ${company?.industry ?? "N/A"}`,
    `Segment: ${company?.segment ?? "N/A"}`,
    `Employees: ${company?.numberOfEmployees ?? "N/A"}`,
    `Description: ${company?.description ?? "N/A"}`,

    // ── Financial Health ──────────────────────────────────────────
    `Revenue: ${revenueData.map((r: any) => `${r.year}: ${r.amount}${r.trend ? ` (${r.trend})` : ""}`).join(", ") || "N/A"}`,
    `Overall Analysis Confidence: ${confidence}%`,

    // ── Cloud & Tech ──────────────────────────────────────────────
    `Current Cloud Provider: ${company?.currentCloud ?? "N/A"}`,
    `Cloud Evidence: ${company?.cloudEvidence ?? "N/A"}`,
    `Is AWS Customer: ${company?.isAwsCustomer ?? "N/A"}`,
    `Tech Stack: ${techStack.map((t: any) => `${t.category}: ${t.details}`).join("; ") || "N/A"}`,

    // ── Contact ───────────────────────────────────────────────────
    `Company Email: ${company?.companyEmail ?? "N/A"}`,
    `Company Phone: ${company?.companyPhone ?? "N/A"}`,
    `Email Domain: ${company?.domainIntel?.emailDomain ?? "N/A"}`,
    `Mail Provider: ${company?.domainIntel?.emailProvider ?? "N/A"}`,
    `Has Active MX Records: ${company?.domainIntel?.hasMx ?? "N/A"}`,
    `Office Addresses: ${(company?.companyContactDetails?.addresses ?? []).map((a: any) => `${a.label}: ${a.value}`).join("; ") || "N/A"}`,
    `Contact Phone Numbers: ${(company?.companyContactDetails?.phoneNumbers ?? []).map((p: any) => `${p.label}: ${p.value}`).join("; ") || "N/A"}`,
    `Contact Emails: ${(company?.companyContactDetails?.emails ?? []).map((e: any) => `${e.label}: ${e.value}`).join("; ") || "N/A"}`,

    // ── Pain Points & Known Issues ────────────────────────────────
    `Pain Points: ${painPoints.join("; ") || "N/A"}`,
    `Known Issues: ${knownIssues.join("; ") || "N/A"}`,

    // ── Decision Makers ───────────────────────────────────────────
    `Decision Makers (${directors.length}): ${directors.map((d: any) =>
      `${d.name} (${d.title})${d.location ? ` — ${d.location}` : ""}${d.background ? ` — ${d.background}` : ""}${d.interestAreas?.length ? ` — Interests: ${d.interestAreas.join(", ")}` : ""}${d.pitchStrategy ? ` — Pitch: ${d.pitchStrategy}` : ""}`
    ).join(" | ") || "N/A"}`,

    // ── Workmates Potential ───────────────────────────────────────
    `Workmates Potential — Cloud Migration: ${wp?.cloudMigration ?? "N/A"}/100, GenAI: ${wp?.genAi ?? "N/A"}/100, Modernization: ${wp?.modernization ?? "N/A"}/100, Zoho Adoption: ${wp?.zoho ?? "N/A"}/100, Overall: ${wp?.overall ?? "N/A"}/100`,
    `Workmates Potential Summary: ${wp?.summary ?? "N/A"}`,

    // ── Competitive Gaps ──────────────────────────────────────────
    `Competitive Gaps: ${competitorAnalysis.map((c: any) =>
      `vs ${c.competitorName}: Domain Advantages — ${(c.domainAdvantages ?? []).map((d: any) => `${d.domain}: ${d.advantage}`).join(", ") || "N/A"}; Gap — ${c.customerGap}; Fix — ${c.proposedInnovation}; Service — ${c.workmatesService}; Value — ${c.valueProposition}`
    ).join(" || ") || "N/A"}`,

    // ── GenAI Opportunities ───────────────────────────────────────
    `GenAI Opportunities: ${genAiOps.map((o: any) =>
      `${o.title} [${o.category}]: ${o.description} — Example: ${o.example} — Value: ${o.businessValue}`
    ).join(" | ") || "N/A"}`,

    // ── Strategic Resolutions ─────────────────────────────────────
    `Strategic Resolutions: ${resolutions.map((r: any) =>
      `${r.painPoint} → ${r.workmatesService}: ${r.solutionStrategy} — Impact: ${r.businessImpact}`
    ).join(" | ") || "N/A"}`,

    // ── Roadmap ───────────────────────────────────────────────────
    `Roadmap: ${roadmap.map((r: any) =>
      `${r.phaseName} (${r.duration}) — Focus: ${r.focusArea} — Activities: ${(r.activities ?? []).join(", ")} — Outcome: ${r.outcome}`
    ).join(" | ") || "N/A"}`,

    // ── Funding Recommendations ───────────────────────────────────
    `Funding Recommendations: ${recs.map((r: any) =>
      `${r.programName} (fit: ${r.fitScore}/100) — ${r.reason} — Customer Value: ${r.customerValue} — Partner Value: ${r.partnerValue}`
    ).join(" | ") || "N/A"}`,

    // ── Partner Product Recommendations ───────────────────────────
    `Partner Product Recommendations: ${partnerProductRecs.map((z: any) =>
      `${z.productName} [${z.category}] (fit: ${z.fitScore}/100) — ${z.reason} — Use Case: ${z.useCase}${z.mappedNeed ? ` — Addresses: ${z.mappedNeed}` : ""} — Customer Value: ${z.customerValue}`
    ).join(" | ") || "N/A"}`
  ];

  return lines.join("\n");
};
