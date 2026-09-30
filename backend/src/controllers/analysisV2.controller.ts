import { Response } from "express";
import { postgres } from "../config/postgres.js";
import { AuthRequest } from "../middlewares/isAuth.js";
import { parseRunAnalysisInput } from "../schemas/analysisV2.schemas.js";
import { runOrchestratorAgent } from "../services/agents/orchestrator.agent.js";
import { logActivity } from "../utils/logActivity.js";
import { deleteVector } from "../services/rag/pgvector.client.js";
import { mapDbRow, mapDbRows } from "../utils/dbRows.js";
import { IAnalysisReport } from "../models/analysisReport.model.js";
import { IAnalysisRun } from "../models/analysisRun.model.js";

export const runAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const input = parseRunAnalysisInput(req.body);
    const result = await runOrchestratorAgent(req.userId, input, req.workspaceId);
    logActivity(req.userId, "PERFORM_ANALYSIS", "/", `${input.customerName} | ${input.companyDomain}`);
    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isInputError = message.includes("customerName is required") || message.includes("companyDomain is required") || message.includes("valid domain");
    return res.status(isInputError ? 400 : 500).json({
      message: isInputError ? "Invalid request payload" : "Failed to run agentic analysis",
      error: message
    });
  }
};

export const getRunById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const result = await postgres.query(
      "SELECT * FROM analysis_runs WHERE id = $1 AND workspace_id = $2",
      [req.params.runId, req.workspaceId]
    );
    const run = mapDbRow<IAnalysisRun>(result.rows[0]);
    if (!run) return res.status(404).json({ message: "Run not found" });
    if (req.userRole !== "admin" && run.userId !== req.userId) return res.status(403).json({ message: "Forbidden" });
    return res.json(run);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch run", error: error instanceof Error ? error.message : String(error) });
  }
};

export const getMyReports = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const result = await postgres.query(
      "SELECT * FROM analysis_reports WHERE user_id = $1 AND workspace_id = $2 ORDER BY created_at DESC",
      [req.userId, req.workspaceId]
    );
    return res.json(mapDbRows<IAnalysisReport>(result.rows));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch reports", error: error instanceof Error ? error.message : String(error) });
  }
};

export const getAllReports = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
    const offset = (page - 1) * limit;
    const values: unknown[] = [req.workspaceId];
    const filters = ["r.workspace_id = $1"];
    if (req.query.userId) {
      values.push(String(req.query.userId));
      filters.push(`r.user_id = $${values.length}`);
    } else if (req.userId) {
      values.push(req.userId);
      filters.push(`r.user_id <> $${values.length}`);
    }
    if (req.query.search) {
      values.push(`%${String(req.query.search)}%`);
      filters.push(`(r.customer_name ILIKE $${values.length} OR r.company_domain ILIKE $${values.length})`);
    }
    const where = filters.join(" AND ");
    const [reportsResult, countResult] = await Promise.all([
      postgres.query(
        `SELECT r.*, jsonb_build_object('_id', u.id, 'name', u.name, 'email', u.email) AS owner
         FROM analysis_reports r JOIN users u ON u.id = r.user_id
         WHERE ${where} ORDER BY r.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      ),
      postgres.query(`SELECT count(*)::int AS total FROM analysis_reports r WHERE ${where}`, values)
    ]);
    const total = countResult.rows[0]?.total ?? 0;
    const data = mapDbRows<IAnalysisReport & { owner: unknown }>(reportsResult.rows).map(report => ({
      ...report,
      userId: report.owner
    }));
    return res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch reports", error: error instanceof Error ? error.message : String(error) });
  }
};

export const getReportById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const result = await postgres.query("SELECT * FROM analysis_reports WHERE id = $1 AND workspace_id = $2", [req.params.reportId, req.workspaceId]);
    const report = mapDbRow<IAnalysisReport>(result.rows[0]);
    if (!report) return res.status(404).json({ message: "Report not found" });
    if (req.userRole !== "admin" && report.userId !== req.userId) return res.status(403).json({ message: "Forbidden" });
    logActivity(req.userId, "VIEW_REPORT", `/history/${req.params.reportId}`, `${report.customerName} | ${report.companyDomain}`);
    return res.json(report);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch report", error: error instanceof Error ? error.message : String(error) });
  }
};

export const deleteReport = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const result = await postgres.query(
      "DELETE FROM analysis_reports WHERE id = $1 AND user_id = $2 AND workspace_id = $3 RETURNING id, customer_name, company_domain",
      [req.params.reportId, req.userId, req.workspaceId]
    );
    const report = result.rows[0];
    if (!report) return res.status(404).json({ message: "Report not found" });
    deleteVector(report.id).catch(error => console.error("Vector cleanup failed", error));
    logActivity(req.userId, "DELETE_REPORT", "/history", `${report.customer_name} | ${report.company_domain}`);
    return res.json({ message: "Report deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete report", error: error instanceof Error ? error.message : String(error) });
  }
};

export const regenerateReport = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const result = await postgres.query(
      "SELECT customer_name, company_domain FROM analysis_reports WHERE id = $1 AND user_id = $2 AND workspace_id = $3",
      [req.params.reportId, req.userId, req.workspaceId]
    );
    const existing = result.rows[0];
    if (!existing) return res.status(403).json({ message: "Not found or not authorized" });
    const report = { customerName: existing.customer_name, companyDomain: existing.company_domain };
    const generated = await runOrchestratorAgent(req.userId, report, req.workspaceId, String(req.params.reportId));
    logActivity(req.userId, "REGENERATE_REPORT", `/history/${req.params.reportId}`, `${report.customerName} | ${report.companyDomain}`);
    return res.status(200).json({ ...generated, reportId: req.params.reportId });
  } catch (error) {
    return res.status(500).json({ message: "Regeneration failed", error: error instanceof Error ? error.message : String(error) });
  }
};

export const getReportTraceByReportId = async (req: AuthRequest, res: Response) => {
  try {
    const result = await postgres.query(
      `SELECT r.id AS report_id, a.* FROM analysis_reports r
       JOIN analysis_runs a ON a.id = r.run_id
       WHERE r.id = $1 AND r.workspace_id = $2`,
      [req.params.reportId, req.workspaceId]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ message: "Trace not found for report" });
    const run = mapDbRow<IAnalysisRun>(row)!;
    return res.json({
      reportId: row.report_id,
      runId: run.id,
      status: run.status,
      overallConfidence: run.overallConfidence,
      durationMs: run.durationMs,
      agentRuns: run.agentRuns,
      validatedProfile: run.validatedProfile,
      finalRecommendations: run.finalRecommendations
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch trace", error: error instanceof Error ? error.message : String(error) });
  }
};
