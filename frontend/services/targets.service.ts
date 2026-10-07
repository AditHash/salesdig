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
  status: 'queued' | 'running' | 'completed' | 'failed';
  error: string | null;
  reportId: string | null;
  startedAt: string;
  endedAt: string | null;
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
export const researchTarget = (id: string) => API.post<{ runId: string; reportId: string }>(`/targets/${id}/research`);
export const linkTargetReport = (id: string, reportId: string) => API.post(`/targets/${id}/link-report`, { reportId });
