import express from "express";
import {
  getDoctors,
  getSpecializations,
  getDoctorById,
  getDoctorAvailability,
  getDoctorAnalytics,
  getMyDoctorProfile,
  updateDoctorProfile,
  changeAvailability,
  getDoctorLeaves,
  addDoctorLeave,
  removeDoctorLeave,
} from "./doctor.controller.js";
import { requireDoctor } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// Public
router.get("/", getDoctors);
router.get("/specializations", getSpecializations);

// Doctor panel (must be declared before "/:id")
router.get("/me/analytics", requireDoctor, getDoctorAnalytics);
router.get("/me/profile", requireDoctor, getMyDoctorProfile);
router.put("/me/profile", requireDoctor, updateDoctorProfile);
router.post("/me/toggle-availability", requireDoctor, changeAvailability);
router.get("/me/leaves", requireDoctor, getDoctorLeaves);
router.post("/me/leaves", requireDoctor, addDoctorLeave);
router.delete("/me/leaves/:id", requireDoctor, removeDoctorLeave);

// Public doctor detail + bookable slots
router.get("/:id/availability", getDoctorAvailability);
router.get("/:id", getDoctorById);

export default router;
