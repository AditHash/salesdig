import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { postgres } from "../config/postgres.js";
import { getWorkspaceSettings, getWorkspaceSlug } from "../config/postgres.js";
import { DEFAULT_WORKSPACE_SETTINGS } from "../config/workspaceDefaults.js";
import { sendInviteEmail } from "../services/email.service.js";
import { mapDbRow, mapDbRows } from "../utils/dbRows.js";

const workspaceIdOf = (req: Request): string => String((req as any).workspaceId || "");
const dateEnd = (value: unknown): Date => new Date(new Date(String(value)).setHours(23, 59, 59, 999));

export const getUsers = async (req: Request, res: Response) => {
  const result = await postgres.query(
    `SELECT id, name, email, role, workspace_id, last_login, is_blocked, password <> '' AS has_password, created_at, updated_at
     FROM users WHERE workspace_id = $1 ORDER BY created_at DESC`,
    [workspaceIdOf(req)]
  );
  res.json(mapDbRows(result.rows).map(user => ({ ...user, hasPassword: user.hasPassword })));
};

export const getFootprints = async (req: Request, res: Response) => {
  const isExport = req.query.export === "true";
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = isExport ? 50000 : Math.min(1000, parseInt(String(req.query.limit || "20"), 10) || 20);
  const offset = (page - 1) * limit;
  const params: unknown[] = [workspaceIdOf(req)];
  const filters = ["f.workspace_id = $1"];
  if (req.query.userId) {
    const userCheck = await postgres.query("SELECT 1 FROM users WHERE id = $1 AND workspace_id = $2", [String(req.query.userId), workspaceIdOf(req)]);
    if (!userCheck.rowCount) return res.status(404).json({ message: "User not found" });
    params.push(String(req.query.userId));
    filters.push(`f.user_id = $${params.length}`);
  }
  if (req.query.action) { params.push(String(req.query.action)); filters.push(`f.action = $${params.length}`); }
  if (req.query.dateFrom) { params.push(new Date(String(req.query.dateFrom))); filters.push(`f.created_at >= $${params.length}`); }
  if (req.query.dateTo) { params.push(dateEnd(req.query.dateTo)); filters.push(`f.created_at <= $${params.length}`); }
  if (req.query.search) { params.push(`%${String(req.query.search)}%`); filters.push(`(f.action ILIKE $${params.length} OR f.page ILIKE $${params.length} OR f.meta ILIKE $${params.length})`); }
  const where = filters.join(" AND ");
  const [rows, count] = await Promise.all([
    postgres.query(
      `SELECT f.id, f.action, f.page, f.meta, f.created_at, f.updated_at,
              jsonb_build_object('_id', u.id, 'name', u.name, 'email', u.email) AS user
       FROM footprints f JOIN users u ON u.id = f.user_id
       WHERE ${where} ORDER BY f.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    postgres.query(`SELECT count(*)::int AS total FROM footprints f WHERE ${where}`, params)
  ]);
  const data = rows.rows.map(row => ({
    _id: row.id, id: row.id, userId: row.user, action: row.action, page: row.page,
    meta: row.meta, createdAt: row.created_at, updatedAt: row.updated_at
  }));
  const total = count.rows[0]?.total ?? 0;
  res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
};

export const getAnalysisKpis = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const workspaceId = workspaceIdOf(req);
    const [counts, dailyResult, monthlyResult, perUserResult] = await Promise.all([
      postgres.query(
        `SELECT count(*)::int AS total,
           count(*) FILTER (WHERE created_at >= $2)::int AS this_month,
           count(*) FILTER (WHERE created_at >= $3)::int AS this_week
         FROM footprints WHERE workspace_id = $1 AND action = 'PERFORM_ANALYSIS'`,
        [workspaceId, startOfMonth, startOfWeek]
      ),
      postgres.query(
        `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, count(*)::int AS count
         FROM footprints WHERE workspace_id = $1 AND action = 'PERFORM_ANALYSIS' AND created_at >= $2
         GROUP BY day ORDER BY day`, [workspaceId, thirtyDaysAgo]
      ),
      postgres.query(
        `SELECT to_char(created_at, 'YYYY-MM') AS month, count(*)::int AS count
         FROM footprints WHERE workspace_id = $1 AND action = 'PERFORM_ANALYSIS' AND created_at >= $2
         GROUP BY month ORDER BY month`, [workspaceId, twelveMonthsAgo]
      ),
      postgres.query(
        `SELECT u.name, u.email, count(*)::int AS count
         FROM footprints f JOIN users u ON u.id = f.user_id
         WHERE f.workspace_id = $1 AND f.action = 'PERFORM_ANALYSIS'
         GROUP BY u.id ORDER BY count DESC`, [workspaceId]
      )
    ]);
    const dailyMap = new Map(dailyResult.rows.map(row => [row.day, row.count]));
    const daily = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(now); date.setDate(now.getDate() - (29 - index));
      const day = date.toISOString().slice(0, 10);
      return { day, count: dailyMap.get(day) || 0 };
    });
    const monthlyMap = new Map(monthlyResult.rows.map(row => [row.month, row.count]));
    const monthly = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return { month, count: monthlyMap.get(month) || 0 };
    });
    const { total, this_month: thisMonth, this_week: thisWeek } = counts.rows[0];
    return res.json({ total, thisMonth, thisWeek, daily, monthly, perUser: perUserResult.rows });
  } catch (error) {
    console.error("KPI error:", error);
    return res.status(500).json({ message: "Failed to fetch KPIs" });
  }
};

export const getFootprintStats = async (req: Request, res: Response) => {
  try {
    const workspaceId = workspaceIdOf(req);
    const userFilter = (req as any)._statsUserId as string | undefined;
    const params: unknown[] = [workspaceId];
    let userClause = "";
    if (userFilter) { params.push(userFilter); userClause = ` AND user_id = $${params.length}`; }
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const dayParams: unknown[] = [workspaceId, fourteenDaysAgo];
    const dayUserClause = userFilter ? (dayParams.push(userFilter), ` AND user_id = $3`) : "";
    const [totalResult, days, pages, actions, users] = await Promise.all([
      postgres.query(`SELECT count(*)::int AS total FROM footprints WHERE workspace_id = $1${userClause}`, params),
      postgres.query(
        `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, count(*)::int AS count FROM footprints
         WHERE workspace_id = $1 AND created_at >= $2${dayUserClause}
         GROUP BY day ORDER BY day`,
        dayParams
      ),
      postgres.query(
        `SELECT page AS name, count(*)::int AS value FROM footprints WHERE workspace_id = $1${userClause}
         GROUP BY page ORDER BY value DESC LIMIT 6`, params
      ),
      postgres.query(
        `SELECT action, count(*)::int AS count FROM footprints WHERE workspace_id = $1${userClause}
         GROUP BY action ORDER BY action`, params
      ),
      userFilter ? Promise.resolve({ rows: [] }) : postgres.query(
        `SELECT u.id, u.name, u.email, count(*)::int AS count, max(f.created_at) AS "lastSeen"
         FROM footprints f JOIN users u ON u.id = f.user_id WHERE f.workspace_id = $1
         GROUP BY u.id ORDER BY count DESC`, [workspaceId]
      )
    ]);
    const dayMap = new Map(days.rows.map(row => [row.day, row.count]));
    const activityByDay = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(); date.setDate(date.getDate() - (13 - index));
      const day = date.toISOString().slice(0, 10);
      return { day, count: dayMap.get(day) || 0 };
    });
    const actionBreakdown = actions.rows;
    return res.json({
      totalEvents: totalResult.rows[0]?.total ?? 0,
      activityByDay,
      pageDistribution: pages.rows,
      actionBreakdown,
      uniqueActions: actionBreakdown.length,
      actions: actionBreakdown.map(row => row.action).sort(),
      userSummary: users.rows
    });
  } catch (error) {
    console.error("Stats error:", error);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const role = req.body?.role === "admin" ? "admin" : "user";
  if (!name || !email) return res.status(400).json({ message: "Name and email are required" });
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const id = crypto.randomUUID();
  try {
    const result = await postgres.query(
      `INSERT INTO users (id, name, email, password, role, workspace_id, password_reset_token, password_reset_expiry)
       VALUES ($1, $2, $3, '', $4, $5, $6, now() + interval '24 hours')
       RETURNING id, name, email, role, created_at`,
      [id, name, email, role, workspaceIdOf(req), tokenHash]
    );
    const user = result.rows[0];
    try {
      const workspaceId = workspaceIdOf(req);
      const workspace = await getWorkspaceSettings(workspaceId) || DEFAULT_WORKSPACE_SETTINGS;
      await sendInviteEmail(email, name, rawToken, workspace, await getWorkspaceSlug(workspaceId));
    } catch {
      await postgres.query("DELETE FROM users WHERE id = $1", [id]);
      return res.status(500).json({ message: "Failed to send invite email. Please try again." });
    }
    return res.status(201).json({ message: "User created and invite sent", user: { _id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.created_at } });
  } catch (error) {
    if ((error as any)?.code === "23505") return res.status(400).json({ message: "User already exists" });
    console.error("Create User Error:", error);
    return res.status(500).json({ message: "Failed to create user" });
  }
};

export const resendInvite = async (req: Request, res: Response) => {
  try {
    const result = await postgres.query(
      "SELECT id, name, email, password, workspace_id FROM users WHERE id = $1 AND workspace_id = $2",
      [req.params.id, workspaceIdOf(req)]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.password) return res.status(400).json({ message: "User has already set their password" });
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await postgres.query("UPDATE users SET password_reset_token = $2, password_reset_expiry = now() + interval '24 hours', updated_at = now() WHERE id = $1", [user.id, tokenHash]);
    const workspace = await getWorkspaceSettings(user.workspace_id) || DEFAULT_WORKSPACE_SETTINGS;
    await sendInviteEmail(user.email, user.name, rawToken, workspace, await getWorkspaceSlug(user.workspace_id));
    return res.json({ message: "Invite resent" });
  } catch {
    return res.status(500).json({ message: "Failed to resend invite" });
  }
};

export const toggleBlockStatus = async (req: Request, res: Response) => {
  try {
    const isBlocked = Boolean(req.body?.isBlocked);
    const result = await postgres.query(
      `UPDATE users SET is_blocked = $3, updated_at = now() WHERE id = $1 AND workspace_id = $2
       RETURNING id, name, email, role, workspace_id, last_login, is_blocked, created_at, updated_at`,
      [req.params.id, workspaceIdOf(req), isBlocked]
    );
    const user = mapDbRow(result.rows[0]);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ message: `User ${isBlocked ? "blocked" : "unblocked"} successfully`, user });
  } catch (error) {
    console.error("Block User Error:", error);
    return res.status(500).json({ message: "Failed to update user status" });
  }
};

export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    const hashedPassword = await bcrypt.hash(password, 10);
    await postgres.query("UPDATE users SET password = $3, updated_at = now() WHERE id = $1 AND workspace_id = $2", [id, workspaceIdOf(req), hashedPassword]);
    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ message: "Failed to reset password" });
  }
};
