import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/ApiResponse.js";
import * as doctorService from "./doctor.service.js";

export const getDoctors = asyncHandler(async (req, res) => {
  const {
    specialization,
    city,
    experience,
    rating,
    search,
    page = 1,
    limit = 10,
    sort = "rating_desc",
  } = req.query;

  const result = await doctorService.getDoctors({
    specialization,
    city,
    experience,
    rating,
    search,
    page,
    limit,
    sort,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { doctors: result.doctors },
      "Doctors retrieved successfully",
      result.meta
    )
  );
});

export const getSpecializations = asyncHandler(async (req, res) => {
  const result = await doctorService.getSpecializations();
  return res.status(200).json(
    new ApiResponse(200, result, "Specializations fetched")
  );
});

export const getDoctorById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await doctorService.getDoctorById({ id });
  return res.status(200).json(
    new ApiResponse(200, result, "Doctor profile fetched")
  );
});

export const getDoctorAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  const slotData = await doctorService.getDoctorAvailability({ id, date });
  return res.status(200).json(new ApiResponse(200, slotData, "Availability slots generated"));
});

export const getDoctorAnalytics = asyncHandler(async (req, res) => {
  const doctorId = req.doctorId;
  const { period = "month" } = req.query;
  const result = await doctorService.getDoctorAnalytics({ doctorId, period });
  return res.status(200).json(
    new ApiResponse(200, result, "Doctor analytics fetched successfully")
  );
});

export const getMyDoctorProfile = asyncHandler(async (req, res) => {
  const doctorId = req.doctorId;
  const result = await doctorService.getMyDoctorProfile({ doctorId });
  return res.status(200).json(
    new ApiResponse(200, result, "Profile fetched")
  );
});

export const updateDoctorProfile = asyncHandler(async (req, res) => {
  const doctorId = req.doctorId;
  const { fees, address, available, is_available, bio, hospital_affiliation, consultation_room } = req.body;

  await doctorService.updateDoctorProfile({
    doctorId,
    fees,
    address,
    available,
    is_available,
    bio,
    hospital_affiliation,
    consultation_room,
  });

  return res.status(200).json(new ApiResponse(200, null, "Profile Updated"));
});

export const getDoctorLeaves = asyncHandler(async (req, res) => {
  const doctorId = req.doctorId;
  const result = await doctorService.getDoctorLeaves({ doctorId });
  return res.status(200).json(new ApiResponse(200, result, "Leave blocks fetched"));
});

export const addDoctorLeave = asyncHandler(async (req, res) => {
  const doctorId = req.doctorId;
  const { leaveDate, isFullDay = true, startTime, endTime, reason = "" } = req.body;

  const result = await doctorService.addDoctorLeave({
    doctorId,
    leaveDate,
    isFullDay,
    startTime,
    endTime,
    reason,
  });

  return res.status(201).json(new ApiResponse(201, result, "Leave block recorded"));
});

export const removeDoctorLeave = asyncHandler(async (req, res) => {
  const doctorId = req.doctorId;
  const { id } = req.params;
  await doctorService.removeDoctorLeave({ doctorId, id });
  return res.status(200).json(new ApiResponse(200, null, "Leave block removed"));
});

export const changeAvailability = asyncHandler(async (req, res) => {
  const doctorId = req.doctorId;
  const result = await doctorService.changeAvailability({ doctorId });
  return res.status(200).json(new ApiResponse(200, result, "Availability changed"));
});

export const adminChangeAvailability = asyncHandler(async (req, res) => {
  const targetId = req.params.id || req.body.docId || req.body.doctorId;
  const result = await doctorService.adminChangeAvailability({ targetId });
  return res.status(200).json(new ApiResponse(200, result, "Availability changed by admin"));
});

export default {
  getDoctors,
  getSpecializations,
  getDoctorById,
  getDoctorAvailability,
  getDoctorAnalytics,
  getMyDoctorProfile,
  updateDoctorProfile,
  getDoctorLeaves,
  addDoctorLeave,
  removeDoctorLeave,
  changeAvailability,
  adminChangeAvailability,
};
