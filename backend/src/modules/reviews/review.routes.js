import express from "express";
import {
  submitReview,
  getDoctorReviews,
  getAllReviews,
  toggleReviewApproval,
} from "./review.controller.js";
import { requireAuth, requirePatient, requireAdmin } from "../../middlewares/auth.middleware.js";
import { validateRequest, validateReview } from "../../middlewares/validate.middleware.js";

const router = express.Router();

router.get("/doctor/:docId", getDoctorReviews);
router.post("/", requirePatient, validateRequest(validateReview), submitReview);
router.get("/", requireAdmin, getAllReviews);
router.put("/:id/approval", requireAdmin, toggleReviewApproval);

export default router;
