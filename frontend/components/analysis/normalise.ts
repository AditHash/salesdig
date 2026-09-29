import { RunAnalysisResponse, SavedReport, ReportData } from '../../types';

/** Convert live /v2/run response → ReportData */
export const fromRunResponse = (r: RunAnalysisResponse): ReportData => ({
  reportId: r.reportId,
  runId: r.runId,
  overallConfidence: r.overallConfidence,
  entityCheck: r.entityCheck,
  meta: r.meta,
  companyProfile: r.data.companyProfile,
  directors: r.data.directors?.verified ?? [],
  recommendations: r.data.recommendations ?? [],
  strategy: r.data.strategy,
  partnerProductRecommendations: r.data.partnerProductRecommendations ?? r.data.zohoRecommendations ?? [],
});

/** Convert saved report from DB → ReportData */
export const fromSavedReport = (r: SavedReport): ReportData => ({
  reportId: r._id,
  runId: r.runId,
  overallConfidence: r.overallConfidence,
  meta: r.annualSpend != null ? { annualSpendUsed: r.annualSpend, annualSpendSource: 'estimated', warnings: [], durationMs: 0 } : undefined,
  companyProfile: r.validatedProfile?.verifiedCompany ?? r.validatedProfile,
  directors: r.validatedProfile?.verifiedDirectors ?? [],
  recommendations: r.recommendations,
  strategy: r.strategy,
  partnerProductRecommendations: r.partnerProductRecommendations ?? r.zohoRecommendations ?? [],
  createdAt: r.createdAt,
});
