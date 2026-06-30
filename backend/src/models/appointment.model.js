import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    docId: { type: String, required: true },
    slotDate: { type: String, required: true },
    slotTime: { type: String, required: true },
    userData: { type: Object, required: true },
    docData: { type: Object, required: true },
    amount: { type: Number, required: true },
    date: { type: Number, required: true },
    cancelled: { type: Boolean, default: false },
    payment: { type: Boolean, default: false },
    paymentMethod: {
      type: String,
      default: "offline",
      enum: ["offline", "online", "insurance"],
    },
    paymentId: { type: String, default: "" },
    isCompleted: { type: Boolean, default: false },

    // NEW: reason / symptoms
    reason: { type: String, default: "" },
    symptoms: [{ type: String }],

    // NEW: follow-up tracking
    isFollowUp: { type: Boolean, default: false },
    followUpOf: { type: String, default: "" }, // parent appointmentId

    // NEW: doctor notes / prescription
    prescription: { type: String, default: "" },
    diagnosis: { type: String, default: "" },
    notes: { type: String, default: "" },

    // NEW: vitals recorded at appointment
    vitals: {
      bloodPressure: { type: String, default: "" },
      heartRate: { type: String, default: "" },
      temperature: { type: String, default: "" },
      weight: { type: String, default: "" },
      height: { type: String, default: "" },
    },

    // NEW: rating / review after appointment
    rating: { type: Number, default: 0, min: 0, max: 5 },
    review: { type: String, default: "" },

    // NEW: appointment type
    type: {
      type: String,
      default: "in-person",
      enum: ["in-person", "video", "phone"],
    },

    // NEW: patient phone for video/phone appointments
    phone: { type: String, default: "" },

    // NEW: reminder sent
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

appointmentSchema.index({ userId: 1 })
appointmentSchema.index({ docId: 1 })
appointmentSchema.index({ slotDate: 1, docId: 1 })

const appointmentModel =
  mongoose.models.appointment ||
  mongoose.model("appointment", appointmentSchema);

export default appointmentModel;
