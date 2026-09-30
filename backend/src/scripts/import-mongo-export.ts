import "../env.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "crypto";
import connectDB from "../config/db.js";
import { postgres } from "../config/postgres.js";
import { DEFAULT_WORKSPACE_ID } from "../config/workspaceDefaults.js";

type Row = Record<string, any>;

const unwrap = (value: any): any => {
  if (Array.isArray(value)) return value.map(unwrap);
  if (!value || typeof value !== "object") return value;
  if ("$oid" in value) return String(value.$oid);
  if ("$date" in value) {
    const raw = value.$date?.$numberLong ?? value.$date;
    return new Date(typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : raw);
  }
  if ("$numberInt" in value) return Number.parseInt(value.$numberInt, 10);
  if ("$numberLong" in value) return Number(value.$numberLong);
  if ("$numberDouble" in value) return Number(value.$numberDouble);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, unwrap(child)]));
};

const getId = (row: Row): string => String(row._id ?? row.id ?? randomUUID());
const getDate = (value: any, fallback = new Date()): Date => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};
const json = (value: unknown, fallback: unknown): string => JSON.stringify(value ?? fallback);

const loadCollection = async (directory: string, fileName: string): Promise<Row[]> => {
  const file = path.join(directory, fileName);
  const parsed = unwrap(JSON.parse(await readFile(file, "utf8")));
  if (!Array.isArray(parsed)) throw new Error(`${fileName} must contain a JSON array (export with mongoexport --jsonArray)`);
  return parsed;
};

const run = async () => {
  const directory = process.env.LEGACY_MONGO_EXPORT_DIR;
  if (!directory) throw new Error("Set LEGACY_MONGO_EXPORT_DIR to a directory containing the workspace and five mongoexport JSON arrays.");
  const workspaces = await loadCollection(directory, "workspaces.json");
  const users = await loadCollection(directory, "users.json");
  const runs = await loadCollection(directory, "analysisruns.json");
  const reports = await loadCollection(directory, "analysisreports.json");
  const sessions = await loadCollection(directory, "chatsessions.json");
  const footprints = await loadCollection(directory, "footprints.json");

  await connectDB();
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    for (const row of workspaces) {
      const createdAt = getDate(row.created_at || row.createdAt);
      const updatedAt = getDate(row.updated_at || row.updatedAt, createdAt);
      await client.query(
        `INSERT INTO workspaces (id, slug, settings, created_at, updated_at) VALUES ($1, $2, $3::jsonb, $4, $5)
         ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, settings = EXCLUDED.settings, updated_at = EXCLUDED.updated_at`,
        [String(row.id || row._id), row.slug, json(row.settings, {}), createdAt, updatedAt]
      );
    }
    for (const row of users) {
      const createdAt = getDate(row.createdAt);
      const updatedAt = getDate(row.updatedAt, createdAt);
      await client.query(
        `INSERT INTO users (id, name, email, password, role, workspace_id, last_login, is_blocked,
           password_reset_token, password_reset_expiry, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, password = EXCLUDED.password,
           role = EXCLUDED.role, workspace_id = EXCLUDED.workspace_id, last_login = EXCLUDED.last_login,
           is_blocked = EXCLUDED.is_blocked, password_reset_token = EXCLUDED.password_reset_token,
           password_reset_expiry = EXCLUDED.password_reset_expiry, updated_at = EXCLUDED.updated_at`,
        [getId(row), row.name || "", String(row.email || "").toLowerCase(), row.password || "", row.role === "admin" ? "admin" : "user",
          row.workspaceId || DEFAULT_WORKSPACE_ID, row.lastLogin || null, Boolean(row.isBlocked), row.passwordResetToken || null,
          row.passwordResetExpiry || null, createdAt, updatedAt]
      );
    }
    for (const row of runs) {
      const createdAt = getDate(row.createdAt, getDate(row.startedAt));
      await client.query(
        `INSERT INTO analysis_runs (id, user_id, workspace_id, status, input, agent_runs, validated_profile,
           final_recommendations, overall_confidence, report_id, error, started_at, ended_at, duration_ms, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, workspace_id = EXCLUDED.workspace_id,
           status = EXCLUDED.status, input = EXCLUDED.input, agent_runs = EXCLUDED.agent_runs,
           validated_profile = EXCLUDED.validated_profile, final_recommendations = EXCLUDED.final_recommendations,
           overall_confidence = EXCLUDED.overall_confidence, report_id = EXCLUDED.report_id, error = EXCLUDED.error,
           ended_at = EXCLUDED.ended_at, duration_ms = EXCLUDED.duration_ms, updated_at = EXCLUDED.updated_at`,
        [getId(row), String(row.userId), row.workspaceId || DEFAULT_WORKSPACE_ID, row.status || "failed",
          json(row.input, {}), json(row.agentRuns, {}), json(row.validatedProfile, null), json(row.finalRecommendations, null),
          row.overallConfidence ?? null, row.reportId ? String(row.reportId) : null, row.error || null,
          getDate(row.startedAt, createdAt), row.endedAt ? getDate(row.endedAt) : null, row.durationMs ?? null,
          createdAt, getDate(row.updatedAt, createdAt)]
      );
    }
    for (const row of reports) {
      const createdAt = getDate(row.createdAt);
      await client.query(
        `INSERT INTO analysis_reports (id, user_id, workspace_id, run_id, customer_name, company_domain, annual_spend,
           validated_profile, recommendations, strategy, overall_confidence, digest_text,
           partner_product_recommendations, zoho_recommendations, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $13::jsonb, $14::jsonb, $15, $16)
         ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, workspace_id = EXCLUDED.workspace_id,
           run_id = EXCLUDED.run_id, customer_name = EXCLUDED.customer_name, company_domain = EXCLUDED.company_domain,
           annual_spend = EXCLUDED.annual_spend, validated_profile = EXCLUDED.validated_profile,
           recommendations = EXCLUDED.recommendations, strategy = EXCLUDED.strategy, overall_confidence = EXCLUDED.overall_confidence,
           digest_text = EXCLUDED.digest_text, partner_product_recommendations = EXCLUDED.partner_product_recommendations,
           zoho_recommendations = EXCLUDED.zoho_recommendations, updated_at = EXCLUDED.updated_at`,
        [getId(row), String(row.userId), row.workspaceId || DEFAULT_WORKSPACE_ID, String(row.runId), row.customerName || "Unknown",
          row.companyDomain || "", Number(row.annualSpend || 0), json(row.validatedProfile, {}), json(row.recommendations, []),
          json(row.strategy, {}), Number(row.overallConfidence || 0), row.digestText || null,
          json(row.partnerProductRecommendations, row.zohoRecommendations || []), json(row.zohoRecommendations, []),
          createdAt, getDate(row.updatedAt, createdAt)]
      );
    }
    for (const row of sessions) {
      const createdAt = getDate(row.createdAt);
      const sessionId = getId(row);
      await client.query(
        `INSERT INTO chat_sessions (id, user_id, workspace_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
        [sessionId, String(row.userId), row.workspaceId || DEFAULT_WORKSPACE_ID, createdAt, getDate(row.updatedAt, createdAt)]
      );
      const sessionResult = await client.query("SELECT id FROM chat_sessions WHERE user_id = $1", [String(row.userId)]);
      const actualSessionId = sessionResult.rows[0].id as string;
      const messageCount = await client.query("SELECT count(*)::int AS count FROM chat_messages WHERE session_id = $1", [actualSessionId]);
      if (messageCount.rows[0].count === 0) {
        for (const message of row.messages || []) {
          await client.query(
            "INSERT INTO chat_messages (session_id, role, content, created_at, used_report_ids) VALUES ($1, $2, $3, $4, $5)",
            [actualSessionId, message.role === "assistant" ? "assistant" : "user", String(message.content || ""), getDate(message.createdAt, createdAt), (message.usedReportIds || []).map(String)]
          );
        }
      }
    }
    for (const row of footprints) {
      const userId = String(row.userId);
      await client.query(
        `INSERT INTO footprints (id, user_id, workspace_id, action, page, meta, created_at, updated_at)
         SELECT $1, u.id, u.workspace_id, $2, $3, $4, $5, $6 FROM users u WHERE u.id = $7
         ON CONFLICT (id) DO UPDATE SET action = EXCLUDED.action, page = EXCLUDED.page, meta = EXCLUDED.meta,
           workspace_id = EXCLUDED.workspace_id, updated_at = EXCLUDED.updated_at`,
        [getId(row), row.action || "UNKNOWN", row.page || "", row.meta || null, getDate(row.createdAt), getDate(row.updatedAt, getDate(row.createdAt)), userId]
      );
    }
    await client.query("COMMIT");
    console.log(`Imported workspaces=${workspaces.length}, users=${users.length}, runs=${runs.length}, reports=${reports.length}, sessions=${sessions.length}, footprints=${footprints.length}`);
    console.log("Run the embedding backfill script after import to index report digests in pgvector.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await postgres.end();
  }
};

run().catch(error => {
  console.error("Mongo export import failed:", error);
  process.exit(1);
});
