import doctorModel from "../models/doctor.model.js";
import bycrypt from "bcrypt";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointment.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const changeAvailability = asyncHandler(async (req, res) => {
  const { docId } = req.body;
  const docData = await doctorModel.findById(docId);
  await doctorModel.findByIdAndUpdate(docId, {
    available: !docData.available,
  });
  return res.status(200).json(new ApiResponse(200, null, "Availability changed"));
});

const doctorList = asyncHandler(async (req, res) => {
  const doctors = await doctorModel.find({}).select(["-password", "-email"]);
  return res.status(200).json(new ApiResponse(200, { doctors }, "Doctors fetched"));
});

// API for doctor Login
const loginDoctor = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const doctor = await doctorModel.findOne({ email });

  if (!doctor) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isMatch = await bycrypt.compare(password, doctor.password);

  if (isMatch) {
    const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json(new ApiResponse(200, { token }, "Login successful"));
  } else {
    throw new ApiError(401, "Invalid credentials");
  }
});

// API to get doctor appointments for doctor panel
const appointmentsDoctor = asyncHandler(async (req, res) => {
  const docId = req.docId;
  const appointments = await appointmentModel.find({ docId });

  return res.status(200).json(new ApiResponse(200, { appointments }, "Appointments fetched"));
});

// API to mark appointment completed for doctor panel
const appointmentComplete = asyncHandler(async (req, res) => {
  const docId = req.docId;
  const { appointmentId } = req.body;
  const appointmentData = await appointmentModel.findById(appointmentId);

  if (appointmentData && appointmentData.docId.toString() === docId.toString()) {
    await appointmentModel.findByIdAndUpdate(appointmentId, {
      isCompleted: true,
    });
    return res.status(200).json(new ApiResponse(200, null, "Appointment Completed"));
  } else {
    throw new ApiError(400, "Mark Failed");
  }
});

// API to cancel appointment for doctor panel
const appointmentCancel = asyncHandler(async (req, res) => {
  const docId = req.docId;
  const { appointmentId } = req.body;
  const appointmentData = await appointmentModel.findById(appointmentId);

  if (appointmentData && appointmentData.docId.toString() === docId.toString()) {
    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
    });
    return res.status(200).json(new ApiResponse(200, null, "Appointment Cancelled"));
  } else {
    throw new ApiError(400, "Cancellation Failed");
  }
});

// API to get dashboard data for doctor panel
const doctorDashboard = asyncHandler(async (req, res) => {
  const docId = req.docId;
  const appointments = await appointmentModel.find({ docId });

  let earnings = 0;

  appointments.forEach((item) => {
    if (item.isCompleted || item.payment) {
      earnings += item.amount;
    }
  });

  let patients = [];

  appointments.forEach((item) => {
    if (!patients.includes(item.userId)) {
      patients.push(item.userId);
    }
  });

  const dashData = {
    earnings,
    appointments: appointments.length,
    patients: patients.length,
    latestAppointments: [...appointments].reverse().slice(0, 5),
  };

  return res.status(200).json(new ApiResponse(200, { dashData }, "Dashboard data fetched"));
});

// API to get doctor profile for Doctor panel
const doctorProfile = asyncHandler(async (req, res) => {
  const docId = req.docId;
  const profileData = await doctorModel.findById(docId).select("-password");

  return res.status(200).json(new ApiResponse(200, { profileData }, "Profile fetched"));
});

// API to update doctor profile data from Doctor panel
const updateDoctorProfile = asyncHandler(async (req, res) => {
  const docId = req.docId;
  const { fees, address, available } = req.body;

  await doctorModel.findByIdAndUpdate(docId, { fees, address, available });

  return res.status(200).json(new ApiResponse(200, null, "Profile Updated"));
});

export {
  changeAvailability,
  doctorList,
  loginDoctor,
  appointmentsDoctor,
  appointmentCancel,
  appointmentComplete,
  doctorDashboard,
  doctorProfile,
  updateDoctorProfile,
};
