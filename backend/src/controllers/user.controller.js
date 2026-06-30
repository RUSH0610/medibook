import validator from "validator";
import bycrypt from "bcrypt";
import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctor.model.js";
import appointmentModel from "../models/appointment.model.js";
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

// API to register user
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "Missing Details");
  }

  // validating email format
  if (!validator.isEmail(email)) {
    throw new ApiError(400, "enter a valid email");
  }

  // validating strong password
  if (password.length < 8) {
    throw new ApiError(400, "enter a strong password");
  }

  // check for duplicate email
  const existing = await userModel.findOne({ email });
  if (existing) throw new ApiError(400, "Email already registered");

  // hashing user password
  const salt = await bycrypt.genSalt(10);
  const hashedPassword = await bycrypt.hash(password, salt);

  const userData = {
    name,
    email,
    password: hashedPassword,
  };

  const newUser = new userModel(userData);
  const user = await newUser.save();

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  return res.status(200).json(new ApiResponse(200, { token }, "Registration successful"));
});

// API for user login
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isMatch = await bycrypt.compare(password, user.password);

  if (isMatch) {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.status(200).json(new ApiResponse(200, { token }, "Login successful"));
  } else {
    throw new ApiError(401, "Invalid credentials");
  }
});

// API to get user profile data
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const useData = await userModel.findById(userId).select("-password");

  return res.status(200).json(new ApiResponse(200, { userData: useData }, "Profile fetched"));
});

// API to update user profile
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { name, phone, address, dob, gender, bloodGroup, insuranceProvider, insurancePolicyNo } = req.body;
  const imageFile = req.file;

  if (!name) {
    throw new ApiError(400, "Name is required");
  }

  const updateFields = {
    name,
    phone: phone || "",
    dob: dob || "",
    gender: gender || "",
    bloodGroup: bloodGroup || "",
    insuranceProvider: insuranceProvider || "",
    insurancePolicyNo: insurancePolicyNo || "",
  };

  // Handle address — can be an object or JSON string
  if (address !== undefined) {
    updateFields.address = typeof address === "string" ? JSON.parse(address) : address;
  }

  await userModel.findByIdAndUpdate(userId, updateFields);

  if (imageFile) {
    // upload image to cloudinary via stream (memoryStorage buffer)
    const uploadResult = await streamUpload(imageFile.buffer, { resource_type: "image" });
    await userModel.findByIdAndUpdate(userId, { image: uploadResult.secure_url });
  }

  return res.status(200).json(new ApiResponse(200, null, "Profile Updated"));
});

// API to book appointment
const bookAppointment = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { docId, slotDate, slotTime, reason, type, phone } = req.body;

  const slotKey = `slots_booked.${slotDate}`;

  // Atomic: only update if doctor exists AND slot not already taken
  const updatedDoctor = await doctorModel.findOneAndUpdate(
    { _id: docId, [slotKey]: { $ne: slotTime } },
    { $push: { [slotKey]: slotTime } },
    { new: true }
  );

  if (!updatedDoctor) {
    // Could be doctor not found OR slot already taken — distinguish the two
    const exists = await doctorModel.exists({ _id: docId });
    if (!exists) throw new ApiError(404, "Doctor not found");
    throw new ApiError(409, "Slot not available");
  }

  const docData = updatedDoctor.toObject();

  const userData = await userModel.findById(userId).select("-password");

  delete docData.slots_booked;
  delete docData.password;

  const appointmentData = {
    userId,
    docId,
    userData,
    docData,
    amount: docData.fees,
    slotTime,
    slotDate,
    date: Date.now(),
    reason: reason || "",
    type: type || "in-person",
    phone: type === "video" || type === "phone" ? phone || "" : "",
  };

  const newAppointment = new appointmentModel(appointmentData);
  await newAppointment.save();

  return res.status(200).json(new ApiResponse(200, null, "Appointment Booked"));

});

// API to get user appointments for frontend my-appointments page
const listAppointment = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const appointments = await appointmentModel.find({ userId });

  return res.status(200).json(new ApiResponse(200, { appointments }, "Appointments fetched"));
});

// API to cancel appointment
const cancelAppointment = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { appointmentId } = req.body;

  const appointmentData = await appointmentModel.findById(appointmentId);

  // verify appointment user
  if (appointmentData.userId.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized action");
  }

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

export {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
};
