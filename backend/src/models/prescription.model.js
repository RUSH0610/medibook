import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true }, // "1-0-1", "0-0-1"
  duration: { type: String, required: true }, // "7 days"
  instructions: { type: String, default: "" }, // "After meals"
  quantity: { type: Number, default: 1 },
});

const prescriptionSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, required: true },
    doctorId: { type: String, required: true },
    patientId: { type: String, required: true },
    doctorName: { type: String, required: true },
    patientName: { type: String, required: true },
    patientAge: { type: String, default: "" },
    diagnosis: { type: String, required: true },
    medicines: [medicineSchema],
    labTests: [{ type: String }], // ["CBC", "Liver Function Test"]
    advice: { type: String, default: "" },
    followUpDate: { type: String, default: "" },
    nextVisitIn: { type: String, default: "" }, // "2 weeks"
    issuedAt: { type: Date, default: Date.now },
    isSigned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const prescriptionModel =
  mongoose.models.prescription ||
  mongoose.model("prescription", prescriptionSchema);

export default prescriptionModel;
