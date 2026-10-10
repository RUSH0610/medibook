import validator from "validator";
import ApiError from "../utils/ApiError.js";

// Higher-order middleware to run field-level validations
// @param {Function} validatorFn - Function receiving req and returning array of { field, message } errors
// @param {number} statusCode - HTTP status code on validation failure (default: 400)
export const validateRequest = (validatorFn, statusCode = 400) => (req, res, next) => {
  const errors = validatorFn(req);
  if (errors && errors.length > 0) {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: errors[0]?.message || "Validation failed",
      code: "VALIDATION_ERROR",
      errors,
    });
  }
  next();
};

// Common validation rules and helper functions
export const rules = {
  isUUID(val) {
    if (!val || typeof val !== "string") return false;
    return validator.isUUID(val);
  },

  isEmail(val) {
    if (!val || typeof val !== "string") return false;
    return validator.isEmail(val);
  },

  isStrongPassword(val) {
    if (!val || typeof val !== "string") return false;
    return val.length >= 8;
  },

  isDateString(val) {
    if (!val || typeof val !== "string") return false;
    // Match YYYY-MM-DD or DD_MM_YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(Date.parse(val))) return true;
    if (/^\d{1,2}_\d{1,2}_\d{4}$/.test(val)) return true;
    return false;
  },

  isTimeString(val) {
    if (!val || typeof val !== "string") return false;
    // HH:mm or HH:mm:ss or 12h format "10:00 AM"
    return /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?(\s?[AP]M)?$/i.test(val.trim());
  },

  isNonEmptyString(val) {
    return typeof val === "string" && val.trim().length > 0;
  },

  isRating(val) {
    const num = Number(val);
    return Number.isInteger(num) && num >= 1 && num <= 5;
  },

  isAppointmentType(val) {
    return ["in-person", "video", "phone"].includes(val);
  },

  isAppointmentStatus(val) {
    return ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(val);
  },
};

// Validation Rule Sets
export const validateRegistration = (req) => {
  const errors = [];
  const { name, email, password } = req.body || {};

  if (!rules.isNonEmptyString(name)) {
    errors.push({ field: "name", message: "Name is required" });
  }
  if (!rules.isEmail(email)) {
    errors.push({ field: "email", message: "A valid email address is required" });
  }
  if (!rules.isStrongPassword(password)) {
    errors.push({ field: "password", message: "Password must be at least 8 characters long" });
  }

  return errors;
};

export const validateLogin = (req) => {
  const errors = [];
  const { email, password } = req.body || {};

  if (!rules.isEmail(email)) {
    errors.push({ field: "email", message: "Please enter a valid email address" });
  }
  if (!rules.isNonEmptyString(password)) {
    errors.push({ field: "password", message: "Password is required" });
  }

  return errors;
};

// Section 5.d validations:
export const validateBookAppointment = (req) => {
  const errors = [];
  const { doctorId, docId, appointmentDate, slotDate, startTime, slotTime, appointmentType, type } = req.body || {};

  const targetDoc = doctorId || docId;
  const targetDate = appointmentDate || slotDate;
  const targetTime = startTime || slotTime;
  const targetType = appointmentType || type || "in-person";

  if (!rules.isNonEmptyString(targetDoc)) {
    errors.push({ field: "doctorId", message: "Doctor ID is required" });
  }
  if (!rules.isDateString(targetDate)) {
    errors.push({ field: "appointmentDate", message: "Valid appointment date is required" });
  }
  if (!rules.isTimeString(targetTime)) {
    errors.push({ field: "startTime", message: "Valid start time is required" });
  }
  if (!rules.isAppointmentType(targetType)) {
    errors.push({ field: "appointmentType", message: "Invalid appointment type (in-person, video, phone)" });
  }

  return errors;
};

export const validateRescheduleAppointment = (req) => {
  const errors = [];
  const { newDate, slotDate, newStartTime, slotTime } = req.body || {};

  const targetDate = newDate || slotDate;
  const targetTime = newStartTime || slotTime;

  if (!rules.isDateString(targetDate)) {
    errors.push({ field: "newDate", message: "Valid new appointment date is required" });
  }
  if (!rules.isTimeString(targetTime)) {
    errors.push({ field: "newStartTime", message: "Valid new start time is required" });
  }

  return errors;
};

export const validatePrescription = (req) => {
  const errors = [];
  const { appointmentId, diagnosis } = req.body || {};

  if (!rules.isNonEmptyString(appointmentId)) {
    errors.push({ field: "appointmentId", message: "Appointment ID is required" });
  }
  if (!rules.isNonEmptyString(diagnosis)) {
    errors.push({ field: "diagnosis", message: "Diagnosis is required" });
  }

  return errors;
};

export const validateReview = (req) => {
  const errors = [];
  const { appointmentId, rating } = req.body || {};

  if (!rules.isNonEmptyString(appointmentId)) {
    errors.push({ field: "appointmentId", message: "Appointment ID is required" });
  }
  if (!rules.isRating(rating)) {
    errors.push({ field: "rating", message: "Rating must be an integer between 1 and 5" });
  }

  return errors;
};

export default {
  validateRequest,
  rules,
  validateRegistration,
  validateLogin,
  validateBookAppointment,
  validateRescheduleAppointment,
  validatePrescription,
  validateReview,
};
