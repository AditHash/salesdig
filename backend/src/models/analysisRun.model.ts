export interface IAnalysisRun {
  id: string;
  userId: string;
  workspaceId: string;
  status: "queued" | "running" | "completed" | "failed";
  input: { customerName: string; companyDomain: string };
  agentRuns: Record<string, unknown>;
  validatedProfile?: Record<string, unknown> | null;
  finalRecommendations?: Record<string, unknown> | null;
  overallConfidence?: number | null;
  reportId?: string | null;
  error?: string | null;
  startedAt: Date;
  endedAt?: Date | null;
  durationMs?: number | null;
  createdAt: Date;
  updatedAt: Date;
}
