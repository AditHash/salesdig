import express from "express";
import { readDashboard, readDrafts, generateDraft, updateDraft, exportAccount } from '../controllers/salesPreparation.controller.js';
import isAuth from "../middlewares/isAuth.js";
import {
  createTarget, linkTargetReport, listTargets, patchTarget,
  readTarget, readTargetHistory, researchTarget, readTargetResearchRun,
  readTargetEvidence, readLatestTargetEvidence, readTargetIntelligence, readTargetSource, retryTargetResearch,
  matchTargetOpportunities, readTargetOpportunities
} from "../controllers/targetAccounts.controller.js";

const router = express.Router();
router.use(isAuth);
router.get('/dashboard', readDashboard);
router.get("/", listTargets);
router.post("/", createTarget);
router.get("/:id", readTarget);
router.patch("/:id", patchTarget);
router.get("/:id/history", readTargetHistory);
router.get('/:id/drafts', readDrafts);
router.post('/:id/drafts', generateDraft);
router.patch('/:id/drafts/:draftId', updateDraft);
router.get('/:id/export', exportAccount);
router.post("/:id/research", researchTarget);
router.get("/:id/intelligence", readTargetIntelligence);
router.post("/:id/opportunities", matchTargetOpportunities);
router.get("/:id/opportunities", readTargetOpportunities);
router.get("/:id/research/latest/evidence", readLatestTargetEvidence);
router.get("/:id/research/:runId", readTargetResearchRun);
router.get("/:id/research/:runId/evidence", readTargetEvidence);
router.get("/:id/research/:runId/sources/:sourceId", readTargetSource);
router.post("/:id/research/:runId/retry", retryTargetResearch);
router.post("/:id/link-report", linkTargetReport);

export default router;
