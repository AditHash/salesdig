import mongoose, { Document, Schema } from "mongoose";
import { DEFAULT_WORKSPACE_ID } from "../config/workspaceDefaults.js";

export interface IAnalysisRun extends Document {
  userId: string;
  workspaceId: string;
  status: "queued" | "running" | "completed" | "failed";
  input: {
    customerName: string;
    companyDomain: string;
  };
  agentRuns: Record<string, unknown>;
  validatedProfile?: Record<string, unknown>;
  finalRecommendations?: Record<string, unknown>;
  overallConfidence?: number;
  reportId?: mongoose.Types.ObjectId;
  error?: string;
  startedAt: Date;
  endedAt?: Date;
  durationMs?: number;
}

const AnalysisRunSchema = new Schema<IAnalysisRun>(
  {
    userId: { type: String, required: true, index: true },
    workspaceId: { type: String, required: true, default: DEFAULT_WORKSPACE_ID, index: true },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      required: true,
      default: "queued",
      index: true
    },
    input: {
      customerName: { type: String, required: true },
      companyDomain: { type: String, required: true }
    },
    agentRuns: {
      type: Schema.Types.Mixed,
      default: {}
    },
    validatedProfile: {
      type: Schema.Types.Mixed
    },
    finalRecommendations: {
      type: Schema.Types.Mixed
    },
    overallConfidence: {
      type: Number
    },
    reportId: {
      type: Schema.Types.ObjectId,
      ref: "AnalysisReport"
    },
    error: {
      type: String
    },
    startedAt: {
      type: Date,
      required: true
    },
    endedAt: {
      type: Date
    },
    durationMs: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

AnalysisRunSchema.index({ userId: 1, createdAt: -1 });
AnalysisRunSchema.index({ workspaceId: 1, createdAt: -1 });

export default mongoose.model<IAnalysisRun>("AnalysisRun", AnalysisRunSchema);
