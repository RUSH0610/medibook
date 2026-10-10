import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/ApiResponse.js";
import * as prescriptionService from "./prescription.service.js";

// Doctor Issues a Digital Prescription
export const issuePrescription = asyncHandler(async (req, res) => {
  const doctorId = req.doctorId;
  const {
    appointmentId,
    patientId,
    diagnosis,
    medicines = [],
    labTests = [],
    advice = "",
    followUpDate,
    nextVisitIn = "",
    notes = "",
  } = req.body;

  const result = await prescriptionService.issuePrescription({
    doctorId,
    appointmentId,
    patientId,
    diagnosis,
    medicines,
    labTests,
    advice,
    followUpDate,
    nextVisitIn,
    notes,
  });

  return res.status(201).json(
    new ApiResponse(201, result, "Prescription issued successfully")
  );
});

// Get Prescriptions for Logged-In Patient
export const getPatientPrescriptions = asyncHandler(async (req, res) => {
  const result = await prescriptionService.getPatientPrescriptions({
    patientUserId: req.user.id,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Prescriptions fetched")
  );
});

// Get Prescriptions Issued by Doctor
export const getDoctorPrescriptions = asyncHandler(async (req, res) => {
  const result = await prescriptionService.getDoctorPrescriptions({
    doctorId: req.doctorId,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Doctor prescriptions fetched")
  );
});

// Get Single Prescription by ID
export const getPrescriptionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await prescriptionService.getPrescriptionById({
    id,
    user: req.user,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Prescription details fetched")
  );
});

export default {
  issuePrescription,
  getPatientPrescriptions,
  getDoctorPrescriptions,
  getPrescriptionById,
};
