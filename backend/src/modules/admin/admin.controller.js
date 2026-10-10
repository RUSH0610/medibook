import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/ApiResponse.js";
import * as adminService from "./admin.service.js";

// Grab admin dashboard stats and format them for the UI
export const getAdminDashboard = asyncHandler(async (req, res) => {
  const result = await adminService.getAdminDashboard();
  return res.status(200).json(
    new ApiResponse(200, result, "Admin dashboard data fetched successfully")
  );
});

// Register a new doctor
export const addDoctor = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    speciality,
    degree,
    experience,
    about,
    fees,
    address,
    hospitalAffiliation = "",
    consultationRoom = "",
  } = req.body;
  const imageFile = req.file;

  await adminService.addDoctor({
    name,
    email,
    password,
    speciality,
    degree,
    experience,
    about,
    fees,
    address,
    hospitalAffiliation,
    consultationRoom,
    imageFile,
  });

  return res.status(201).json(new ApiResponse(201, null, "Doctor Added Successfully"));
});

// Fetch all doctors for admin list view
export const getAllDoctorsAdmin = asyncHandler(async (req, res) => {
  const result = await adminService.getAllDoctorsAdmin();
  return res.status(200).json(new ApiResponse(200, result, "Doctors fetched"));
});

// Approve or suspend a doctor account
export const toggleDoctorApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { doctorId } = req.body || {};
  const targetId = id || doctorId;

  const result = await adminService.toggleDoctorApproval({ targetId });

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      `Doctor ${result.isApproved ? "approved" : "suspended"}`
    )
  );
});

// List all users in the system
export const getAllUsersAdmin = asyncHandler(async (req, res) => {
  const result = await adminService.getAllUsersAdmin();
  return res.status(200).json(new ApiResponse(200, result, "Users fetched"));
});

// Activate or deactivate a user account
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body || {};
  const targetId = id || userId;

  const result = await adminService.toggleUserStatus({
    targetId,
    currentUserId: req.user.id,
  });

  return res.status(200).json(
    new ApiResponse(200, result, `User ${result.isActive ? "activated" : "deactivated"}`)
  );
});

// Fetch all appointments across the platform for admin review
export const getAllAppointmentsAdmin = asyncHandler(async (req, res) => {
  const result = await adminService.getAllAppointmentsAdmin();
  return res.status(200).json(new ApiResponse(200, result, "Appointments fetched"));
});

export default {
  getAdminDashboard,
  addDoctor,
  getAllDoctorsAdmin,
  toggleDoctorApproval,
  getAllUsersAdmin,
  toggleUserStatus,
  getAllAppointmentsAdmin,
};
