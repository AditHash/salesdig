import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";
import { patchCompanyProfile, readCompanyProfile } from "../controllers/companyProfile.controller.js";
import {
  getCurrentWorkspace,
  getWorkspaceBranding,
  patchCurrentWorkspacePreferences,
  registerWorkspace,
  updateCurrentWorkspace
} from "../controllers/workspace.controller.js";

const router = express.Router();

router.post("/register", registerWorkspace);
router.get("/branding/:slug", getWorkspaceBranding);
router.get("/current", isAuth, getCurrentWorkspace);
router.put("/current", isAuth, isAdmin, updateCurrentWorkspace);
router.patch("/current/preferences", isAuth, isAdmin, patchCurrentWorkspacePreferences);
router.get("/current/company-profile", isAuth, readCompanyProfile);
router.patch("/current/company-profile", isAuth, isAdmin, patchCompanyProfile);

export default router;
