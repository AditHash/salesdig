import express from "express";
import { loginUser, logoutUser, getMe, changeMyPassword, forgotPassword, setPassword, updateMyName } from "../controllers/auth.controller.js";
import isAuth from "../middlewares/isAuth.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/logout", isAuth, logoutUser);
router.get("/me", isAuth, getMe);
router.patch("/me/password", isAuth, changeMyPassword);
router.patch("/me/name", isAuth, updateMyName);
router.post("/forgot-password", forgotPassword);
router.post("/set-password/:token", setPassword);

export default router;
