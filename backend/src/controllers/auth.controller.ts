import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/user.model.js";
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

        const user = await User.findOne({ email });

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
        await user.save();

        const token = jwt.sign(
            { id: user._id, role: user.role, workspaceId: user.workspaceId },
            process.env.JWT_SECRET as string,
            { expiresIn: "7d" }
        );

        logActivity(String(user._id), "LOGIN", "/login", `${user.email} | ${user.role}`);

        return res.json({
            token,
            user: {
                id: user._id,
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

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

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
        const user = await User.findOne({ email });
        // Always return 200 to avoid email enumeration
        if (!user) return res.json({ message: "If that email exists, a reset link has been sent." });

        const rawToken = crypto.randomBytes(32).toString("hex");
        user.passwordResetToken = crypto.createHash("sha256").update(rawToken).digest("hex");
        user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

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
        const user = await User.findOne({
            passwordResetToken: hashed,
            passwordResetExpiry: { $gt: new Date() },
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired link" });

        user.password = await bcrypt.hash(password, 10);
        user.passwordResetToken = undefined;
        user.passwordResetExpiry = undefined;
        await user.save();

        res.json({ message: "Password set successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to set password" });
    }
};

export const updateMyName = async (req: any, res: Response) => {
    try {
        const { name } = req.body;
        if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
        const user = await User.findByIdAndUpdate(req.userId, { name: name.trim() }, { new: true }).select("-password");
        res.json(user);
    } catch {
        res.status(500).json({ message: "Failed to update name" });
    }
};

export const getMe = async (req: any, res: Response) => {
    try {
        const user = await User.findById(req.userId).select("-password");

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
