import crypto from "node:crypto";
import type { PoolClient } from "pg";
import { postgres } from "../config/postgres.js";
import { mapDbRow, mapDbRows } from "../utils/dbRows.js";

export type CatalogKind = "offerings" | "partners" | "case-studies";
type CatalogField = { key: string; column: string; type: "string" | "list" | "uuid" | "offeringType" | "status"; max?: number; required?: boolean };

const definitions: Record<CatalogKind, { table: string; fields: CatalogField[]; title: string }> = {
  offerings: {
    table: "seller_offerings", title: "name", fields: [
      { key: "name", column: "name", type: "string", max: 120, required: true },
      { key: "offeringType", column: "offering_type", type: "offeringType", required: true },
      { key: "description", column: "description", type: "string", max: 2000, required: true },
      { key: "capabilities", column: "capabilities", type: "list" },
      { key: "businessOutcomes", column: "business_outcomes", type: "list" },
      { key: "relevantIndustries", column: "relevant_industries", type: "list" },
      { key: "idealCustomerProfile", column: "ideal_customer_profile", type: "string", max: 1000 }
    ]
  },
  partners: {
    table: "seller_partners", title: "name", fields: [
      { key: "name", column: "name", type: "string", max: 120, required: true },
      { key: "description", column: "description", type: "string", max: 1000 },
      { key: "credentials", column: "credentials", type: "list" }
    ]
  },
  "case-studies": {
    table: "seller_case_studies", title: "title", fields: [
      { key: "title", column: "title", type: "string", max: 160, required: true },
      { key: "clientName", column: "client_name", type: "string", max: 120 },
      { key: "summary", column: "summary", type: "string", max: 2000, required: true },
      { key: "outcomes", column: "outcomes", type: "list" },
      { key: "offeringId", column: "offering_id", type: "uuid" }
    ]
  }
};

export class CatalogValidationError extends Error {}

export const isCatalogKind = (value: string): value is CatalogKind => value in definitions;

const defaults: Record<CatalogKind, Record<string, unknown>> = {
  offerings: { capabilities: [], businessOutcomes: [], relevantIndustries: [], idealCustomerProfile: "" },
  partners: { description: "", credentials: [] },
  "case-studies": { clientName: "", outcomes: [], offeringId: null }
};

const validate = (kind: CatalogKind, value: unknown, isUpdate: boolean): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CatalogValidationError("Item must be an object");
  const input = value as Record<string, unknown>;
  const keys = definitions[kind].fields.map(field => field.key);
  if (Object.keys(input).some(key => ![...keys, "reviewStatus", ...(isUpdate ? ["version", "archived"] : [])].includes(key))) {
    throw new CatalogValidationError("Item contains an unknown field");
  }
  if (isUpdate && (!Number.isSafeInteger(input.version) || (input.version as number) < 1)) {
    throw new CatalogValidationError("version must be a positive integer");
  }
  if (isUpdate && "archived" in input && typeof input.archived !== "boolean") {
    throw new CatalogValidationError("archived must be a boolean");
  }
  if (isUpdate && Object.keys(input).length < 2) throw new CatalogValidationError("At least one item field is required");
  const result: Record<string, unknown> = {};
  for (const field of definitions[kind].fields) {
    if (!(field.key in input)) {
      if (!isUpdate && field.required) throw new CatalogValidationError(`${field.key} is required`);
      continue;
    }
    const item = input[field.key];
    if (field.type === "list") {
      if (!Array.isArray(item) || item.length > 30 || item.some(entry => typeof entry !== "string" || !entry.trim() || entry.length > 240 || /[\u0000-\u001f\u007f]/.test(entry))) {
        throw new CatalogValidationError(`${field.key} must contain at most 30 non-empty strings of at most 240 characters`);
      }
      result[field.key] = [...new Set(item.map(entry => (entry as string).trim()))];
    } else if (field.type === "string") {
      if (typeof item !== "string" || item.length > field.max! || /[\u0000-\u001f\u007f]/.test(item) || (field.required && !item.trim())) {
        throw new CatalogValidationError(`${field.key} must be ${field.required ? "a non-empty" : "a"} string of at most ${field.max} characters`);
      }
      result[field.key] = item.trim();
    } else if (field.type === "uuid") {
      if (item !== null && (typeof item !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item))) {
        throw new CatalogValidationError(`${field.key} must be a UUID or null`);
      }
      result[field.key] = item;
    } else if (field.type === "offeringType") {
      if (!["product", "service", "consulting", "managed_service"].includes(String(item))) {
        throw new CatalogValidationError("offeringType must be product, service, consulting, or managed_service");
      }
      result[field.key] = item;
    }
  }
  if ("reviewStatus" in input) {
    if (input.reviewStatus !== "draft" && input.reviewStatus !== "approved") throw new CatalogValidationError("reviewStatus must be draft or approved");
    result.reviewStatus = input.reviewStatus;
  }
  if ("archived" in input) result.archived = input.archived;
  if ("version" in input) result.version = input.version;
  return result;
};

export const validateCatalogInput = (kind: CatalogKind, value: unknown) => validate(kind, value, false);

const snapshot = (row: Record<string, unknown>) => {
  const mapped = mapDbRow<Record<string, unknown>>(row)!;
  delete mapped._id;
  return JSON.stringify(mapped);
};

const insertVersion = async (client: PoolClient, kind: CatalogKind, workspaceId: string, row: Record<string, unknown>, actorId: string) => {
  if (kind === "offerings") {
    await client.query(
      "INSERT INTO seller_offering_versions (workspace_id, offering_id, version, snapshot, changed_by) VALUES ($1, $2, $3, $4::jsonb, $5)",
      [workspaceId, row.id, row.version, snapshot(row), actorId]
    );
  } else {
    await client.query(
      "INSERT INTO seller_catalog_versions (workspace_id, item_kind, item_id, version, snapshot, changed_by) VALUES ($1, $2, $3, $4, $5::jsonb, $6)",
      [workspaceId, kind === "partners" ? "partner" : "case_study", row.id, row.version, snapshot(row), actorId]
    );
  }
};

const validateOfferingLink = async (client: PoolClient, workspaceId: string, offeringId: unknown) => {
  if (!offeringId) return;
  const linked = await client.query("SELECT 1 FROM seller_offerings WHERE id = $1 AND workspace_id = $2", [offeringId, workspaceId]);
  if (!linked.rowCount) throw new CatalogValidationError("offeringId must refer to an offering in this workspace");
};

const validateApproval = (kind: CatalogKind, item: Record<string, unknown>) => {
  if (item.reviewStatus !== "approved") return;
  if (kind === "offerings" && !(item.capabilities as string[]).length) {
    throw new CatalogValidationError("An approved offering needs at least one capability");
  }
  if (kind === "case-studies" && !(item.outcomes as string[]).length) {
    throw new CatalogValidationError("An approved case study needs at least one outcome");
  }
};

export const listCatalog = async (kind: CatalogKind, workspaceId: string, page: number, limit: number, includeArchived: boolean) => {
  const table = definitions[kind].table;
  const where = `workspace_id = $1 ${includeArchived ? "" : "AND archived_at IS NULL"}`;
  const [rows, count] = await Promise.all([
    postgres.query(`SELECT * FROM ${table} WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`, [workspaceId, limit, (page - 1) * limit]),
    postgres.query<{ total: number }>(`SELECT count(*)::int AS total FROM ${table} WHERE ${where}`, [workspaceId])
  ]);
  return { data: mapDbRows(rows.rows), page, limit, total: count.rows[0].total };
};

export const getApprovedOfferings = async (workspaceId: string) => {
  const result = await postgres.query(
    `SELECT * FROM seller_offerings WHERE workspace_id = $1
     AND review_status = 'approved' AND archived_at IS NULL ORDER BY updated_at DESC`,
    [workspaceId]
  );
  return mapDbRows(result.rows);
};

export const getCatalogItem = async (kind: CatalogKind, workspaceId: string, id: string) => {
  const result = await postgres.query(`SELECT * FROM ${definitions[kind].table} WHERE id = $1 AND workspace_id = $2`, [id, workspaceId]);
  return mapDbRow(result.rows[0]);
};

export const getCatalogVersions = async (kind: CatalogKind, workspaceId: string, id: string) => {
  const item = await getCatalogItem(kind, workspaceId, id);
  if (!item) return null;
  const result = kind === "offerings"
    ? await postgres.query("SELECT version, snapshot, created_at FROM seller_offering_versions WHERE offering_id = $1 AND workspace_id = $2 ORDER BY version DESC", [id, workspaceId])
    : await postgres.query("SELECT version, snapshot, created_at FROM seller_catalog_versions WHERE item_id = $1 AND workspace_id = $2 AND item_kind = $3 ORDER BY version DESC", [id, workspaceId, kind === "partners" ? "partner" : "case_study"]);
  return mapDbRows(result.rows);
};

export const createCatalogItemInTransaction = async (
  client: PoolClient, kind: CatalogKind, workspaceId: string, actorId: string, input: unknown,
  sourceKind: "seller_supplied" | "document_backed" = "seller_supplied"
) => {
  const parsed = validate(kind, input, false);
  const values: Record<string, unknown> = { ...defaults[kind], ...parsed, reviewStatus: parsed.reviewStatus ?? "draft" };
  validateApproval(kind, values);
  const fields = definitions[kind].fields;
  const columns = ["id", "workspace_id", ...fields.map(field => field.column), "review_status", "source_kind", "created_by"];
  const parameters = [crypto.randomUUID(), workspaceId, ...fields.map(field => values[field.key]), values.reviewStatus, sourceKind, actorId];
  if (kind === "case-studies") await validateOfferingLink(client, workspaceId, values.offeringId);
  const inserted = await client.query(
    `INSERT INTO ${definitions[kind].table} (${columns.join(", ")}) VALUES (${parameters.map((_, index) => `$${index + 1}`).join(", ")}) RETURNING *`, parameters
  );
  await insertVersion(client, kind, workspaceId, inserted.rows[0], actorId);
  return mapDbRow(inserted.rows[0]);
};

export const createCatalogItem = async (
  kind: CatalogKind, workspaceId: string, actorId: string, input: unknown,
  sourceKind: "seller_supplied" | "document_backed" = "seller_supplied"
) => {
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const item = await createCatalogItemInTransaction(client, kind, workspaceId, actorId, input, sourceKind);
    await client.query("COMMIT");
    return item;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};

export const retireDocumentBackedCatalogItems = async (
  client: PoolClient, workspaceId: string, documentId: string, actorId: string
) => {
  const accepted = await client.query<{ item_kind: string; accepted_item_id: string }>(
    `SELECT DISTINCT item_kind, accepted_item_id FROM seller_document_suggestions
     WHERE workspace_id = $1 AND document_id = $2 AND status = 'accepted' AND accepted_item_id IS NOT NULL`,
    [workspaceId, documentId]
  );
  const kindBySuggestion: Record<string, CatalogKind> = {
    offering: "offerings", partner: "partners", case_study: "case-studies"
  };
  for (const entry of accepted.rows) {
    const kind = kindBySuggestion[entry.item_kind];
    const result = await client.query(
      `UPDATE ${definitions[kind].table} SET review_status = 'draft', archived_at = COALESCE(archived_at, now()),
       version = version + 1, updated_at = now()
       WHERE workspace_id = $1 AND id = $2 AND source_kind = 'document_backed' AND archived_at IS NULL RETURNING *`,
      [workspaceId, entry.accepted_item_id]
    );
    if (result.rows[0]) await insertVersion(client, kind, workspaceId, result.rows[0], actorId);
  }
};

export const updateCatalogItem = async (kind: CatalogKind, workspaceId: string, actorId: string, id: string, input: unknown) => {
  const parsed = validate(kind, input, true);
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(`SELECT * FROM ${definitions[kind].table} WHERE id = $1 AND workspace_id = $2 FOR UPDATE`, [id, workspaceId]);
    if (!current.rows[0]) { await client.query("ROLLBACK"); return null; }
    if (current.rows[0].version !== parsed.version) { await client.query("ROLLBACK"); return "stale" as const; }
    const existing = mapDbRow<Record<string, unknown>>(current.rows[0])!;
    const next = { ...existing, ...parsed };
    validateApproval(kind, next);
    if (kind === "case-studies") await validateOfferingLink(client, workspaceId, next.offeringId);
    const fields = definitions[kind].fields;
    const values = fields.map(field => next[field.key]);
    const contentChanged = fields.some(field => JSON.stringify(existing[field.key]) !== JSON.stringify(next[field.key]));
    const assignments = fields.map((field, index) => `${field.column} = $${index + 3}`);
    const statusParameter = values.length + 3;
    const archivedParameter = values.length + 4;
    const updated = await client.query(
      `UPDATE ${definitions[kind].table} SET ${assignments.join(", ")}, review_status = $${statusParameter},
       source_kind = CASE WHEN $${archivedParameter + 1}::boolean THEN 'seller_supplied' ELSE source_kind END,
       archived_at = CASE WHEN $${archivedParameter}::boolean THEN COALESCE(archived_at, now()) ELSE NULL END,
       version = version + 1, updated_at = now() WHERE id = $1 AND workspace_id = $2 RETURNING *`,
      [id, workspaceId, ...values, next.reviewStatus, next.archived ?? Boolean(existing.archivedAt), contentChanged]
    );
    await insertVersion(client, kind, workspaceId, updated.rows[0], actorId);
    await client.query("COMMIT");
    return mapDbRow(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};
