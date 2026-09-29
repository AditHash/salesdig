import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
    trackAction,
    getMyFootprints,
    getMyStats
} from "../controllers/track.controller.js";

const router = express.Router();

router.post("/", isAuth, trackAction);
router.get("/me", isAuth, getMyFootprints);
router.get("/me/stats", isAuth, getMyStats);

export default router;
