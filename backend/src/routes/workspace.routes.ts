import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";
import {
  getCurrentWorkspace,
  getWorkspaceBranding,
  registerWorkspace,
  updateCurrentWorkspace
} from "../controllers/workspace.controller.js";

const router = express.Router();

router.post("/register", registerWorkspace);
router.get("/branding/:slug", getWorkspaceBranding);
router.get("/current", isAuth, getCurrentWorkspace);
router.put("/current", isAuth, isAdmin, updateCurrentWorkspace);

export default router;
