import { postgres } from "../../config/postgres.js";
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

  const result = await postgres.query(
    `SELECT id, customer_name, company_domain, digest_text
     FROM analysis_reports WHERE id = ANY($1::text[]) AND user_id = $2 AND workspace_id = $3`,
    [reportIds, userId, workspaceId]
  );

  return result.rows.filter(row => row.digest_text).map(row => ({
    reportId: row.id,
    customerName: row.customer_name,
    companyDomain: row.company_domain,
    digestText: row.digest_text
  }));
};
