import type { Response } from "express";
import type { AuthRequest } from "../middlewares/isAuth.js";
import { runOrchestratorAgent } from "../services/agents/orchestrator.agent.js";
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
    const result = await runOrchestratorAgent(actor.userId, {
      customerName: account.name, companyDomain: account.normalizedDomain
    }, actor.workspaceId, undefined, account.id);
    return res.status(201).json(result);
  } catch (error) {
    if ((error as any)?.code === "23505") return res.status(409).json({ message: "Research is already running for this account" });
    if (error instanceof TargetValidationError) return failure(res, error, "research");
    console.error("Target research failed", { accountId: req.params.id, message: error instanceof Error ? error.message : "Unknown error" });
    return res.status(500).json({ message: "Target research failed. Open account history for run status." });
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
