import mongoose from "mongoose";
import User from "../models/user.model.js";
import AnalysisReport from "../models/analysisReport.model.js";
import AnalysisRun from "../models/analysisRun.model.js";
import { DEFAULT_WORKSPACE_ID } from "./workspaceDefaults.js";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        await Promise.all([
            User.updateMany({ workspaceId: { $exists: false } }, { $set: { workspaceId: DEFAULT_WORKSPACE_ID } }),
            AnalysisReport.updateMany({ workspaceId: { $exists: false } }, { $set: { workspaceId: DEFAULT_WORKSPACE_ID } }),
            AnalysisRun.updateMany({ workspaceId: { $exists: false } }, { $set: { workspaceId: DEFAULT_WORKSPACE_ID } })
        ]);
        console.log("MongoDB Connected");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

export default connectDB;
