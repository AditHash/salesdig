import Footprint from "../models/footprint.model.js";

export const logActivity = (userId: string, action: string, page: string, meta?: string): void => {
  Footprint.create({ userId, action, page, meta }).catch(() => {});
};
