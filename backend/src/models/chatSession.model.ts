export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  usedReportIds?: string[];
}

export interface IChatSession {
  id: string;
  userId: string;
  workspaceId: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
