import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    uploadedBy: { type: String, required: true }, // userId or doctorId
    uploadedByRole: {
      type: String,
      enum: ["user", "doctor", "admin"],
      default: "user",
    },
    title: { type: String, required: true }, // "Blood Test Report"
    category: {
      type: String,
      enum: [
        "Lab Report",
        "Prescription",
        "X-Ray",
        "MRI",
        "CT Scan",
        "ECG",
        "Other",
      ],
      default: "Other",
    },
    fileUrl: { type: String, required: true },
    fileType: { type: String, default: "pdf" }, // pdf, image
    appointmentId: { type: String, default: "" },
    notes: { type: String, default: "" },
    recordDate: { type: String, default: "" },
    isSharedWithDoctor: { type: Boolean, default: false },
    sharedWithDoctors: [{ type: String }], // doctorIds
  },
  { timestamps: true },
);

const medicalRecordModel =
  mongoose.models.medicalRecord ||
  mongoose.model("medicalRecord", medicalRecordSchema);

export default medicalRecordModel;
