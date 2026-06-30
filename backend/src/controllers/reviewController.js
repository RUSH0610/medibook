import reviewModel from "../models/reviewModel.js";
import doctorModel from "../models/doctor.model.js";
import appointmentModel from "../models/appointment.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Submit a review
const submitReview = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { doctorId, appointmentId, rating, comment, isAnonymous } = req.body;

  // check appointment exists and is completed
  const appointment = await appointmentModel.findById(appointmentId);
  if (!appointment) throw new ApiError(404, "Appointment not found");
  if (!appointment.isCompleted)
    throw new ApiError(400, "Can only review completed appointments");
  if (appointment.userId.toString() !== userId.toString())
    throw new ApiError(403, "Unauthorized");

  // check no duplicate review
  const existing = await reviewModel.findOne({ appointmentId });
  if (existing) throw new ApiError(409, "Already reviewed this appointment");

  const review = new reviewModel({
    doctorId,
    userId,
    appointmentId,
    userName: appointment.userData.name,
    rating,
    comment,
    isAnonymous: isAnonymous || false,
    isApproved: true,
  });

  await review.save();

  // update doctor average rating
  const allReviews = await reviewModel.find({ doctorId, isApproved: true });
  const avgRating =
    allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
  await doctorModel.findByIdAndUpdate(doctorId, {
    avgRating: Math.round(avgRating * 10) / 10,
    totalReviews: allReviews.length,
  });

  // mark appointment as rated
  await appointmentModel.findByIdAndUpdate(appointmentId, { rating });

  return res.status(200).json(new ApiResponse(200, null, "Review submitted"));
});

// Get reviews for a doctor
const getDoctorReviews = asyncHandler(async (req, res) => {
  const { docId } = req.params;
  const reviews = await reviewModel
    .find({ doctorId: docId, isApproved: true })
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { reviews }, "Reviews fetched"));
});

// Admin: get all reviews
const getAllReviews = asyncHandler(async (req, res) => {
  const reviews = await reviewModel.find({}).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { reviews }, "All reviews fetched"));
});

// Admin: approve/reject review
const toggleReviewApproval = asyncHandler(async (req, res) => {
  const { reviewId } = req.body;
  const review = await reviewModel.findById(reviewId);
  if (!review) throw new ApiError(404, "Review not found");
  review.isApproved = !review.isApproved;
  await review.save();
  return res.status(200).json(
    new ApiResponse(200, null, `Review ${review.isApproved ? "approved" : "hidden"}`)
  );
});

export { submitReview, getDoctorReviews, getAllReviews, toggleReviewApproval };
