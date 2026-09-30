import crypto from "crypto";
import { postgres } from "../config/postgres.js";

export const logActivity = (userId: string, action: string, page: string, meta?: string): void => {
  postgres.query(
    `INSERT INTO footprints (id, user_id, workspace_id, action, page, meta)
     SELECT $1, id, workspace_id, $2, $3, $4 FROM users WHERE id = $5`,
    [crypto.randomUUID(), action, page, meta ?? null, userId]
  ).catch(() => {});
};
