import "./env.js";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import trackRoutes from "./routes/track.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import analysisV2Routes from "./routes/analysisV2.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";

const app = express();

const frontendOrigin = process.env.FRONTEND_URL
  ? new URL(process.env.FRONTEND_URL).origin
  : "https://cloud-catalyst.cwmgenai.com";
const allowedOrigins = new Set(["http://localhost:3000", frontendOrigin]);

/* Middleware */
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
  credentials: true
}));
app.use(express.json());

/* Routes */
app.use("/api/auth", authRoutes);
app.use("/api/track", trackRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analysis/v2", analysisV2Routes);
app.use("/api/chat", chatRoutes);
app.use("/api/workspace", workspaceRoutes);

/* Health Check */
app.get("/", (req, res) => {
    res.send("API is running...");
});

export default app;
