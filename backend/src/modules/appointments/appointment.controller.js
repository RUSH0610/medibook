import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import * as appointmentService from "./appointment.service.js";

// Concurrency-Safe Appointment Booking
export const bookAppointment = asyncHandler(async (req, res) => {
  const patientUserId = req.user.id;
  const {
    doctorId,
    docId,
    appointmentDate,
    slotDate,
    startTime,
    slotTime,
    appointmentType,
    type,
    reason,
    notes,
    phone,
  } = req.body;

  const targetDoctorId = doctorId || docId;
  let targetDate = appointmentDate || slotDate;
  if (targetDate && targetDate.includes("_")) {
    const [d, m, y] = targetDate.split("_");
    targetDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const targetTime = startTime || slotTime;
  const targetType = appointmentType || type || "in-person";

  const appointment = await appointmentService.bookAppointmentSafe({
    patientUserId,
    doctorId: targetDoctorId,
    appointmentDate: targetDate,
    startTime: targetTime,
    appointmentType: targetType,
    reason: reason || "",
    notes: notes || "",
    phone: phone || "",
  });

  return res.status(201).json(
    new ApiResponse(201, { appointment }, "Appointment Booked")
  );
});

// Get Current Patient's Appointments
export const getMyAppointments = asyncHandler(async (req, res) => {
  const result = await appointmentService.getPatientAppointments({
    patientUserId: req.user.id,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Appointments fetched")
  );
});

// Get Doctor Appointments (Doctor Panel)
export const getDoctorAppointments = asyncHandler(async (req, res) => {
  const result = await appointmentService.getDoctorAppointments({
    doctorId: req.doctorId,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Appointments fetched")
  );
});

// Reschedule Appointment
export const rescheduleAppointment = asyncHandler(async (req, res) => {
  const patientUserId = req.user.id;
  const appointmentId = req.params.id;
  const { newDate, slotDate, newStartTime, slotTime } = req.body;

  let targetDate = newDate || slotDate;
  if (targetDate && targetDate.includes("_")) {
    const [d, m, y] = targetDate.split("_");
    targetDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const targetTime = newStartTime || slotTime;

  const updated = await appointmentService.rescheduleAppointmentSafe({
    appointmentId,
    patientUserId,
    newDate: targetDate,
    newStartTime: targetTime,
  });

  return res.status(200).json(
    new ApiResponse(200, { appointment: updated }, "Appointment Rescheduled Successfully")
  );
});

// Cancel Appointment
export const cancelAppointment = asyncHandler(async (req, res) => {
  const appointmentId = req.params.id;

  const updated = await appointmentService.cancelAppointmentSafe({
    appointmentId,
    user: req.user,
  });

  return res.status(200).json(
    new ApiResponse(200, { appointment: updated }, "Appointment Cancelled")
  );
});

// Complete Appointment (Doctor only)
export const completeAppointment = asyncHandler(async (req, res) => {
  const doctorId = req.doctorId;
  const appointmentId = req.params.id;

  const result = await appointmentService.completeAppointmentSafe({
    appointmentId,
    doctorId,
    user: req.user,
  });

  return res.status(200).json(new ApiResponse(200, null, "Appointment Completed"));
});

export default {
  bookAppointment,
  getMyAppointments,
  getDoctorAppointments,
  rescheduleAppointment,
  cancelAppointment,
  completeAppointment,
};
