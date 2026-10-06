import type { Response } from "express";
import type { AuthRequest } from "../middlewares/isAuth.js";
import {
  CatalogValidationError, createCatalogItem, getCatalogItem, getCatalogVersions,
  isCatalogKind, listCatalog, updateCatalogItem
} from "../services/sellerCatalog.service.js";

const context = (req: AuthRequest, res: Response) => {
  const kind = String(req.params.kind);
  if (!isCatalogKind(kind)) {
    res.status(404).json({ message: "Catalog section not found" });
    return null;
  }
  if (!req.userId || !req.workspaceId) {
    res.status(401).json({ message: "Workspace context is missing" });
    return null;
  }
  return { kind, userId: req.userId, workspaceId: req.workspaceId };
};

const failure = (res: Response, error: unknown, action: string) => {
  if (error instanceof CatalogValidationError) return res.status(400).json({ message: error.message });
  console.error(`Seller catalog ${action} failed`, error);
  return res.status(500).json({ message: `Could not ${action} seller catalog` });
};

export const listSellerCatalog = async (req: AuthRequest, res: Response) => {
  const scope = context(req, res);
  if (!scope) return;
  try {
    const page = Math.max(1, Math.min(100000, Number.parseInt(String(req.query.page ?? "1"), 10) || 1));
    const limit = Math.max(1, Math.min(50, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20));
    const includeArchived = req.query.includeArchived === "true";
    return res.json(await listCatalog(scope.kind, scope.workspaceId, page, limit, includeArchived));
  } catch (error) { return failure(res, error, "load"); }
};

export const readSellerCatalogItem = async (req: AuthRequest, res: Response) => {
  const scope = context(req, res);
  if (!scope) return;
  try {
    const item = await getCatalogItem(scope.kind, scope.workspaceId, String(req.params.id));
    return item ? res.json(item) : res.status(404).json({ message: "Catalog item not found" });
  } catch (error) { return failure(res, error, "load"); }
};

export const readSellerCatalogVersions = async (req: AuthRequest, res: Response) => {
  const scope = context(req, res);
  if (!scope) return;
  try {
    const versions = await getCatalogVersions(scope.kind, scope.workspaceId, String(req.params.id));
    return versions ? res.json({ data: versions }) : res.status(404).json({ message: "Catalog item not found" });
  } catch (error) { return failure(res, error, "load"); }
};

export const createSellerCatalogItem = async (req: AuthRequest, res: Response) => {
  const scope = context(req, res);
  if (!scope) return;
  try {
    return res.status(201).json(await createCatalogItem(scope.kind, scope.workspaceId, scope.userId, req.body));
  } catch (error) { return failure(res, error, "create"); }
};

export const patchSellerCatalogItem = async (req: AuthRequest, res: Response) => {
  const scope = context(req, res);
  if (!scope) return;
  try {
    const result = await updateCatalogItem(scope.kind, scope.workspaceId, scope.userId, String(req.params.id), req.body);
    if (result === "stale") return res.status(409).json({ message: "Catalog item changed. Reload before saving." });
    return result ? res.json(result) : res.status(404).json({ message: "Catalog item not found" });
  } catch (error) { return failure(res, error, "update"); }
};
