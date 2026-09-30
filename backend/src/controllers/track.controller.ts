import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { postgres } from "../config/postgres.js";
import { getFootprintStats } from "./admin.controller.js";

/* Save activity */
export const trackAction = async (req: any, res: Response) => {
    try {
        const { action, page, meta } = req.body;

        await postgres.query(
            `INSERT INTO footprints (id, user_id, workspace_id, action, page, meta)
             SELECT $1, id, workspace_id, $2, $3, $4 FROM users WHERE id = $5`,
            [randomUUID(), action, page, meta ?? null, req.userId]
        );

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

    const params: unknown[] = [req.userId];
    const where = ["user_id = $1"];
    if (action) { params.push(action); where.push(`action = $${params.length}`); }
    if (dateFrom) { params.push(new Date(dateFrom as string)); where.push(`created_at >= $${params.length}`); }
    if (dateTo) { params.push(new Date(new Date(dateTo as string).setHours(23, 59, 59, 999))); where.push(`created_at <= $${params.length}`); }
    if (search) { params.push(`%${String(search)}%`); where.push(`(action ILIKE $${params.length} OR page ILIKE $${params.length} OR meta ILIKE $${params.length})`); }
    const clause = where.join(" AND ");
    const [data, total] = await Promise.all([
        postgres.query(`SELECT id, user_id, workspace_id, action, page, meta, created_at, updated_at FROM footprints WHERE ${clause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, skip]),
        postgres.query(`SELECT count(*)::int AS total FROM footprints WHERE ${clause}`, params)
    ]);

    const rows = data.rows.map(row => ({
        _id: row.id,
        id: row.id,
        userId: row.user_id,
        workspaceId: row.workspace_id,
        action: row.action,
        page: row.page,
        meta: row.meta,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
    const count = total.rows[0]?.total ?? 0;
    res.json({ data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) });
};
