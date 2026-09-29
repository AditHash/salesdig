import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";
import {
  deleteReport,
  getMyReports,
  getAllReports,
  getReportById,
  getReportTraceByReportId,
  getRunById,
  runAnalysis,
  regenerateReport
} from "../controllers/analysisV2.controller.js";
import { generateReportPdf } from "../controllers/pdf.controller.js";

const router = express.Router();

router.use(isAuth);

router.post("/run", runAnalysis);
router.get("/run/:runId", getRunById);
router.get("/reports", getMyReports);
router.get("/admin/reports", isAdmin, getAllReports);
router.get("/report/:reportId", getReportById);
router.delete("/report/:reportId", deleteReport);
router.post("/report/:reportId/regenerate", regenerateReport);
router.get("/report/:reportId/pdf", generateReportPdf);
router.get("/report/:reportId/trace", isAdmin, getReportTraceByReportId);

export default router;
