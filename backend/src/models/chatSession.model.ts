import mongoose, { Document, Schema } from "mongoose";

export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  usedReportIds?: string[];
}

export interface IChatSession extends Document {
  userId: string;
  messages: IChatMessage[];
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    usedReportIds: [{ type: String }]
  },
  { _id: false }
);

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    messages: { type: [ChatMessageSchema], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model<IChatSession>("ChatSession", ChatSessionSchema);
