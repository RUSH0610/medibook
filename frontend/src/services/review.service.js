import apiClient from "./apiClient.js";

export const submitReview = (data) => apiClient.post("/api/v1/reviews", data, { role: "patient" });
export const getDoctorReviews = (doctorId) => apiClient.get(`/api/v1/reviews/doctor/${doctorId}`);
export const getAllReviews = () => apiClient.get("/api/v1/reviews", { role: "admin" });
export const toggleReviewApproval = (reviewId) =>
  apiClient.put(`/api/v1/reviews/${reviewId}/approval`, {}, { role: "admin" });
