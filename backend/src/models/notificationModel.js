import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: String, required: true },
    recipientRole: {
      type: String,
      enum: ["user", "doctor", "admin"],
      required: true,
    },
    type: {
      type: String,
      enum: [
        "appointment_booked",
        "appointment_cancelled",
        "appointment_reminder",
        "appointment_completed",
        "prescription_issued",
        "review_received",
        "payment_success",
        "system",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    relatedId: { type: String, default: "" }, // appointmentId, prescriptionId etc.
    link: { type: String, default: "" },
  },
  { timestamps: true },
);

const notificationModel =
  mongoose.models.notification ||
  mongoose.model("notification", notificationSchema);

export default notificationModel;
