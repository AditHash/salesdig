import AnalysisReport from "../../models/analysisReport.model.js";
import { embedQuery } from "../llm/embedding.service.js";
import { queryVectors } from "./pgvector.client.js";
import { DEFAULT_WORKSPACE_ID } from "../../config/workspaceDefaults.js";

export interface RetrievedContext {
  reportId: string;
  customerName: string;
  companyDomain: string;
  digestText: string;
}

export const retrieveRelevantReports = async (
  question: string,
  userId: string,
  workspaceId = DEFAULT_WORKSPACE_ID,
  topK = 5
): Promise<RetrievedContext[]> => {
  const vector = await embedQuery(question);
  const reportIds = await queryVectors(vector, userId, workspaceId, topK);

  if (reportIds.length === 0) return [];

  const reports = await AnalysisReport.find(
    { _id: { $in: reportIds }, userId },
    { customerName: 1, companyDomain: 1, digestText: 1 }
  ).lean();

  return reports
    .filter(r => r.digestText)
    .map(r => ({
      reportId: String(r._id),
      customerName: r.customerName,
      companyDomain: r.companyDomain,
      digestText: r.digestText!
    }));
};
