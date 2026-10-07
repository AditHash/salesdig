import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";
import {
  downloadDocument, listDocuments, readDocument, readSuggestions, removeDocument,
  replaceDocument, retryDocument, reviewSuggestion, uploadDocument
} from "../controllers/sellerDocuments.controller.js";
import { MAX_SELLER_DOCUMENT_BYTES } from "../services/sellerDocuments.service.js";

const router = express.Router();
const rawDocument = express.raw({ type: "application/octet-stream", limit: MAX_SELLER_DOCUMENT_BYTES });
router.use(isAuth);
router.get("/", listDocuments);
router.get("/:id", readDocument);
router.get("/:id/download", downloadDocument);
router.get("/:id/suggestions", readSuggestions);
router.patch("/:id/suggestions/:suggestionId", isAdmin, reviewSuggestion);
router.post("/", isAdmin, rawDocument, uploadDocument);
router.put("/:id", isAdmin, rawDocument, replaceDocument);
router.post("/:id/retry", isAdmin, retryDocument);
router.delete("/:id", isAdmin, removeDocument);
router.use((error: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error?.type === "entity.too.large") return res.status(413).json({ message: "Document exceeds 20 KB limit" });
  next(error);
});

export default router;
