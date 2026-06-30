import express from "express";
import {
  submitReview,
  getDoctorReviews,
  getAllReviews,
  toggleReviewApproval,
} from "../controllers/reviewController.js";
import {authUser} from "../middlewares/auth.middleware.js";
import {authAdmin} from "../middlewares/auth.middleware.js";

const reviewRouter = express.Router();

reviewRouter.post("/submit", authUser, submitReview);
reviewRouter.get("/doctor/:docId", getDoctorReviews);
reviewRouter.get("/all", authAdmin, getAllReviews);
reviewRouter.post("/toggle-approval", authAdmin, toggleReviewApproval);

export default reviewRouter;
