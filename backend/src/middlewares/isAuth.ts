import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { postgres } from "../config/postgres.js";
import { DEFAULT_WORKSPACE_ID } from "../config/workspaceDefaults.js";

/* Extend Request Type */
export interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
    workspaceId?: string;
}

const isAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Access denied. No token provided."
            });
        }

        // Extract token
        const token = authHeader.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as { id: string; workspaceId?: string };

        // Check if user exists and is not blocked
        const result = await postgres.query("SELECT id, role, workspace_id, is_blocked FROM users WHERE id = $1", [decoded.id]);
        const row = result.rows[0];
        const user = row ? {
            id: row.id,
            role: row.role,
            workspaceId: row.workspace_id,
            isBlocked: row.is_blocked
        } : null;

        if (!user) {
            return res.status(401).json({
                message: "User no longer exists."
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({
                message: "Your account has been suspended"
            });
        }

        // Attach user id and role to request
        req.userId = decoded.id;
        req.userRole = user.role;
        req.workspaceId = user.workspaceId || decoded.workspaceId || DEFAULT_WORKSPACE_ID;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

export default isAuth;
