import { Response } from "express";
import AnalysisReport from "../models/analysisReport.model.js";
import AnalysisRun from "../models/analysisRun.model.js";
import { AuthRequest } from "../middlewares/isAuth.js";
import { parseRunAnalysisInput } from "../schemas/analysisV2.schemas.js";
import { runOrchestratorAgent } from "../services/agents/orchestrator.agent.js";
import { logActivity } from "../utils/logActivity.js";
import { deleteVector } from "../services/rag/pgvector.client.js";

export const runAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const input = parseRunAnalysisInput(req.body);
    const result = await runOrchestratorAgent(req.userId, input, req.workspaceId);
    logActivity(req.userId, "PERFORM_ANALYSIS", "/", `${input.customerName} | ${input.companyDomain}`);
    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isInputError =
      message.includes("customerName is required") ||
      message.includes("companyDomain is required") ||
      message.includes("valid domain");
    const statusCode = isInputError ? 400 : 500;
    return res.status(statusCode).json({
      message: isInputError ? "Invalid request payload" : "Failed to run agentic analysis",
      error: message
    });
  }
};

export const getRunById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const run = await AnalysisRun.findOne({ _id: req.params.runId, workspaceId: req.workspaceId });
    if (!run) {
      return res.status(404).json({ message: "Run not found" });
    }
    if (req.userRole !== "admin" && run.userId !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ message: "Failed to fetch run", error: message });
  }
};

export const getMyReports = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const reports = await AnalysisReport.find({ userId: req.userId, workspaceId: req.workspaceId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(reports);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ message: "Failed to fetch reports", error: message });
  }
};

export const getAllReports = async (req: AuthRequest, res: Response) => {
  try {
    const page  = Math.max(1, parseInt(String(req.query.page  || "1")));
    const limit = Math.min(50, parseInt(String(req.query.limit || "20")));
    const skip  = (page - 1) * limit;
    const filter: Record<string, unknown> = { workspaceId: req.workspaceId, userId: { $ne: req.userId } };
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.search) {
      const re = new RegExp(String(req.query.search), "i");
      filter.$or = [{ customerName: re }, { companyDomain: re }];
    }
    const [reports, total] = await Promise.all([
      AnalysisReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AnalysisReport.countDocuments(filter),
    ]);

    // Manually join user info since userId is stored as String
    const User = (await import("../models/user.model.js")).default;
    const userIds = [...new Set(reports.map(r => r.userId))];
    const users = await User.find({ _id: { $in: userIds } }).select("name email").lean();
    const userMap = Object.fromEntries(users.map(u => [String(u._id), u]));

    const data = reports.map(r => ({
      ...r,
      userId: userMap[r.userId] ? { _id: r.userId, name: (userMap[r.userId] as any).name, email: (userMap[r.userId] as any).email } : r.userId,
    }));

    return res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ message: "Failed to fetch reports", error: message });
  }
};

export const getReportById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const report = await AnalysisReport.findOne({ _id: req.params.reportId, workspaceId: req.workspaceId });
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    if (req.userRole !== "admin" && String(report.userId) !== String(req.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    logActivity(req.userId, "VIEW_REPORT", `/history/${req.params.reportId}`, `${report.customerName} | ${report.companyDomain}`);
    return res.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ message: "Failed to fetch report", error: message });
  }
};

export const deleteReport = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const report = await AnalysisReport.findOneAndDelete({
      _id: req.params.reportId,
      userId: req.userId,
      workspaceId: req.workspaceId
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    deleteVector(String(report._id)).catch(error => console.error("Vector cleanup failed", error));
    logActivity(req.userId, "DELETE_REPORT", "/history", `${report.customerName} | ${report.companyDomain}`);
    return res.json({ message: "Report deleted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ message: "Failed to delete report", error: message });
  }
};

export const regenerateReport = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    // Only the owner can regenerate their own report
    const existing = await AnalysisReport.findOne({ _id: req.params.reportId, userId: req.userId, workspaceId: req.workspaceId }).lean() as any;
    if (!existing) return res.status(403).json({ message: "Not found or not authorized" });

    const result = await runOrchestratorAgent(req.userId as string, {
      customerName: existing.customerName,
      companyDomain: existing.companyDomain
    }, req.workspaceId, String(req.params.reportId));

    logActivity(req.userId as string, "REGENERATE_REPORT", `/history/${req.params.reportId}`, `${existing.customerName} | ${existing.companyDomain}`);
    return res.status(200).json({ ...result, reportId: req.params.reportId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ message: "Regeneration failed", error: message });
  }
};

export const getReportTraceByReportId = async (req: AuthRequest, res: Response) => {
  try {
    const report = await AnalysisReport.findOne({ _id: req.params.reportId, workspaceId: req.workspaceId });
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    const run = await AnalysisRun.findOne({ _id: report.runId, workspaceId: req.workspaceId });
    if (!run) {
      return res.status(404).json({ message: "Trace not found for report" });
    }

    return res.json({
      reportId: String(report._id),
      runId: String(run._id),
      status: run.status,
      overallConfidence: run.overallConfidence,
      durationMs: run.durationMs,
      agentRuns: run.agentRuns,
      validatedProfile: run.validatedProfile,
      finalRecommendations: run.finalRecommendations
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ message: "Failed to fetch trace", error: message });
  }
};
