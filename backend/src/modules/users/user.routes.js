import express from "express";
import { getProfile, updateProfile } from "./user.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import upload from "../../middlewares/upload.middleware.js";

const router = express.Router();

router.get("/profile", requireAuth, getProfile);
router.put("/profile", requireAuth, upload.single("image"), updateProfile);

export default router;
