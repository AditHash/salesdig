import crypto from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { postgres } from "../config/postgres.js";
import { mapDbRow, mapDbRows } from "../utils/dbRows.js";
import { createCatalogItemInTransaction, retireDocumentBackedCatalogItems, validateCatalogInput, type CatalogKind } from "./sellerCatalog.service.js";

export const MAX_SELLER_DOCUMENT_BYTES = 20 * 1024;
export class DocumentValidationError extends Error {}
export class DocumentConflictError extends Error {}

export interface SellerDocumentUpload {
  filename: string;
  mimeType: "text/plain" | "text/markdown";
  content: string;
  sha256: string;
}

export const parseSellerDocumentUpload = (filename: unknown, mimeType: unknown, body: unknown): SellerDocumentUpload => {
  if (typeof filename !== "string" || filename.length > 160 || !/^[^/\\\u0000-\u001f\u007f]+\.(txt|md)$/i.test(filename)) {
    throw new DocumentValidationError("filename must be a .txt or .md name of at most 160 characters");
  }
  const expected = filename.toLowerCase().endsWith(".md") ? "text/markdown" : "text/plain";
  if (mimeType !== expected) throw new DocumentValidationError(`mimeType must be ${expected} for this file`);
  if (!Buffer.isBuffer(body) || !body.length || body.length > MAX_SELLER_DOCUMENT_BYTES) {
    throw new DocumentValidationError("Document must contain 1–20480 UTF-8 bytes");
  }
  let content: string;
  try { content = new TextDecoder("utf-8", { fatal: true }).decode(body); }
  catch { throw new DocumentValidationError("Document must contain valid UTF-8 text"); }
  if (!content.trim() || /\u0000/.test(content)) throw new DocumentValidationError("Document must contain readable text");
  return { filename, mimeType: expected, content, sha256: crypto.createHash("sha256").update(body).digest("hex") };
};

export const createSellerDocument = async (workspaceId: string, actorId: string, upload: SellerDocumentUpload) => {
  const id = crypto.randomUUID();
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const created = await client.query(
      `INSERT INTO seller_documents (id, workspace_id, filename, mime_type, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`, [id, workspaceId, upload.filename, upload.mimeType, actorId]
    );
    await client.query(
      `INSERT INTO seller_document_versions (workspace_id, document_id, version, content, sha256)
       VALUES ($1, $2, 1, $3, $4)`, [workspaceId, id, upload.content, upload.sha256]
    );
    await client.query("COMMIT");
    return mapDbRow(created.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
};

export const listSellerDocuments = async (workspaceId: string, page: number, limit: number) => {
  const [rows, total] = await Promise.all([
    postgres.query(
      `SELECT id, workspace_id, filename, mime_type, current_version, status, attempts, error_message,
              created_by, created_at, updated_at FROM seller_documents
       WHERE workspace_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`,
      [workspaceId, limit, (page - 1) * limit]
    ),
    postgres.query<{ total: number }>("SELECT count(*)::int AS total FROM seller_documents WHERE workspace_id = $1", [workspaceId])
  ]);
  return { data: mapDbRows(rows.rows), page, limit, total: total.rows[0].total };
};

export const getSellerDocument = async (workspaceId: string, id: string) => {
  const result = await postgres.query(
    `SELECT id, workspace_id, filename, mime_type, current_version, status, attempts, error_message,
            created_by, created_at, updated_at FROM seller_documents WHERE workspace_id = $1 AND id = $2`,
    [workspaceId, id]
  );
  return mapDbRow(result.rows[0]);
};

export const getSellerDocumentContent = async (workspaceId: string, id: string) => {
  const result = await postgres.query<{ filename: string; mime_type: string; content: string }>(
    `SELECT d.filename, d.mime_type, v.content FROM seller_documents d
     JOIN seller_document_versions v ON v.workspace_id = d.workspace_id AND v.document_id = d.id AND v.version = d.current_version
     WHERE d.workspace_id = $1 AND d.id = $2`, [workspaceId, id]
  );
  return result.rows[0] ?? null;
};

export const replaceSellerDocument = async (workspaceId: string, id: string, expectedVersion: number, upload: SellerDocumentUpload, actorId: string) => {
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ current_version: number }>(
      "SELECT current_version FROM seller_documents WHERE workspace_id = $1 AND id = $2 FOR UPDATE", [workspaceId, id]
    );
    if (!current.rows[0]) { await client.query("ROLLBACK"); return null; }
    if (current.rows[0].current_version !== expectedVersion) throw new DocumentConflictError("Document changed. Reload before replacing.");
    const nextVersion = expectedVersion + 1;
    await retireDocumentBackedCatalogItems(client, workspaceId, id, actorId);
    // Old chunks must never remain available to retrieval after replacement.
    await client.query("DELETE FROM seller_document_chunks WHERE workspace_id = $1 AND document_id = $2", [workspaceId, id]);
    await client.query(
      `INSERT INTO seller_document_versions (workspace_id, document_id, version, content, sha256)
       VALUES ($1, $2, $3, $4, $5)`, [workspaceId, id, nextVersion, upload.content, upload.sha256]
    );
    const updated = await client.query(
      `UPDATE seller_documents SET filename = $3, mime_type = $4, current_version = $5,
       status = 'queued', attempts = 0, processing_started_at = NULL, error_message = NULL, updated_at = now()
       WHERE workspace_id = $1 AND id = $2 RETURNING *`,
      [workspaceId, id, upload.filename, upload.mimeType, nextVersion]
    );
    await client.query("COMMIT");
    return mapDbRow(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
};

export const retrySellerDocument = async (workspaceId: string, id: string) => {
  const result = await postgres.query(
    `UPDATE seller_documents SET status = 'queued', attempts = 0, error_message = NULL,
     processing_started_at = NULL, updated_at = now()
     WHERE workspace_id = $1 AND id = $2 AND status = 'failed' RETURNING *`, [workspaceId, id]
  );
  if (result.rows[0]) return mapDbRow(result.rows[0]);
  const existing = await getSellerDocument(workspaceId, id);
  if (existing) throw new DocumentConflictError("Only failed documents can be retried");
  return null;
};

export const deleteSellerDocument = async (workspaceId: string, id: string, actorId: string) => {
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query("SELECT id FROM seller_documents WHERE workspace_id = $1 AND id = $2 FOR UPDATE", [workspaceId, id]);
    if (!current.rows[0]) { await client.query("ROLLBACK"); return false; }
    await retireDocumentBackedCatalogItems(client, workspaceId, id, actorId);
    await client.query("DELETE FROM seller_documents WHERE workspace_id = $1 AND id = $2", [workspaceId, id]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
};

export const listSellerDocumentSuggestions = async (workspaceId: string, id: string) => {
  const document = await getSellerDocument(workspaceId, id);
  if (!document) return null;
  const result = await postgres.query(
    `SELECT s.id, s.document_id, s.document_version, s.item_kind, s.payload, s.evidence_excerpt,
            s.status, s.accepted_item_id, s.reviewed_by, s.reviewed_at, s.created_at
     FROM seller_document_suggestions s JOIN seller_documents d
       ON d.workspace_id = s.workspace_id AND d.id = s.document_id AND d.current_version = s.document_version
     WHERE s.workspace_id = $1 AND s.document_id = $2 ORDER BY s.created_at, s.id`, [workspaceId, id]
  );
  return { document, data: mapDbRows(result.rows) };
};

export const reviewSellerDocumentSuggestion = async (
  workspaceId: string, documentId: string, suggestionId: string, actorId: string, input: unknown
) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new DocumentValidationError("Review must be an object");
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some(key => !["decision", "payload"].includes(key)) ||
      (body.decision !== "accept" && body.decision !== "reject")) {
    throw new DocumentValidationError("decision must be accept or reject");
  }
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{
      id: string; item_kind: string; payload: Record<string, unknown>; status: string;
    }>(
      `SELECT s.id, s.item_kind, s.payload, s.status FROM seller_document_suggestions s
       JOIN seller_documents d ON d.workspace_id = s.workspace_id AND d.id = s.document_id
         AND d.current_version = s.document_version
       WHERE s.workspace_id = $1 AND s.document_id = $2 AND s.id = $3 AND d.status = 'ready'
       FOR UPDATE OF s`, [workspaceId, documentId, suggestionId]
    );
    const suggestion = result.rows[0];
    if (!suggestion) { await client.query("ROLLBACK"); return null; }
    if (suggestion.status !== "pending") throw new DocumentConflictError("Suggestion was already reviewed");
    let acceptedItem: Record<string, unknown> | null = null;
    if (body.decision === "accept") {
      const kinds: Record<string, CatalogKind> = { offering: "offerings", partner: "partners", case_study: "case-studies" };
      const kind = kinds[suggestion.item_kind];
      const payload = validateCatalogInput(kind, body.payload ?? suggestion.payload);
      delete payload.reviewStatus;
      const sourceKind = isDeepStrictEqual(payload, suggestion.payload) ? "document_backed" : "seller_supplied";
      acceptedItem = await createCatalogItemInTransaction(client, kind, workspaceId, actorId, payload, sourceKind);
    }
    const updated = await client.query(
      `UPDATE seller_document_suggestions SET status = $4, accepted_item_id = $5,
       reviewed_by = $6, reviewed_at = now() WHERE workspace_id = $1 AND document_id = $2 AND id = $3 RETURNING *`,
      [workspaceId, documentId, suggestionId, body.decision === "accept" ? "accepted" : "rejected", acceptedItem?.id ?? null, actorId]
    );
    await client.query("COMMIT");
    return { suggestion: mapDbRow(updated.rows[0]), item: acceptedItem };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
};
