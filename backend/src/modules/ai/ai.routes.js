import express from "express";
import { checkSymptoms } from "./ai.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/symptom-check", requireAuth, checkSymptoms);

export default router;
