import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";
import {
  createSellerCatalogItem, listSellerCatalog, patchSellerCatalogItem,
  readSellerCatalogItem, readSellerCatalogVersions
} from "../controllers/sellerCatalog.controller.js";

const router = express.Router();
router.use(isAuth);
router.get("/:kind", listSellerCatalog);
router.get("/:kind/:id", readSellerCatalogItem);
router.get("/:kind/:id/versions", readSellerCatalogVersions);
router.post("/:kind", isAdmin, createSellerCatalogItem);
router.patch("/:kind/:id", isAdmin, patchSellerCatalogItem);

export default router;
