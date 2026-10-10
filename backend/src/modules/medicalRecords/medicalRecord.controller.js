import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/ApiResponse.js";
import * as medicalRecordService from "./medicalRecord.service.js";

// Upload Medical Record
export const uploadRecord = asyncHandler(async (req, res) => {
  const patientUserId = req.user.id;
  const file = req.file;
  const {
    title,
    category,
    recordType,
    description = "",
    notes = "",
    appointmentId,
  } = req.body;

  const result = await medicalRecordService.uploadRecord({
    patientUserId,
    file,
    title,
    category,
    recordType,
    description,
    notes,
    appointmentId,
  });

  return res.status(201).json(
    new ApiResponse(201, result, "Record uploaded successfully")
  );
});

// Get Patient's Medical Records
export const getPatientRecords = asyncHandler(async (req, res) => {
  const result = await medicalRecordService.getPatientRecords({
    patientUserId: req.user.id,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Records fetched")
  );
});

// Patient Medical Timeline API
export const getPatientTimeline = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const result = await medicalRecordService.getPatientTimeline({
    patientUserId: req.user.id,
    type,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Patient timeline fetched")
  );
});

// Share Record with Doctor
export const shareWithDoctor = asyncHandler(async (req, res) => {
  const patientUserId = req.user.id;
  const { recordId, doctorId } = req.body;

  await medicalRecordService.shareWithDoctor({
    patientUserId,
    recordId,
    doctorId,
  });

  return res.status(200).json(new ApiResponse(200, null, "Record shared with doctor"));
});

// Doctor Views Records Shared with Them
export const getDoctorSharedRecords = asyncHandler(async (req, res) => {
  const doctorId = req.doctorId;
  const result = await medicalRecordService.getDoctorSharedRecords({ doctorId });

  return res.status(200).json(
    new ApiResponse(200, result, "Shared records fetched")
  );
});

// Delete Medical Record
export const deleteRecord = asyncHandler(async (req, res) => {
  const recordId = req.params.id;
  const patientUserId = req.user.id;

  await medicalRecordService.deleteRecord({
    recordId,
    patientUserId,
    user: req.user,
  });

  return res.status(200).json(new ApiResponse(200, null, "Record deleted successfully"));
});

export default {
  uploadRecord,
  getPatientRecords,
  getPatientTimeline,
  shareWithDoctor,
  getDoctorSharedRecords,
  deleteRecord,
};
