import API from "../api/api";
import { ChatResponse, ChatMessage } from "../types";

export const sendMessage = (message: string, accountId?: string): Promise<{ data: ChatResponse }> =>
  API.post("/chat/message", { message, ...(accountId ? { accountId } : {}) });

export const getChatHistory = (accountId?: string): Promise<{ data: { messages: ChatMessage[] } }> =>
  API.get("/chat/history", { params: accountId ? { accountId } : undefined });

export const clearChatHistory = (accountId?: string): Promise<void> =>
  API.delete("/chat/history", { params: accountId ? { accountId } : undefined });
