import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    doctorId: { type: String, required: true },
    userId: { type: String, required: true },
    appointmentId: { type: String, required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
    isApproved: { type: Boolean, default: false },
    isAnonymous: { type: Boolean, default: false },
    helpful: { type: Number, default: 0 }, // upvote count
  },
  { timestamps: true },
);

const reviewModel =
  mongoose.models.review || mongoose.model("review", reviewSchema);

export default reviewModel;
