import medicalRecordModel from "../models/medicalRecordModel.js";
import { v2 as cloudinary } from "cloudinary";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Helper: stream a buffer to Cloudinary
const streamUpload = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (result) resolve(result);
      else reject(error);
    });
    stream.end(buffer);
  });

const uploadRecord = asyncHandler(async (req, res) => {
  const { title, category, notes, recordDate, appointmentId } = req.body;
  const userId = req.userId;
  const file = req.file;
  if (!file) throw new ApiError(400, "No file uploaded");

  const result = await streamUpload(file.buffer, {
    resource_type: "auto",
    folder: "medical_records",
  });

  const record = new medicalRecordModel({
    userId,
    uploadedBy: userId,
    uploadedByRole: "user",
    title,
    category: category || "Other",
    fileUrl: result.secure_url,
    fileType: file.mimetype.includes("pdf") ? "pdf" : "image",
    appointmentId: appointmentId || "",
    notes,
    recordDate,
  });

  await record.save();
  return res.status(200).json(new ApiResponse(200, { record }, "Record uploaded"));
});

const getPatientRecords = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const records = await medicalRecordModel
    .find({ userId })
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { records }, "Records fetched"));
});

const deleteRecord = asyncHandler(async (req, res) => {
  const { recordId } = req.body;
  const userId = req.userId;
  const record = await medicalRecordModel.findById(recordId);
  if (!record) throw new ApiError(404, "Not found");
  if (record.userId.toString() !== userId.toString())
    throw new ApiError(403, "Unauthorized");
  await medicalRecordModel.findByIdAndDelete(recordId);
  return res.status(200).json(new ApiResponse(200, null, "Record deleted"));
});

const shareWithDoctor = asyncHandler(async (req, res) => {
  const { recordId, doctorId } = req.body;
  const userId = req.userId;
  const record = await medicalRecordModel.findById(recordId);
  if (!record) throw new ApiError(404, "Not found");
  if (record.userId.toString() !== userId.toString())
    throw new ApiError(403, "Unauthorized");
  if (!record.sharedWithDoctors.includes(doctorId)) {
    record.sharedWithDoctors.push(doctorId);
    record.isSharedWithDoctor = true;
    await record.save();
  }
  return res.status(200).json(new ApiResponse(200, null, "Shared with doctor"));
});

// API for doctor to view records shared with them
const getDoctorSharedRecords = asyncHandler(async (req, res) => {
  const docId = req.docId;
  const records = await medicalRecordModel
    .find({ sharedWithDoctors: docId })
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, { records }, "Shared records fetched"));
});

export {
  uploadRecord,
  getPatientRecords,
  deleteRecord,
  shareWithDoctor,
  getDoctorSharedRecords,
};
