export interface IAnalysisReport {
  id: string;
  userId: string;
  workspaceId: string;
  runId: string;
  customerName: string;
  companyDomain: string;
  annualSpend: number;
  validatedProfile: Record<string, unknown>;
  recommendations: unknown[];
  strategy: Record<string, unknown>;
  overallConfidence: number;
  digestText?: string | null;
  partnerProductRecommendations?: unknown[];
  zohoRecommendations?: unknown[];
  createdAt: Date;
  updatedAt: Date;
}
