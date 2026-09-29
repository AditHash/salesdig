import { Router } from "express";
import isAuth from "../middlewares/isAuth.js";
import { sendMessage, getChatHistory, clearChatHistory } from "../controllers/chat.controller.js";

const router = Router();

router.post("/message", isAuth, sendMessage);
router.get("/history", isAuth, getChatHistory);
router.delete("/history", isAuth, clearChatHistory);

export default router;
