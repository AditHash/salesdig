import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Footprint from "../models/footprint.model.js";
import { getWorkspaceSettings, getWorkspaceSlug } from "../config/postgres.js";
import { DEFAULT_WORKSPACE_SETTINGS } from "../config/workspaceDefaults.js";

/* All users */
export const getUsers = async (req: Request, res: Response) => {
    const workspaceId = (req as any).workspaceId;
    const users = await User.find({ workspaceId }).select("-password").lean();
    // inject hasPassword flag without exposing the hash
    const withFlag = await Promise.all(users.map(async u => {
        const full = await User.findOne({ _id: u._id, workspaceId }).select("password").lean() as any;
        return { ...u, hasPassword: !!full?.password };
    }));
    res.json(withFlag);
};

/* All footprints with pagination + filters */
export const getFootprints = async (req: Request, res: Response) => {
    const isExport = req.query.export === 'true';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = isExport ? 50000 : Math.min(1000, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const { action, dateFrom, dateTo, search, userId } = req.query;

    const workspaceUserIds = await User.find({ workspaceId: (req as any).workspaceId }).distinct("_id");
    const query: any = { userId: { $in: workspaceUserIds } };
    if (userId) {
        const belongsToWorkspace = workspaceUserIds.some(id => String(id) === String(userId));
        if (!belongsToWorkspace) return res.status(404).json({ message: "User not found" });
        query.userId = userId;
    }
    if (action) query.action = action;
    if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
        if (dateTo) query.createdAt.$lte = new Date(new Date(dateTo as string).setHours(23, 59, 59, 999));
    }
    if (search) {
        query.$or = [
            { action: { $regex: search, $options: 'i' } },
            { page: { $regex: search, $options: 'i' } },
            { meta: { $regex: search, $options: 'i' } }
        ];
    }

    const [data, total] = await Promise.all([
        Footprint.find(query).populate("userId", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit),
        Footprint.countDocuments(query)
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
};

/* Analysis KPIs — aggregated from DB, no record cap */
export const getAnalysisKpis = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        const workspaceUserIds = await User.find({ workspaceId: (req as any).workspaceId }).distinct("_id");
        const filter: any = { action: "PERFORM_ANALYSIS", userId: { $in: workspaceUserIds } };

        const [total, thisMonth, thisWeek, dailyRaw, monthlyRaw, perUserRaw] = await Promise.all([
            Footprint.countDocuments(filter),
            Footprint.countDocuments({ ...filter, createdAt: { $gte: startOfMonth } }),
            Footprint.countDocuments({ ...filter, createdAt: { $gte: startOfWeek } }),
            Footprint.aggregate([
                { $match: { ...filter, createdAt: { $gte: thirtyDaysAgo } } },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Footprint.aggregate([
                { $match: { ...filter, createdAt: { $gte: twelveMonthsAgo } } },
                { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Footprint.aggregate([
                { $match: filter },
                { $group: { _id: "$userId", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
                { $unwind: "$user" },
                { $project: { _id: 0, name: "$user.name", email: "$user.email", count: 1 } },
            ]),
        ]);

        // Fill gaps for daily (last 30 days)
        const dailyMap = new Map(dailyRaw.map((d: any) => [d._id, d.count]));
        const daily: { day: string; count: number }[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            daily.push({ day: key, count: (dailyMap.get(key) as number) || 0 });
        }

        // Fill gaps for monthly (last 12 months)
        const monthlyMap = new Map(monthlyRaw.map((d: any) => [d._id, d.count]));
        const monthly: { month: string; count: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            monthly.push({ month: key, count: (monthlyMap.get(key) as number) || 0 });
        }

        res.json({ total, thisMonth, thisWeek, daily, monthly, perUser: perUserRaw });
    } catch (err) {
        console.error("KPI error:", err);
        res.status(500).json({ message: "Failed to fetch KPIs" });
    }
};

/* General chart stats — aggregated from full DB, no record cap */
export const getFootprintStats = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(now.getDate() - 14);

        // Optional userId filter (reused by personal stats endpoint)
        const workspaceUserIds = await User.find({ workspaceId: (req as any).workspaceId }).distinct("_id");
        const baseFilter: any = { userId: { $in: workspaceUserIds } };
        if ((req as any)._statsUserId) {
            baseFilter.userId = new mongoose.Types.ObjectId((req as any)._statsUserId);
        }

        const [totalEvents, activityByDayRaw, pageDistRaw, actionBreakdownRaw, userSummaryRaw] = await Promise.all([
            Footprint.countDocuments(baseFilter),
            Footprint.aggregate([
                { $match: { ...baseFilter, createdAt: { $gte: fourteenDaysAgo } } },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Footprint.aggregate([
                { $match: baseFilter },
                { $group: { _id: "$page", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 6 },
            ]),
            Footprint.aggregate([
                { $match: baseFilter },
                { $group: { _id: "$action", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            // Only aggregate user summary when not filtered to a single user
            (req as any)._statsUserId ? Promise.resolve([]) :
            Footprint.aggregate([
                { $match: baseFilter },
                { $group: {
                    _id: "$userId",
                    count: { $sum: 1 },
                    lastSeen: { $max: "$createdAt" },
                }},
                { $sort: { count: -1 } },
                { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
                { $unwind: "$user" },
                { $project: { _id: 0, id: "$_id", name: "$user.name", email: "$user.email", count: 1, lastSeen: 1 } },
            ]),
        ]);

        // Fill gaps for activity by day (last 14 days)
        const dayMap = new Map(activityByDayRaw.map((d: any) => [d._id, d.count]));
        const activityByDay: { day: string; count: number }[] = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            activityByDay.push({ day: key, count: (dayMap.get(key) as number) || 0 });
        }

        const actions = actionBreakdownRaw.map((a: any) => a._id).sort();

        res.json({
            totalEvents,
            activityByDay,
            pageDistribution: pageDistRaw.map((p: any) => ({ name: p._id, value: p.count })),
            actionBreakdown: actionBreakdownRaw.map((a: any) => ({ action: a._id, count: a.count })),
            uniqueActions: actionBreakdownRaw.length,
            actions,
            userSummary: userSummaryRaw,
        });
    } catch (err) {
        console.error("Stats error:", err);
        res.status(500).json({ message: "Failed to fetch stats" });
    }
};

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendInviteEmail } from "../services/email.service.js";

/* Create User */
export const createUser = async (req: Request, res: Response) => {
    try {
        const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const { role } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: "Name and email are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

        const newUser = await User.create({
            name,
            email,
            password: "",
            role: role || "user",
            workspaceId: (req as any).workspaceId,
            passwordResetToken: hashedToken,
            passwordResetExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        try {
            const workspace = await getWorkspaceSettings((req as any).workspaceId) || DEFAULT_WORKSPACE_SETTINGS;
            const workspaceSlug = await getWorkspaceSlug((req as any).workspaceId);
            await sendInviteEmail(email, name, rawToken, workspace, workspaceSlug);
        } catch (emailErr) {
            await User.findByIdAndDelete(newUser._id);
            return res.status(500).json({ message: "Failed to send invite email. Please try again." });
        }

        res.status(201).json({
            message: "User created and invite sent",
            user: { _id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, createdAt: newUser.createdAt }
        });
    } catch (error) {
        console.error("Create User Error:", error);
        res.status(500).json({ message: "Failed to create user" });
    }
};

/* Resend Invite */
export const resendInvite = async (req: Request, res: Response) => {
    try {
        const user = await User.findOne({ _id: req.params.id, workspaceId: (req as any).workspaceId });
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.password) return res.status(400).json({ message: "User has already set their password" });

        const rawToken = crypto.randomBytes(32).toString("hex");
        user.passwordResetToken = crypto.createHash("sha256").update(rawToken).digest("hex");
        user.passwordResetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();

        const workspace = await getWorkspaceSettings(user.workspaceId) || DEFAULT_WORKSPACE_SETTINGS;
        const workspaceSlug = await getWorkspaceSlug(user.workspaceId);
        await sendInviteEmail(user.email, user.name, rawToken, workspace, workspaceSlug);
        res.json({ message: "Invite resent" });
    } catch (error) {
        res.status(500).json({ message: "Failed to resend invite" });
    }
};
export const toggleBlockStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { isBlocked } = req.body;

        const user = await User.findOneAndUpdate(
            { _id: id, workspaceId: (req as any).workspaceId },
            { isBlocked },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            message: `User ${isBlocked ? "blocked" : "unblocked"} successfully`,
            user
        });
    } catch (error) {
        console.error("Block User Error:", error);
        res.status(500).json({ message: "Failed to update user status" });
    }
};

/* Reset User Password */
export const resetUserPassword = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await User.findOneAndUpdate({ _id: id, workspaceId: (req as any).workspaceId }, { password: hashedPassword });

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: "Failed to reset password" });
    }
};
