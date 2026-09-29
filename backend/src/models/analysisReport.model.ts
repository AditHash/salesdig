import mongoose, { Document, Schema } from "mongoose";
import { DEFAULT_WORKSPACE_ID } from "../config/workspaceDefaults.js";

export interface IAnalysisReport extends Document {
  userId: string;
  workspaceId: string;
  runId: mongoose.Types.ObjectId;
  customerName: string;
  companyDomain: string;
  annualSpend: number;
  validatedProfile: Record<string, unknown>;
  recommendations: unknown[];
  strategy: Record<string, unknown>;
  overallConfidence: number;
  digestText?: string;
  partnerProductRecommendations?: unknown[];
  zohoRecommendations?: unknown[];
}

const AnalysisReportSchema = new Schema<IAnalysisReport>(
  {
    userId: { type: String, required: true, index: true },
    workspaceId: { type: String, required: true, default: DEFAULT_WORKSPACE_ID, index: true },
    runId: { type: Schema.Types.ObjectId, ref: "AnalysisRun", required: true, index: true },
    customerName: { type: String, required: true },
    companyDomain: { type: String, required: true },
    annualSpend: { type: Number, required: true },
    validatedProfile: { type: Schema.Types.Mixed, required: true },
    recommendations: { type: [Schema.Types.Mixed], required: true },
    strategy: { type: Schema.Types.Mixed, required: true },
    overallConfidence: { type: Number, required: true },
    digestText: { type: String },
    partnerProductRecommendations: { type: [Schema.Types.Mixed], default: [] },
    zohoRecommendations: { type: [Schema.Types.Mixed], default: [] }
  },
  {
    timestamps: true
  }
);

AnalysisReportSchema.index({ userId: 1, createdAt: -1 });
AnalysisReportSchema.index({ workspaceId: 1, createdAt: -1 });

export default mongoose.model<IAnalysisReport>("AnalysisReport", AnalysisReportSchema);
