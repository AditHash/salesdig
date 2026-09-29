import { Response, NextFunction } from "express";
import User from "../models/user.model.js";
import { Request } from "express";

interface AdminRequest extends Request {
    userId?: string;
}

const isAdmin = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
) => {
    const user = await User.findById(req.userId);

    if (!user || user.role !== "admin") {
        return res.status(403).json({
            message: "Admin access only"
        });
    }

    next();
};

export default isAdmin;
