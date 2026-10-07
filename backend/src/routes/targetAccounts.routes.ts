import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
  createTarget, linkTargetReport, listTargets, patchTarget,
  readTarget, readTargetHistory, researchTarget
} from "../controllers/targetAccounts.controller.js";

const router = express.Router();
router.use(isAuth);
router.get("/", listTargets);
router.post("/", createTarget);
router.get("/:id", readTarget);
router.patch("/:id", patchTarget);
router.get("/:id/history", readTargetHistory);
router.post("/:id/research", researchTarget);
router.post("/:id/link-report", linkTargetReport);

export default router;
