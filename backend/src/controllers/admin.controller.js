import validator from "validator";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctor.model.js";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointment.model.js";
import userModel from "../models/user.model.js";
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

// API for adding doctor
const addDoctor = asyncHandler(async (req, res) => {
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
  } = req.body;
  const imageFile = req.file;

  // checking for all data to add doctor
  if (
    !name ||
    !email ||
    !password ||
    !speciality ||
    !degree ||
    !experience ||
    !about ||
    !fees ||
    !address
  ) {
    throw new ApiError(400, "Missing Details");
  }

  // validating email format
  if (!validator.isEmail(email)) {
    throw new ApiError(400, "Please enter a valid email");
  }

  // validating strong password
  if (password.length < 8) {
    throw new ApiError(400, "Please enter a strong password");
  }

  // hashing doctor password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // upload image to cloudinary via stream (memoryStorage buffer)
  if (!imageFile) throw new ApiError(400, "Doctor image is required");
  const uploadResult = await streamUpload(imageFile.buffer, { resource_type: "image" });
  const imageUrl = uploadResult.secure_url;

  const doctorData = {
    name,
    email,
    image: imageUrl,
    password: hashedPassword,
    speciality,
    degree,
    experience,
    about,
    fees,
    address: JSON.parse(address),
    date: Date.now(),
  };

  const newDoctor = new doctorModel(doctorData);
  await newDoctor.save();

  return res.status(200).json(new ApiResponse(200, null, "Doctor Added"));
});

// API for admin Login
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return res.status(200).json(new ApiResponse(200, { token }, "Login successful"));
  } else {
    throw new ApiError(401, "Invalid credentials");
  }
});

// API to get all doctors list for admin panel
const allDoctors = asyncHandler(async (req, res) => {
  const doctors = await doctorModel.find({}).select("-password");
  return res.status(200).json(new ApiResponse(200, { doctors }, "Doctors fetched"));
});

// API to get all appointments list
const appointmentsAdmin = asyncHandler(async (req, res) => {
  const appointments = await appointmentModel.find({});
  return res.status(200).json(new ApiResponse(200, { appointments }, "Appointments fetched"));
});

// API for appointment cancellation
const appointmentCancel = asyncHandler(async (req, res) => {
  const { appointmentId } = req.body;

  const appointmentData = await appointmentModel.findById(appointmentId);

  await appointmentModel.findByIdAndUpdate(appointmentId, {
    cancelled: true,
  });

  // releasing doctor slot
  const { docId, slotDate, slotTime } = appointmentData;

  const doctorData = await doctorModel.findById(docId);

  let slots_booked = doctorData.slots_booked;

  slots_booked[slotDate] = slots_booked[slotDate].filter(
    (e) => e !== slotTime
  );

  await doctorModel.findByIdAndUpdate(docId, { slots_booked });

  return res.status(200).json(new ApiResponse(200, null, "Appointment Cancelled"));
});

// API to get dashboard data for admin panel
const adminDashboard = asyncHandler(async (req, res) => {
  const doctors = await doctorModel.find({});
  const users = await userModel.find({});
  const appointments = await appointmentModel.find({});

  let earnings = 0;
  appointments.forEach((item) => {
    if (item.isCompleted || item.payment) {
      earnings += item.amount;
    }
  });

  const dashData = {
    doctors: doctors.length,
    appointments: appointments.length,
    patients: users.length,
    earnings,
    latestAppointments: [...appointments].reverse().slice(0, 5),
  };

  return res.status(200).json(new ApiResponse(200, { dashData }, "Dashboard data fetched"));
});

export {
  addDoctor,
  loginAdmin,
  allDoctors,
  appointmentsAdmin,
  appointmentCancel,
  adminDashboard,
};
