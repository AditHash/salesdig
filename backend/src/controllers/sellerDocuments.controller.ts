import type { Response } from "express";
import type { AuthRequest } from "../middlewares/isAuth.js";
import {
  createSellerDocument, deleteSellerDocument, DocumentConflictError, DocumentValidationError,
  getSellerDocument, getSellerDocumentContent, listSellerDocuments, listSellerDocumentSuggestions,
  parseSellerDocumentUpload, replaceSellerDocument, retrySellerDocument, reviewSellerDocumentSuggestion
} from "../services/sellerDocuments.service.js";
import { CatalogValidationError } from "../services/sellerCatalog.service.js";

const scope = (req: AuthRequest, res: Response) => {
  if (!req.workspaceId || !req.userId) {
    res.status(401).json({ message: "Workspace context is missing" });
    return null;
  }
  return { workspaceId: req.workspaceId, userId: req.userId };
};

const failure = (res: Response, error: unknown, action: string) => {
  if (error instanceof DocumentValidationError) return res.status(400).json({ message: error.message });
  if (error instanceof CatalogValidationError) return res.status(400).json({ message: error.message });
  if (error instanceof DocumentConflictError) return res.status(409).json({ message: error.message });
  console.error(`Seller document ${action} failed`, error);
  return res.status(500).json({ message: `Could not ${action} seller document` });
};

const uploadFromRequest = (req: AuthRequest) => {
  let filename: string;
  try { filename = decodeURIComponent(String(req.headers["x-document-name"] ?? "")); }
  catch { throw new DocumentValidationError("Invalid document filename encoding"); }
  return parseSellerDocumentUpload(filename, req.headers["x-document-type"], req.body);
};

export const listDocuments = async (req: AuthRequest, res: Response) => {
  const context = scope(req, res); if (!context) return;
  try {
    const page = Math.max(1, Math.min(100000, Number.parseInt(String(req.query.page ?? "1"), 10) || 1));
    const limit = Math.max(1, Math.min(50, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20));
    return res.json(await listSellerDocuments(context.workspaceId, page, limit));
  } catch (error) { return failure(res, error, "load"); }
};

export const readDocument = async (req: AuthRequest, res: Response) => {
  const context = scope(req, res); if (!context) return;
  try {
    const document = await getSellerDocument(context.workspaceId, String(req.params.id));
    return document ? res.json(document) : res.status(404).json({ message: "Document not found" });
  } catch (error) { return failure(res, error, "load"); }
};

export const downloadDocument = async (req: AuthRequest, res: Response) => {
  const context = scope(req, res); if (!context) return;
  try {
    const document = await getSellerDocumentContent(context.workspaceId, String(req.params.id));
    if (!document) return res.status(404).json({ message: "Document not found" });
    res.setHeader("Content-Type", `${document.mime_type}; charset=utf-8`);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(document.content);
  } catch (error) { return failure(res, error, "download"); }
};

export const readSuggestions = async (req: AuthRequest, res: Response) => {
  const context = scope(req, res); if (!context) return;
  try {
    const result = await listSellerDocumentSuggestions(context.workspaceId, String(req.params.id));
    return result ? res.json(result) : res.status(404).json({ message: "Document not found" });
  } catch (error) { return failure(res, error, "load"); }
};

export const uploadDocument = async (req: AuthRequest, res: Response) => {
  const context = scope(req, res); if (!context) return;
  try {
    const created = await createSellerDocument(context.workspaceId, context.userId, uploadFromRequest(req));
    return res.status(201).json(created);
  } catch (error) { return failure(res, error, "upload"); }
};

export const replaceDocument = async (req: AuthRequest, res: Response) => {
  const context = scope(req, res); if (!context) return;
  try {
    const version = Number(req.headers["x-document-version"]);
    if (!Number.isSafeInteger(version) || version < 1) throw new DocumentValidationError("x-document-version must be a positive integer");
    const updated = await replaceSellerDocument(context.workspaceId, String(req.params.id), version, uploadFromRequest(req), context.userId);
    return updated ? res.json(updated) : res.status(404).json({ message: "Document not found" });
  } catch (error) { return failure(res, error, "replace"); }
};

export const retryDocument = async (req: AuthRequest, res: Response) => {
  const context = scope(req, res); if (!context) return;
  try {
    const updated = await retrySellerDocument(context.workspaceId, String(req.params.id));
    return updated ? res.json(updated) : res.status(404).json({ message: "Document not found" });
  } catch (error) { return failure(res, error, "retry"); }
};

export const removeDocument = async (req: AuthRequest, res: Response) => {
  const context = scope(req, res); if (!context) return;
  try {
    const deleted = await deleteSellerDocument(context.workspaceId, String(req.params.id), context.userId);
    return deleted ? res.json({ message: "Document deleted" }) : res.status(404).json({ message: "Document not found" });
  } catch (error) { return failure(res, error, "delete"); }
};

export const reviewSuggestion = async (req: AuthRequest, res: Response) => {
  const context = scope(req, res); if (!context) return;
  try {
    const reviewed = await reviewSellerDocumentSuggestion(
      context.workspaceId, String(req.params.id), String(req.params.suggestionId), context.userId, req.body
    );
    return reviewed ? res.json(reviewed) : res.status(404).json({ message: "Suggestion not found" });
  } catch (error) { return failure(res, error, "review"); }
};
