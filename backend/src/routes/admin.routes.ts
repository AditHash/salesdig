import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";

import {
    getUsers,
    getFootprints,
    getAnalysisKpis,
    getFootprintStats,
    createUser,
    toggleBlockStatus,
    resetUserPassword,
    resendInvite
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(isAuth, isAdmin);

router.get("/users", getUsers);
router.post("/users", createUser);
router.patch("/users/:id/block", toggleBlockStatus);
router.patch("/users/:id/password", resetUserPassword);
router.post("/users/:id/resend-invite", resendInvite);
router.get("/footprints", getFootprints);
router.get("/footprints/kpis", getAnalysisKpis);
router.get("/footprints/stats", getFootprintStats);

export default router;
