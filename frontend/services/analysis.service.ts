import API from "../api/api";

export const runAnalysis = (data: { customerName: string; companyDomain: string }) =>
  API.post("/analysis/v2/run", data);

export const getMyReports = () =>
  API.get("/analysis/v2/reports");

export const getReportById = (reportId: string) =>
  API.get(`/analysis/v2/report/${reportId}`);

export const deleteReport = (reportId: string) =>
  API.delete(`/analysis/v2/report/${reportId}`);

export const downloadReportPdf = (reportId: string) =>
  API.get(`/analysis/v2/report/${reportId}/pdf`, { responseType: 'blob' });

export const regenerateReport = (reportId: string) =>
  API.post(`/analysis/v2/report/${reportId}/regenerate`);

export const getAllReports = (params?: { page?: number; limit?: number; search?: string; userId?: string }) =>
  API.get('/analysis/v2/admin/reports', { params });
