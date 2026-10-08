import API from '../api/api';

export interface TargetAccount {
  id: string;
  name: string;
  website: string;
  normalizedDomain: string;
  industry: string;
  geography: string;
  targetingReason: string;
  notes: string;
  tags: string[];
  ownerUserId: string | null;
  ownerName: string | null;
  version: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TargetReport {
  id: string;
  userId: string;
  customerName: string;
  companyDomain: string;
  overallConfidence: number;
  createdAt: string;
}

export interface TargetRun {
  id: string;
  userId?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  researchStage?: string | null;
  attempts?: number;
  partialResults?: boolean;
  resourceUsage?: Record<string, { promptTokens: number | null; outputTokens: number | null; totalTokens: number | null }>;
  error: string | null;
  reportId: string | null;
  startedAt: string;
  endedAt: string | null;
}

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  sourceType: 'company' | 'news' | 'jobs' | 'other';
  retrievedAt: string;
  publishedAt: string | null;
  contentHash: string;
}

export interface ResearchClaim {
  id: string;
  statement: string;
  classification: 'fact' | 'inference' | 'recommendation';
  certainty: 'confirmed' | 'likely' | 'unknown';
  eventDate: string | null;
  createdAt: string;
  evidence: { sourceId: string; excerpt: string }[];
}

export interface ResearchEvidence {
  run: (TargetRun & { modelId?: string; promptVersion?: string; sellerProfileVersion?: number }) | null;
  sources: ResearchSource[];
  claims: ResearchClaim[];
}

export interface TargetIntelligence {
  run: TargetRun | null;
  technologies: Array<{ id: string; claimId: string; name: string; category: string; status: 'confirmed' | 'likely' | 'unknown'; rationale: string; observedAt: string | null }>;
  people: Array<{ id: string; claimId: string; name: string; role: string; buyingRole: string; currentness: 'confirmed' | 'likely' | 'unknown'; rationale: string }>;
  signals: Array<{ id: string; claimId: string; signalType: string; strength: 'low' | 'medium' | 'high'; eventDate: string | null; interpretation: string }>;
  gaps: Array<{ id: string; claimId: string; statement: string; certainty: 'likely' | 'unknown'; rationale: string }>;
}
export interface OpportunityResult {
  set: { id: string; status: string; resultReason: string | null; scoringVersion: string; createdAt: string } | null;
  opportunities: Array<{ id: string; offeringName: string; title: string; targetNeed: string; needKind: 'confirmed_need' | 'discovery_hypothesis'; rationale: string; uncertainties: string[]; whyNow: string; entryAction: string; score: number; coverage: number; evidenceConfidence: 'low' | 'medium' | 'high'; scoreBreakdown: Record<string, { weight: number; value: number | null; contribution: number | null; reason: string }>; evidence: Array<{ claimId: string; statement: string }> }>;
}

export const listTargets = (page = 1, search = '', includeArchived = false) =>
  API.get<{ data: TargetAccount[]; total: number; page: number; limit: number }>('/targets', {
    params: { page, search, includeArchived }
  });

export const createTarget = (input: { name: string; website: string; industry?: string; geography?: string; targetingReason?: string; notes?: string; tags?: string[] }) =>
  API.post<TargetAccount>('/targets', input);

export const getTarget = (id: string) => API.get<TargetAccount>(`/targets/${id}`);
export const updateTarget = (id: string, input: Partial<TargetAccount> & { version: number; archived?: boolean }) =>
  API.patch<TargetAccount>(`/targets/${id}`, input);
export const getTargetHistory = (id: string) => API.get<{ reports: TargetReport[]; runs: TargetRun[] }>(`/targets/${id}/history`);
export const researchTarget = (id: string) => API.post<{ runId: string; status: 'queued'; stage: 'queued' }>(`/targets/${id}/research`);
export const getTargetResearchRun = (id: string, runId: string) => API.get<TargetRun>(`/targets/${id}/research/${runId}`);
export const getLatestTargetEvidence = (id: string) => API.get<ResearchEvidence>(`/targets/${id}/research/latest/evidence`);
export const getTargetIntelligence = (id: string) => API.get<TargetIntelligence>(`/targets/${id}/intelligence`);
export const getTargetOpportunities = (id: string) => API.get<OpportunityResult>(`/targets/${id}/opportunities`);
export const matchTargetOpportunities = (id: string) => API.post<{ kind: string; setId: string }>(`/targets/${id}/opportunities`);
export const getTargetEvidence = (id: string, runId: string) => API.get<ResearchEvidence>(`/targets/${id}/research/${runId}/evidence`);
export const retryTargetResearch = (id: string, runId: string) => API.post(`/targets/${id}/research/${runId}/retry`);
export const linkTargetReport = (id: string, reportId: string) => API.post(`/targets/${id}/link-report`, { reportId });
