import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middlewares/isAuth.js";
import { getWorkspaceSettings, getWorkspaceSettingsBySlug, postgres, saveWorkspaceSettings } from "../config/postgres.js";
import { DEFAULT_WORKSPACE_SETTINGS, parseWorkspaceSettings } from "../config/workspaceDefaults.js";

export const registerWorkspace = async (req: Request, res: Response) => {
  const companyName = typeof req.body?.companyName === "string" ? req.body.companyName.trim() : "";
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (companyName.length < 2 || companyName.length > 80 || !name || name.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: "Enter a company name, your name, a valid email, and a password of at least 8 characters." });
  }
  const existing = await postgres.query("SELECT 1 FROM users WHERE email = $1", [email]);
  if (existing.rowCount) return res.status(409).json({ message: "An account with this email already exists." });

  const baseSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "sales-team";
  const slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;
  const workspaceId = crypto.randomUUID();
  const settings = {
    ...DEFAULT_WORKSPACE_SETTINGS,
    companyName,
    companyDescription: `${companyName} sales team researching target companies and planning customer engagements.`
  };
  const client = await postgres.connect();
  const userId = crypto.randomUUID();

  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO workspaces (id, slug, settings) VALUES ($1, $2, $3::jsonb)",
      [workspaceId, slug, JSON.stringify(settings)]
    );
    await client.query(
      `INSERT INTO users (id, name, email, password, role, workspace_id)
       VALUES ($1, $2, $3, $4, 'admin', $5)`,
      [userId, name, email, await bcrypt.hash(password, 12), workspaceId]
    );
    await client.query("COMMIT");

    return res.status(201).json({
      message: "Workspace created. Sign in to customize your company settings.",
      workspace: { id: workspaceId, slug, settings },
      user: { id: userId, name, email, role: "admin" }
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if ((error as any)?.code === "23505") {
      return res.status(409).json({ message: "An account or workspace with those details already exists." });
    }
    console.error("Workspace registration failed", error);
    return res.status(500).json({ message: "Could not create workspace" });
  } finally {
    client.release();
  }
};

export const getCurrentWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.workspaceId) return res.status(401).json({ message: "Workspace context is missing" });
    const settings = await getWorkspaceSettings(req.workspaceId);
    if (!settings) return res.status(404).json({ message: "Workspace not found" });
    return res.json(settings);
  } catch (error) {
    console.error("Workspace settings read failed", error);
    return res.status(500).json({ message: "Failed to load workspace settings" });
  }
};

export const updateCurrentWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.workspaceId) return res.status(401).json({ message: "Workspace context is missing" });
    const settings = parseWorkspaceSettings(req.body);
    const saved = await saveWorkspaceSettings(req.workspaceId, settings);
    if (!saved) return res.status(404).json({ message: "Workspace not found" });
    return res.json(saved);
  } catch (error) {
    if (error instanceof Error && /must be/.test(error.message)) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Workspace settings update failed", error);
    return res.status(500).json({ message: "Failed to update workspace settings" });
  }
};

export const getWorkspaceBranding = async (req: Request, res: Response) => {
  try {
    const settings = await getWorkspaceSettingsBySlug(String(req.params.slug));
    if (!settings) return res.status(404).json({ message: "Workspace not found" });
    return res.json({
      companyName: settings.companyName,
      productName: settings.productName,
      tagline: settings.tagline,
      primaryColor: settings.primaryColor,
      accentColor: settings.accentColor
    });
  } catch (error) {
    console.error("Workspace branding read failed", error);
    return res.status(500).json({ message: "Failed to load workspace branding" });
  }
};
