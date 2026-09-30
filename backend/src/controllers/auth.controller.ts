import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { postgres } from "../config/postgres.js";
import { IUser } from "../models/user.model.js";
import { mapDbRow } from "../utils/dbRows.js";
import { logActivity } from "../utils/logActivity.js";
import { sendPasswordResetEmail } from "../services/email.service.js";
import { getWorkspaceSettings, getWorkspaceSlug } from "../config/postgres.js";
import { DEFAULT_WORKSPACE_SETTINGS } from "../config/workspaceDefaults.js";



/* ================= LOGIN ================= */
export const loginUser = async (req: Request, res: Response) => {
    try {
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const { password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const result = await postgres.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = mapDbRow<IUser>(result.rows[0]);

        if (!user) {
            return res.status(400).json({
                message: "Invalid credentials"
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({
                message: "Your account is blocked. Please contact the administrator."
            });
        }

        if (!user.password) {
            return res.status(403).json({
                message: "Please set your password using the invite link sent to your email."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid credentials"
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await postgres.query("UPDATE users SET last_login = now(), updated_at = now() WHERE id = $1", [user.id]);

        const token = jwt.sign(
            { id: user.id, role: user.role, workspaceId: user.workspaceId },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        logActivity(user.id, "LOGIN", "/login", `${user.email} | ${user.role}`);

        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                workspaceId: user.workspaceId
            }
        });

    } catch {
        res.status(500).json({
            message: "Login failed"
        });
    }
};

/* Change own password (verifies old password) */
export const changeMyPassword = async (req: any, res: Response) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "Old password and new password (min 6 chars) are required" });
        }

        const userResult = await postgres.query("SELECT * FROM users WHERE id = $1", [req.userId]);
        const user = mapDbRow<IUser>(userResult.rows[0]);
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });

        const password = await bcrypt.hash(newPassword, 10);
        await postgres.query("UPDATE users SET password = $2, updated_at = now() WHERE id = $1", [user.id, password]);

        res.json({ message: "Password changed successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to change password" });
    }
};

export const logoutUser = async (req: any, res: Response) => {
    logActivity(req.userId, "LOGOUT", "/");
    res.json({ message: "Logged out" });
};

/* ================= FORGOT PASSWORD ================= */
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const result = await postgres.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = mapDbRow<IUser>(result.rows[0]);
        // Always return 200 to avoid email enumeration
        if (!user) return res.json({ message: "If that email exists, a reset link has been sent." });

        const rawToken = crypto.randomBytes(32).toString("hex");
        const resetToken = crypto.createHash("sha256").update(rawToken).digest("hex");
        await postgres.query(
            "UPDATE users SET password_reset_token = $2, password_reset_expiry = now() + interval '1 hour', updated_at = now() WHERE id = $1",
            [user.id, resetToken]
        );

        const workspace = await getWorkspaceSettings(user.workspaceId) || DEFAULT_WORKSPACE_SETTINGS;
        const workspaceSlug = await getWorkspaceSlug(user.workspaceId);
        await sendPasswordResetEmail(user.email, rawToken, workspace, workspaceSlug);
        res.json({ message: "If that email exists, a reset link has been sent." });
    } catch (error) {
        res.status(500).json({ message: "Failed to process request" });
    }
};

/* ================= SET / RESET PASSWORD (shared) ================= */
export const setPassword = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6)
            return res.status(400).json({ message: "Password must be at least 6 characters" });

        const hashed = crypto.createHash("sha256").update(String(token)).digest("hex");
        const result = await postgres.query(
            "SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expiry > now()",
            [hashed]
        );
        const user = mapDbRow<IUser>(result.rows[0]);

        if (!user) return res.status(400).json({ message: "Invalid or expired link" });

        const hashedPassword = await bcrypt.hash(password, 10);
        await postgres.query(
            "UPDATE users SET password = $2, password_reset_token = NULL, password_reset_expiry = NULL, updated_at = now() WHERE id = $1",
            [user.id, hashedPassword]
        );

        res.json({ message: "Password set successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to set password" });
    }
};

export const updateMyName = async (req: any, res: Response) => {
    try {
        const { name } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
        const result = await postgres.query(
            "UPDATE users SET name = $2, updated_at = now() WHERE id = $1 RETURNING id, name, email, role, workspace_id, last_login, is_blocked, created_at, updated_at",
            [req.userId, name.trim()]
        );
        res.json(mapDbRow(result.rows[0]));
    } catch {
        res.status(500).json({ message: "Failed to update name" });
    }
};

export const getMe = async (req: any, res: Response) => {
    try {
        const result = await postgres.query(
            "SELECT id, name, email, role, workspace_id, last_login, is_blocked, created_at, updated_at FROM users WHERE id = $1",
            [req.userId]
        );
        const user = mapDbRow(result.rows[0]);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json(user);

    } catch (error: any) {
        res.status(500).json({
            message: "Failed to fetch user",
            error: error.message
        });
    }
};
