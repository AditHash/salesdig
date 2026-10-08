import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
  createTarget, linkTargetReport, listTargets, patchTarget,
  readTarget, readTargetHistory, researchTarget, readTargetResearchRun,
  readTargetEvidence, readLatestTargetEvidence, readTargetSource, retryTargetResearch
} from "../controllers/targetAccounts.controller.js";

const router = express.Router();
router.use(isAuth);
router.get("/", listTargets);
router.post("/", createTarget);
router.get("/:id", readTarget);
router.patch("/:id", patchTarget);
router.get("/:id/history", readTargetHistory);
router.post("/:id/research", researchTarget);
router.get("/:id/research/latest/evidence", readLatestTargetEvidence);
router.get("/:id/research/:runId", readTargetResearchRun);
router.get("/:id/research/:runId/evidence", readTargetEvidence);
router.get("/:id/research/:runId/sources/:sourceId", readTargetSource);
router.post("/:id/research/:runId/retry", retryTargetResearch);
router.post("/:id/link-report", linkTargetReport);

export default router;
