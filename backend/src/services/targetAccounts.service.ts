import crypto from "node:crypto";
import { postgres } from "../config/postgres.js";
import { mapDbRow, mapDbRows } from "../utils/dbRows.js";

export class TargetValidationError extends Error {}
export class TargetConflictError extends Error {}
export class TargetForbiddenError extends Error {}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields = ["name", "website", "industry", "geography", "targetingReason", "notes", "tags", "ownerUserId"] as const;
type Field = typeof fields[number];
type TargetInput = Partial<Record<Field, string | string[] | null>> & { normalizedDomain?: string; version?: number; archived?: boolean };

const stringValue = (value: unknown, key: string, max: number, required = false): string => {
  if (typeof value !== "string" || value.length > max || /[\u0000-\u001f\u007f]/.test(value) || (required && !value.trim())) {
    throw new TargetValidationError(`${key} must be ${required ? "a non-empty" : "a"} string of at most ${max} characters`);
  }
  return value.trim();
};

export const normalizeTargetDomain = (website: string): string => {
  const raw = website.trim();
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); }
  catch { throw new TargetValidationError("website must contain a valid public domain"); }
  const domain = url.hostname.toLowerCase().replace(/^www\./, "");
  const labels = domain.split(".");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port ||
      domain.length > 253 || labels.length < 2 || labels.some(label =>
        label.length < 1 || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) ||
      !/^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(labels[labels.length - 1] || "")) {
    throw new TargetValidationError("website must contain a valid public domain");
  }
  return domain;
};

export const validateTargetInput = (value: unknown, update = false): TargetInput => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TargetValidationError("Account must be an object");
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(key => ![...fields, ...(update ? ["version", "archived"] : [])].includes(key))) {
    throw new TargetValidationError("Account contains an unknown field");
  }
  if (update && (!Number.isSafeInteger(body.version) || Number(body.version) < 1)) {
    throw new TargetValidationError("version must be a positive integer");
  }
  if (update && Object.keys(body).length < 2) throw new TargetValidationError("Provide a field to update");
  if (!update && (body.name === undefined || body.website === undefined)) {
    throw new TargetValidationError("name and website are required");
  }
  const result: TargetInput = {};
  if (body.name !== undefined) {
    result.name = stringValue(body.name, "name", 160, true);
    if (result.name.length < 2) throw new TargetValidationError("name must have at least 2 characters");
  }
  if (body.website !== undefined) {
    result.website = stringValue(body.website, "website", 500, true);
    result.normalizedDomain = normalizeTargetDomain(result.website);
  }
  for (const [key, max] of [["industry", 120], ["geography", 160], ["targetingReason", 2000], ["notes", 10000]] as const) {
    if (body[key] !== undefined) result[key] = stringValue(body[key], key, max);
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.length > 20 || body.tags.some(tag => typeof tag !== "string" || !tag.trim() || tag.length > 40 || /[\u0000-\u001f\u007f]/.test(tag))) {
      throw new TargetValidationError("tags must contain at most 20 non-empty strings of at most 40 characters");
    }
    result.tags = [...new Set(body.tags.map(tag => tag.trim()))];
  }
  if (body.ownerUserId !== undefined) {
    if (body.ownerUserId !== null && (typeof body.ownerUserId !== "string" || !uuid.test(body.ownerUserId))) {
      throw new TargetValidationError("ownerUserId must be a user ID or null");
    }
    result.ownerUserId = body.ownerUserId as string | null;
  }
  if (update) {
    result.version = body.version as number;
    if (body.archived !== undefined) {
      if (typeof body.archived !== "boolean") throw new TargetValidationError("archived must be a boolean");
      result.archived = body.archived;
    }
  }
  return result;
};

export const assertEligibleOwner = async (workspaceId: string, ownerId: string | null): Promise<void> => {
  if (ownerId === null) return;
  const result = await postgres.query(
    "SELECT 1 FROM users WHERE id = $1 AND workspace_id = $2 AND is_blocked = false", [ownerId, workspaceId]
  );
  if (!result.rowCount) throw new TargetValidationError("ownerUserId must identify an active member of this workspace");
};

const select = `SELECT a.*, u.name AS owner_name, u.email AS owner_email FROM target_accounts a
  LEFT JOIN users u ON u.id = a.owner_user_id AND u.workspace_id = a.workspace_id`;

export const getTargetAccount = async (workspaceId: string, id: string) => {
  if (!uuid.test(id)) return null;
  const result = await postgres.query(`${select} WHERE a.workspace_id = $1 AND a.id = $2`, [workspaceId, id]);
  return mapDbRow(result.rows[0]);
};

export const listTargetAccounts = async (workspaceId: string, page: number, limit: number, search: string, includeArchived: boolean) => {
  const where = `a.workspace_id = $1 AND ($2::boolean OR a.archived_at IS NULL)
    AND ($3::text = '' OR a.name ILIKE '%' || $3 || '%' OR a.normalized_domain ILIKE '%' || $3 || '%')`;
  const args = [workspaceId, includeArchived, search];
  const [items, count] = await Promise.all([
    postgres.query(`${select} WHERE ${where} ORDER BY a.created_at DESC, a.id DESC LIMIT $4 OFFSET $5`,
      [...args, limit, (page - 1) * limit]),
    postgres.query<{ total: number }>(`SELECT count(*)::int AS total FROM target_accounts a WHERE ${where}`, args)
  ]);
  return { data: mapDbRows(items.rows), total: count.rows[0].total, page, limit };
};

export const createTargetAccount = async (workspaceId: string, actorId: string, isAdmin: boolean, input: TargetInput) => {
  const ownerId = input.ownerUserId === undefined ? actorId : input.ownerUserId as string | null;
  if (!isAdmin && ownerId !== actorId) throw new TargetForbiddenError("Only admins can assign another owner");
  await assertEligibleOwner(workspaceId, ownerId);
  const result = await postgres.query(
    `INSERT INTO target_accounts (id, workspace_id, name, website, normalized_domain, industry, geography,
      targeting_reason, notes, tags, owner_user_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [crypto.randomUUID(), workspaceId, input.name, input.website, input.normalizedDomain,
      input.industry ?? "", input.geography ?? "", input.targetingReason ?? "", input.notes ?? "",
      input.tags ?? [], ownerId, actorId]
  );
  return getTargetAccount(workspaceId, result.rows[0].id);
};

export const updateTargetAccount = async (workspaceId: string, actorId: string, isAdmin: boolean, id: string, input: TargetInput) => {
  if (!uuid.test(id)) return null;
  if (input.ownerUserId !== undefined) {
    if (!isAdmin) throw new TargetForbiddenError("Only admins can change account owner");
    await assertEligibleOwner(workspaceId, input.ownerUserId as string | null);
  }
  const columns: Record<string, string> = {
    name: "name", website: "website", normalizedDomain: "normalized_domain", industry: "industry",
    geography: "geography", targetingReason: "targeting_reason", notes: "notes", tags: "tags", ownerUserId: "owner_user_id"
  };
  const entries = Object.entries(columns).filter(([key]) => input[key as keyof TargetInput] !== undefined);
  const values: unknown[] = [workspaceId, id, input.version, actorId, isAdmin];
  const assignments = entries.map(([key, column]) => {
    values.push(input[key as keyof TargetInput]);
    return `${column} = $${values.length}`;
  });
  if (input.archived !== undefined) assignments.push(`archived_at = ${input.archived ? "now()" : "NULL"}`);
  if (!assignments.length) throw new TargetValidationError("Provide a field to update");
  const result = await postgres.query(
    `UPDATE target_accounts SET ${assignments.join(", ")}, version = version + 1, updated_at = now()
     WHERE workspace_id = $1 AND id = $2 AND version = $3 AND ($5::boolean OR owner_user_id = $4)
     RETURNING id`, values
  );
  if (result.rowCount) return getTargetAccount(workspaceId, id);
  const current = await getTargetAccount(workspaceId, id);
  if (!current) return null;
  if (!isAdmin && current.ownerUserId !== actorId) throw new TargetForbiddenError("Only account owner or admin can edit this account");
  throw new TargetConflictError("Account changed. Reload before saving.");
};

export const getTargetHistory = async (workspaceId: string, accountId: string, userId: string, isAdmin: boolean) => {
  const [reports, runs] = await Promise.all([
    postgres.query(
      `SELECT id, user_id, customer_name, company_domain, overall_confidence, created_at, updated_at
       FROM analysis_reports WHERE workspace_id = $1 AND account_id = $2 AND ($4::boolean OR user_id = $3)
       ORDER BY created_at DESC`, [workspaceId, accountId, userId, isAdmin]
    ),
    postgres.query(
      `SELECT id, user_id, status, error, report_id, started_at, ended_at, created_at
       FROM analysis_runs WHERE workspace_id = $1 AND account_id = $2 AND ($4::boolean OR user_id = $3)
       ORDER BY created_at DESC LIMIT 50`, [workspaceId, accountId, userId, isAdmin]
    )
  ]);
  return { reports: mapDbRows(reports.rows), runs: mapDbRows(runs.rows) };
};

export const linkLegacyReport = async (workspaceId: string, accountId: string, reportId: string, userId: string) => {
  if (!uuid.test(accountId) || typeof reportId !== "string" || reportId.length > 100) return null;
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const target = await client.query<{ normalized_domain: string; archived_at: Date | null }>(
      "SELECT normalized_domain, archived_at FROM target_accounts WHERE workspace_id = $1 AND id = $2 FOR UPDATE",
      [workspaceId, accountId]
    );
    if (!target.rows[0] || target.rows[0].archived_at) { await client.query("ROLLBACK"); return null; }
    const report = await client.query<{ run_id: string; company_domain: string; account_id: string | null }>(
      `SELECT run_id, company_domain, account_id FROM analysis_reports
       WHERE workspace_id = $1 AND id = $2 AND user_id = $3 FOR UPDATE`, [workspaceId, reportId, userId]
    );
    if (!report.rows[0]) { await client.query("ROLLBACK"); return null; }
    if (normalizeTargetDomain(report.rows[0].company_domain) !== target.rows[0].normalized_domain) {
      throw new TargetValidationError("Report domain must match account domain");
    }
    if (report.rows[0].account_id && report.rows[0].account_id !== accountId) {
      throw new TargetConflictError("Report already belongs to another account");
    }
    const run = await client.query<{ account_id: string | null }>(
      "SELECT account_id FROM analysis_runs WHERE id = $1 AND workspace_id = $2 FOR UPDATE",
      [report.rows[0].run_id, workspaceId]
    );
    if (!run.rows[0] || (run.rows[0].account_id && run.rows[0].account_id !== accountId)) {
      throw new TargetConflictError("Research run already belongs to another account");
    }
    await client.query("UPDATE analysis_runs SET account_id = $3 WHERE id = $1 AND workspace_id = $2", [report.rows[0].run_id, workspaceId, accountId]);
    await client.query("UPDATE analysis_reports SET account_id = $3 WHERE id = $1 AND workspace_id = $2", [reportId, workspaceId, accountId]);
    await client.query("COMMIT");
    return { reportId, accountId };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
};
