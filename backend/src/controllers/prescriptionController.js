import prescriptionModel from "../models/prescription.model.js";
import notificationModel from "../models/notificationModel.js";
import doctorModel from "../models/doctor.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Doctor issues a prescription
const issuePrescription = asyncHandler(async (req, res) => {
  const {
    appointmentId,
    patientId,
    patientName,
    patientAge,
    diagnosis,
    medicines,
    labTests,
    advice,
    followUpDate,
    nextVisitIn,
  } = req.body;
  const docId = req.docId;

  const doctor = await doctorModel.findById(docId);
  const doctorName = doctor ? doctor.name : "Doctor";

  const prescription = new prescriptionModel({
    appointmentId,
    doctorId: docId,
    patientId,
    doctorName,
    patientName,
    patientAge,
    diagnosis,
    medicines,
    labTests,
    advice,
    followUpDate,
    nextVisitIn,
    isSigned: true,
  });

  await prescription.save();

  await notificationModel.create({
    recipientId: patientId,
    recipientRole: "user",
    type: "prescription_issued",
    title: "New Prescription",
    message: `Dr. ${doctorName} has issued a prescription for your recent visit.`,
    relatedId: prescription._id.toString(),
  });

  return res.status(200).json(new ApiResponse(200, { prescription }, "Prescription issued"));
});

// Get prescriptions for a patient — userId comes from authUser middleware
const getPatientPrescriptions = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const prescriptions = await prescriptionModel
    .find({ patientId: userId })
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { prescriptions }, "Prescriptions fetched"));
});

// Get prescriptions issued by a doctor — docId comes from authDoctor middleware
const getDoctorPrescriptions = asyncHandler(async (req, res) => {
  const docId = req.docId;
  const prescriptions = await prescriptionModel
    .find({ doctorId: docId })
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { prescriptions }, "Prescriptions fetched"));
});

// Get single prescription by id
const getPrescriptionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prescription = await prescriptionModel.findById(id);
  if (!prescription) throw new ApiError(404, "Prescription not found");
  return res.status(200).json(new ApiResponse(200, { prescription }, "Prescription fetched"));
});

export {
  issuePrescription,
  getPatientPrescriptions,
  getDoctorPrescriptions,
  getPrescriptionById,
};
