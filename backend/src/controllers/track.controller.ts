import { Request, Response } from "express";
import Footprint from "../models/footprint.model.js";
import { getFootprintStats } from "./admin.controller.js";

/* Save activity */
export const trackAction = async (req: any, res: Response) => {
    try {
        const { action, page, meta } = req.body;

        await Footprint.create({
            userId: req.userId,
            action,
            page,
            meta
        });

        res.json({ success: true });

    } catch {
        res.status(500).json({
            message: "Tracking failed"
        });
    }
};

/* Personal stats — reuses admin getFootprintStats with userId filter */
export const getMyStats = async (req: any, res: Response) => {
    req._statsUserId = req.userId;
    return getFootprintStats(req, res);
};

/* User history with pagination + filters */
export const getMyFootprints = async (req: any, res: Response) => {
    const isExport = req.query.export === 'true';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = isExport ? 50000 : Math.min(1000, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const { action, dateFrom, dateTo, search } = req.query;

    const query: any = { userId: req.userId };
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
        Footprint.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Footprint.countDocuments(query)
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
};
