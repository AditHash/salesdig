import "../env.js";
import connectDB from "../config/db.js";
import { postgres } from "../config/postgres.js";
import { IAnalysisReport } from "../models/analysisReport.model.js";
import { buildDigest } from "../services/rag/digest.service.js";
import { embedDocument } from "../services/llm/embedding.service.js";
import { upsertVector } from "../services/rag/pgvector.client.js";
import { DEFAULT_WORKSPACE_ID } from "../config/workspaceDefaults.js";
import { mapDbRow } from "../utils/dbRows.js";

const BATCH_SIZE = 50;
const DELAY_MS = 300;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const run = async () => {
  await connectDB();
  const totalResult = await postgres.query("SELECT count(*)::int AS total FROM analysis_reports");
  const total = totalResult.rows[0]?.total ?? 0;
  console.log(`[backfill] rebuilding pgvector index for ${total} reports`);

  let processed = 0;
  let lastId = "";
  while (true) {
    const result = await postgres.query(
      "SELECT * FROM analysis_reports WHERE id > $1 ORDER BY id LIMIT $2",
      [lastId, BATCH_SIZE]
    );
    if (result.rows.length === 0) break;
    const batch = result.rows.map(row => mapDbRow<IAnalysisReport>(row)!);
    for (const report of batch) {
      try {
        const digest = report.digestText || buildDigest(report);
        const vector = await embedDocument(digest);
        await upsertVector(report.id, vector, report.userId, report.workspaceId || DEFAULT_WORKSPACE_ID);
        if (!report.digestText) await postgres.query("UPDATE analysis_reports SET digest_text = $2 WHERE id = $1", [report.id, digest]);
        processed++;
        console.log(`[backfill] ${processed}/${total} — ${report.customerName}`);
        await sleep(DELAY_MS);
      } catch (error) {
        console.error(`[backfill] failed for ${report.customerName}:`, error);
      }
    }
    lastId = batch[batch.length - 1].id;
  }
  console.log(`[backfill] done. ${processed}/${total} reports indexed in pgvector.`);
  await postgres.end();
};

run().catch(async error => {
  console.error(error);
  await postgres.end().catch(() => undefined);
  process.exit(1);
});
