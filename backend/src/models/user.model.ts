import mongoose, { Schema, Document } from "mongoose";
import { DEFAULT_WORKSPACE_ID } from "../config/workspaceDefaults.js";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: "user" | "admin";
    workspaceId: string;
    lastLogin?: Date;
    isBlocked: boolean;
    passwordResetToken?: string;
    passwordResetExpiry?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: false, default: "" },
        role: { type: String, enum: ["user", "admin"], default: "user" },
        workspaceId: { type: String, required: true, default: DEFAULT_WORKSPACE_ID, index: true },
        lastLogin: { type: Date },
        isBlocked: { type: Boolean, default: false },
        passwordResetToken: { type: String },
        passwordResetExpiry: { type: Date },
    },
    { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
