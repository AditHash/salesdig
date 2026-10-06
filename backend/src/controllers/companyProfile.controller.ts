import type { Response } from "express";
import type { AuthRequest } from "../middlewares/isAuth.js";
import { getCompanyProfile, parseCompanyProfilePatch, ProfileValidationError, updateCompanyProfile } from "../services/companyProfile.service.js";

export const readCompanyProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId || !req.workspaceId) return res.status(401).json({ message: "Workspace context is missing" });
    const profile = await getCompanyProfile(req.userId, req.workspaceId);
    return profile ? res.json(profile) : res.status(404).json({ message: "Workspace not found" });
  } catch (error) {
    console.error("Company profile read failed", error);
    return res.status(500).json({ message: "Could not load company profile" });
  }
};

export const patchCompanyProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId || !req.workspaceId) return res.status(401).json({ message: "Workspace context is missing" });
    const patch = parseCompanyProfilePatch(req.body);
    const result = await updateCompanyProfile(req.userId, req.workspaceId, patch);
    if (result === "forbidden") return res.status(403).json({ message: "Admin access only" });
    if (result === "stale") return res.status(409).json({ message: "Company profile changed. Reload before saving." });
    return result ? res.json(result) : res.status(404).json({ message: "Workspace not found" });
  } catch (error) {
    if (error instanceof ProfileValidationError) return res.status(400).json({ message: error.message });
    console.error("Company profile update failed", error);
    return res.status(500).json({ message: "Could not save company profile" });
  }
};
