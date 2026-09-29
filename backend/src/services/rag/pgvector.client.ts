import { postgres } from "../../config/postgres.js";

const toPgVector = (values: number[]): string => `[${values.join(",")}]`;

export const upsertVector = async (
  reportId: string,
  vector: number[],
  userId: string,
  workspaceId: string
): Promise<void> => {
  await postgres.query(
    `INSERT INTO report_embeddings (report_id, workspace_id, user_id, embedding)
     VALUES ($1, $2, $3, $4::vector)
     ON CONFLICT (report_id) DO UPDATE
       SET workspace_id = EXCLUDED.workspace_id,
           user_id = EXCLUDED.user_id,
           embedding = EXCLUDED.embedding`,
    [reportId, workspaceId, userId, toPgVector(vector)]
  );
};

export const queryVectors = async (
  vector: number[],
  userId: string,
  workspaceId: string,
  topK = 5
): Promise<string[]> => {
  const result = await postgres.query<{ report_id: string }>(
    `SELECT report_id
     FROM report_embeddings
     WHERE workspace_id = $1 AND user_id = $2
     ORDER BY embedding <=> $3::vector
     LIMIT $4`,
    [workspaceId, userId, toPgVector(vector), topK]
  );
  return result.rows.map(row => row.report_id);
};

export const deleteVector = async (reportId: string): Promise<void> => {
  await postgres.query("DELETE FROM report_embeddings WHERE report_id = $1", [reportId]);
};
