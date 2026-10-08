import type { Response } from "express";
import type { AuthRequest } from "../middlewares/isAuth.js";
import {
  queueAccountResearch, readAccountResearch, readLatestResearchEvidence, readResearchEvidence,
  readResearchSourceContent, retryAccountResearch
} from "../services/research/researchJobs.service.js";
import {
  TargetConflictError, TargetForbiddenError, TargetValidationError, createTargetAccount,
  getTargetAccount, getTargetHistory, linkLegacyReport, listTargetAccounts,
  updateTargetAccount, validateTargetInput
} from "../services/targetAccounts.service.js";

const scope = (req: AuthRequest, res: Response) => {
  if (!req.userId || !req.workspaceId) { res.status(401).json({ message: "Workspace context is missing" }); return null; }
  return { workspaceId: req.workspaceId, userId: req.userId, isAdmin: req.userRole === "admin" };
};

const failure = (res: Response, error: unknown, action: string) => {
  if (error instanceof TargetValidationError) return res.status(400).json({ message: error.message });
  if (error instanceof TargetForbiddenError) return res.status(403).json({ message: error.message });
  if (error instanceof TargetConflictError || (error as any)?.code === "23505") {
    return res.status(409).json({ message: error instanceof TargetConflictError ? error.message : "An active account with this name and domain already exists" });
  }
  console.error(`Target account ${action} failed`, error);
  return res.status(500).json({ message: `Could not ${action} target account` });
};

export const listTargets = async (req: AuthRequest, res: Response) => {
  const actor = scope(req, res); if (!actor) return;
  try {
    const page = Math.max(1, Math.min(100000, Number.parseInt(String(req.query.page ?? "1"), 10) || 1));
    const limit = Math.max(1, Math.min(50, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20));
    const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 120) : "";
    return res.json(await listTargetAccounts(actor.workspaceId, page, limit, search, req.query.includeArchived === "true"));
  } catch (error) { return failure(res, error, "list"); }
};

export const readTarget = async (req: AuthRequest, res: Response) => {
  const actor = scope(req, res); if (!actor) return;
  try {
    const account = await getTargetAccount(actor.workspaceId, String(req.params.id));
    return account ? res.json(account) : res.status(404).json({ message: "Target account not found" });
  } catch (error) { return failure(res, error, "read"); }
};

export const createTarget = async (req: AuthRequest, res: Response) => {
  const actor = scope(req, res); if (!actor) return;
  try {
    const input = validateTargetInput(req.body);
    return res.status(201).json(await createTargetAccount(actor.workspaceId, actor.userId, actor.isAdmin, input));
  } catch (error) { return failure(res, error, "create"); }
};

export const patchTarget = async (req: AuthRequest, res: Response) => {
  const actor = scope(req, res); if (!actor) return;
  try {
    const input = validateTargetInput(req.body, true);
    const account = await updateTargetAccount(actor.workspaceId, actor.userId, actor.isAdmin, String(req.params.id), input);
    return account ? res.json(account) : res.status(404).json({ message: "Target account not found" });
  } catch (error) { return failure(res, error, "update"); }
};

export const readTargetHistory = async (req: AuthRequest, res: Response) => {
  const actor = scope(req, res); if (!actor) return;
  try {
    const id = String(req.params.id);
    const account = await getTargetAccount(actor.workspaceId, id);
    if (!account) return res.status(404).json({ message: "Target account not found" });
    return res.json(await getTargetHistory(actor.workspaceId, id, actor.userId, actor.isAdmin));
  } catch (error) { return failure(res, error, "read history for"); }
};

export const researchTarget = async (req: AuthRequest, res: Response) => {
  const actor = scope(req, res); if (!actor) return;
  try {
    if (req.body && Object.keys(req.body).length) throw new TargetValidationError("Research request must not override account identity");
    const account = await getTargetAccount(actor.workspaceId, String(req.params.id));
    if (!account) return res.status(404).json({ message: "Target account not found" });
    if (account.archivedAt) return res.status(409).json({ message: "Restore account before researching" });
    const result = await queueAccountResearch(actor.workspaceId, account.id, actor.userId, {
      customerName: account.name, companyDomain: account.normalizedDomain
    });
    return res.status(202).json(result);
  } catch (error) {
    if ((error as any)?.code === "23505") return res.status(409).json({ message: "Research is already running for this account" });
    if (error instanceof TargetValidationError) return failure(res, error, "research");
    console.error("Target research failed", { accountId: req.params.id, message: error instanceof Error ? error.message : "Unknown error" });
    return res.status(500).json({ message: "Could not queue target research." });
  }
};

export const readTargetResearchRun = async (req: AuthRequest, res: Response) => {
  const actor = scope(req, res); if (!actor) return;
  try {
    const run = await readAccountResearch(actor.workspaceId, String(req.params.id), String(req.params.runId));
    return run ? res.json(run) : res.status(404).json({ message: "Research run not found" });
  } catch (error) { return failure(res, error, "read research for"); }
};

export const readTargetEvidence = async (req: AuthRequest, res: Response) => {
  const actor = scope(req, res); if (!actor) return;
  try {
    const evidence = await readResearchEvidence(actor.workspaceId, String(req.params.id), String(req.params.runId));
    return evidence ? res.json(evidence) : res.status(404).json({ message: "Research evidence not found" });
  } catch (error) { return failure(res, error, "read evidence for"); }
};

export const readLatestTargetEvidence = async (req: AuthRequest, res: Response) => {
  const actor = scope(req, res); if (!actor) return;
  try {
    const account = await getTargetAccount(actor.workspaceId, String(req.params.id));
    if (!account) return res.status(404).json({ message: "Target account not found" });
    const evidence = await readLatestResearchEvidence(actor.workspaceId, account.id);
    return evidence ? res.json(evidence) : res.json({ run: null, sources: [], claims: [] });
  } catch (error) { return failure(res, error, "read evidence for"); }
};

export const readTargetSource = async (req: AuthRequest, res: Response) => {
  const actor = scope(req, res); if (!actor) return;
  try {
    const source = await readResearchSourceContent(actor.workspaceId, String(req.params.id),
      String(req.params.runId), String(req.params.sourceId));
    return source ? res.json(source) : res.status(404).json({ message: "Research source not found" });
  } catch (error) { return failure(res, error, "read source for"); }
};

export const retryTargetResearch = async (req: AuthRequest, res: Response) => {
  const actor = scope(req, res); if (!actor) return;
  try {
    const account = await getTargetAccount(actor.workspaceId, String(req.params.id));
    if (!account) return res.status(404).json({ message: "Target account not found" });
    if (account.archivedAt) return res.status(409).json({ message: "Restore account before researching" });
    const result = await retryAccountResearch(actor.workspaceId, String(req.params.id),
      String(req.params.runId), actor.userId, actor.isAdmin);
    return result ? res.status(202).json(result) : res.status(404).json({ message: "Retryable research run not found" });
  } catch (error) {
    if ((error as any)?.code === "23505") return res.status(409).json({ message: "Research is already running for this account" });
    return failure(res, error, "retry research for");
  }
};

export const linkTargetReport = async (req: AuthRequest, res: Response) => {
  const actor = scope(req, res); if (!actor) return;
  try {
    const reportId = req.body?.reportId;
    if (typeof reportId !== "string" || !reportId.trim() || Object.keys(req.body ?? {}).some(key => key !== "reportId")) {
      throw new TargetValidationError("reportId is required");
    }
    const result = await linkLegacyReport(actor.workspaceId, String(req.params.id), reportId, actor.userId);
    return result ? res.json(result) : res.status(404).json({ message: "Account or owned report not found" });
  } catch (error) { return failure(res, error, "link report to"); }
};
