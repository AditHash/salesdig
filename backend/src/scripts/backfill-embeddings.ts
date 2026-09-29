import "../env.js";
import connectDB from "../config/db.js";
import AnalysisReport from "../models/analysisReport.model.js";
import { buildDigest } from "../services/rag/digest.service.js";
import { embedDocument } from "../services/llm/embedding.service.js";
import { upsertVector } from "../services/rag/pgvector.client.js";
import { DEFAULT_WORKSPACE_ID } from "../config/workspaceDefaults.js";
import { postgres } from "../config/postgres.js";
import mongoose from "mongoose";

const BATCH_SIZE = 50;
const DELAY_MS = 300; // avoid Gemini rate limits

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const run = async () => {
  await connectDB();
  console.log("[backfill] connected to MongoDB and PostgreSQL");

  const total = await AnalysisReport.countDocuments({});
  console.log(`[backfill] rebuilding pgvector index for ${total} reports`);

  let processed = 0;
  let lastId: mongoose.Types.ObjectId | null = null;

  while (true) {
    const batch: any[] = await AnalysisReport.find(lastId ? { _id: { $gt: lastId } } as any : {})
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .lean();

    if (batch.length === 0) break;

    for (const report of batch) {
      try {
        const digest = report.digestText || buildDigest(report as any);
        const vector = await embedDocument(digest);
        await upsertVector(String(report._id), vector, report.userId, report.workspaceId || DEFAULT_WORKSPACE_ID);
        if (!report.digestText) await AnalysisReport.findByIdAndUpdate(report._id, { digestText: digest });
        processed++;
        console.log(`[backfill] ${processed}/${total} — ${report.customerName}`);
        await sleep(DELAY_MS);
      } catch (e) {
        console.error(`[backfill] failed for ${report.customerName}:`, e);
      }
    }

    lastId = batch[batch.length - 1]._id;
  }

  console.log(`[backfill] done. ${processed}/${total} reports indexed in pgvector.`);
  await mongoose.disconnect();
  await postgres.end();
};

run().catch(async e => {
  console.error(e);
  await mongoose.disconnect().catch(() => undefined);
  await postgres.end().catch(() => undefined);
  process.exit(1);
});
