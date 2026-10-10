import express from "express";
import {
  bookAppointment,
  getMyAppointments,
  getDoctorAppointments,
  rescheduleAppointment,
  cancelAppointment,
  completeAppointment,
} from "./appointment.controller.js";
import {
  requireAuth,
  requirePatient,
  requireDoctor,
} from "../../middlewares/auth.middleware.js";
import {
  validateRequest,
  validateBookAppointment,
  validateRescheduleAppointment,
} from "../../middlewares/validate.middleware.js";

const router = express.Router();

// Patient
router.post("/", requirePatient, validateRequest(validateBookAppointment), bookAppointment);
router.get("/my", requirePatient, getMyAppointments);
router.post("/:id/reschedule", requirePatient, validateRequest(validateRescheduleAppointment), rescheduleAppointment);

// Doctor
router.get("/doctor", requireDoctor, getDoctorAppointments);
router.post("/:id/complete", requireDoctor, completeAppointment);

// Patient owner, treating doctor or admin (ownership verified in service)
router.post("/:id/cancel", requireAuth, cancelAppointment);

export default router;
