import { Response, NextFunction } from "express";
import { postgres } from "../config/postgres.js";
import { Request } from "express";

interface AdminRequest extends Request {
    userId?: string;
}

const isAdmin = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
) => {
    const result = await postgres.query("SELECT role FROM users WHERE id = $1", [req.userId]);
    const user = result.rows[0];

    if (!user || user.role !== "admin") {
        return res.status(403).json({
            message: "Admin access only"
        });
    }

    next();
};

export default isAdmin;
