import crypto from "node:crypto";
import { postgres } from "../config/postgres.js";
import { embedDocument } from "./llm/embedding.service.js";
import {
  DocumentExtractionValidationError, extractSellerDocumentSuggestions, validateDocumentSuggestions
} from "./sellerDocumentExtraction.service.js";

type Providers = {
  extract: (content: string) => Promise<unknown>;
  embed: (content: string) => Promise<number[]>;
};

const defaultProviders: Providers = { extract: extractSellerDocumentSuggestions, embed: embedDocument };

export const chunkSellerDocument = (content: string): string[] => {
  const chunks: string[] = [];
  for (let start = 0; start < content.length; start += 1600) {
    chunks.push(content.slice(start, start + 1800));
  }
  if (chunks.length > 16) throw new DocumentExtractionValidationError("Document exceeds chunk limit");
  return chunks;
};

const vectorLiteral = (values: number[]): string => {
  if (values.length !== 768 || values.some(value => !Number.isFinite(value))) {
    throw new DocumentExtractionValidationError("Embedding must contain 768 finite values");
  }
  return `[${values.join(",")}]`;
};

export const processNextSellerDocument = async (providers: Providers = defaultProviders): Promise<boolean> => {
  await postgres.query(
    `UPDATE seller_documents SET status = 'failed', error_message = 'Processing timed out; retry document.', updated_at = now()
     WHERE status = 'processing' AND processing_started_at < now() - interval '10 minutes' AND attempts >= 3`
  );
  const claim = await postgres.query<{
    id: string; workspace_id: string; current_version: number; attempts: number;
  }>(
    `UPDATE seller_documents SET status = 'processing', attempts = attempts + 1,
       processing_started_at = now(), error_message = NULL, updated_at = now()
     WHERE id = (SELECT id FROM seller_documents
                 WHERE (status = 'queued' OR (status = 'processing' AND processing_started_at < now() - interval '10 minutes'))
                   AND attempts < 3
                 ORDER BY updated_at, id LIMIT 1 FOR UPDATE SKIP LOCKED)
     RETURNING id, workspace_id, current_version, attempts`
  );
  const document = claim.rows[0];
  if (!document) return false;

  try {
    const version = await postgres.query<{ content: string }>(
      `SELECT content FROM seller_document_versions
       WHERE workspace_id = $1 AND document_id = $2 AND version = $3`,
      [document.workspace_id, document.id, document.current_version]
    );
    if (!version.rows[0]) throw new DocumentExtractionValidationError("Document version is missing");
    const content = version.rows[0].content;
    const chunks = chunkSellerDocument(content);
    const rawSuggestions = await providers.extract(content);
    const suggestions = validateDocumentSuggestions(rawSuggestions, content);
    const vectors = await Promise.all(chunks.map(chunk => providers.embed(chunk)));
    const embeddings = vectors.map(vectorLiteral);

    const client = await postgres.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<{ current_version: number; status: string }>(
        "SELECT current_version, status FROM seller_documents WHERE workspace_id = $1 AND id = $2 FOR UPDATE",
        [document.workspace_id, document.id]
      );
      if (!current.rows[0] || current.rows[0].current_version !== document.current_version || current.rows[0].status !== "processing") {
        await client.query("ROLLBACK");
        return true;
      }
      await client.query(
        "DELETE FROM seller_document_chunks WHERE workspace_id = $1 AND document_id = $2 AND document_version = $3",
        [document.workspace_id, document.id, document.current_version]
      );
      await client.query(
        `DELETE FROM seller_document_suggestions WHERE workspace_id = $1 AND document_id = $2
         AND document_version = $3 AND status = 'pending'`,
        [document.workspace_id, document.id, document.current_version]
      );
      for (const [index, chunk] of chunks.entries()) {
        await client.query(
          `INSERT INTO seller_document_chunks (id, workspace_id, document_id, document_version, chunk_index, content, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7::vector)`,
          [crypto.randomUUID(), document.workspace_id, document.id, document.current_version, index, chunk, embeddings[index]]
        );
      }
      for (const suggestion of suggestions) {
        await client.query(
          `INSERT INTO seller_document_suggestions
             (id, workspace_id, document_id, document_version, item_kind, payload, evidence_excerpt, fingerprint)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
           ON CONFLICT (document_id, document_version, fingerprint) DO NOTHING`,
          [crypto.randomUUID(), document.workspace_id, document.id, document.current_version,
            suggestion.kind, JSON.stringify(suggestion.payload), suggestion.evidenceExcerpt, suggestion.fingerprint]
        );
      }
      await client.query(
        `UPDATE seller_documents SET status = 'ready', error_message = NULL,
         processing_started_at = NULL, updated_at = now() WHERE workspace_id = $1 AND id = $2`,
        [document.workspace_id, document.id]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  } catch (error) {
    const message = error instanceof DocumentExtractionValidationError
      ? "Extracted suggestions failed validation. Review document and retry."
      : (error as any)?.status === 429 ? "Gemini quota exceeded. Retry later." : "Document processing failed. Retry later.";
    console.error("Seller document processing failed", { documentId: document.id, message });
    await postgres.query(
      `UPDATE seller_documents SET status = 'failed', error_message = $4,
       processing_started_at = NULL, updated_at = now()
       WHERE workspace_id = $1 AND id = $2 AND current_version = $3 AND status = 'processing'`,
      [document.workspace_id, document.id, document.current_version, message]
    );
  }
  return true;
};

export const startSellerDocumentWorker = (): void => {
  let active = false;
  const tick = async () => {
    if (active) return;
    active = true;
    try { await processNextSellerDocument(); }
    catch (error) { console.error("Seller document worker tick failed", error); }
    finally { active = false; }
  };
  void tick();
  setInterval(() => { void tick(); }, 5000).unref();
};
