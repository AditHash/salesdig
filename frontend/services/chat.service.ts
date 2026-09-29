import API from "../api/api";
import { ChatResponse, ChatMessage } from "../types";

export const sendMessage = (message: string): Promise<{ data: ChatResponse }> =>
  API.post("/chat/message", { message });

export const getChatHistory = (): Promise<{ data: { messages: ChatMessage[] } }> =>
  API.get("/chat/history");

export const clearChatHistory = (): Promise<void> =>
  API.delete("/chat/history");
