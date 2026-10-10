import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/ApiResponse.js";
import * as reviewService from "./review.service.js";

// Submit Review for a Completed Consultation
export const submitReview = asyncHandler(async (req, res) => {
  const patientUserId = req.user.id;
  const { doctorId, appointmentId, rating, comment = "", isAnonymous = false } = req.body;

  await reviewService.submitReview({
    patientUserId,
    doctorId,
    appointmentId,
    rating,
    comment,
    isAnonymous,
  });

  return res.status(201).json(new ApiResponse(201, null, "Review submitted successfully"));
});

// Get Reviews for Doctor (Public)
export const getDoctorReviews = asyncHandler(async (req, res) => {
  const doctorId = req.params.docId || req.params.doctorId;
  const result = await reviewService.getDoctorReviews({ doctorId });

  return res.status(200).json(
    new ApiResponse(200, result, "Reviews fetched")
  );
});

// Get All Reviews (Admin Panel)
export const getAllReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getAllReviews();

  return res.status(200).json(
    new ApiResponse(200, result, "All reviews fetched")
  );
});

// Admin Toggle Review Approval
export const toggleReviewApproval = asyncHandler(async (req, res) => {
  const reviewId = req.params.id;
  const result = await reviewService.toggleReviewApproval({ reviewId });

  return res.status(200).json(
    new ApiResponse(200, null, `Review ${result.isApproved ? "approved" : "hidden"}`)
  );
});

export default {
  submitReview,
  getDoctorReviews,
  getAllReviews,
  toggleReviewApproval,
};
