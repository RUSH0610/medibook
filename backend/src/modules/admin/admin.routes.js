import express from "express";
import {
  addDoctor,
  getAllDoctorsAdmin,
  toggleDoctorApproval,
  getAllUsersAdmin,
  toggleUserStatus,
  getAllAppointmentsAdmin,
  getAdminDashboard,
} from "./admin.controller.js";
import upload from "../../middlewares/upload.middleware.js";
import { requireAdmin } from "../../middlewares/auth.middleware.js";
import { adminChangeAvailability } from "../doctors/doctor.controller.js";

const router = express.Router();

// Every admin route requires the ADMIN role
router.use(requireAdmin);

router.get("/dashboard", getAdminDashboard);

// Doctors
router.get("/doctors", getAllDoctorsAdmin);
router.post("/doctors", upload.single("image"), addDoctor);
router.put("/doctors/:id/approval", toggleDoctorApproval);
router.put("/doctors/:id/availability", adminChangeAvailability);

// Users
router.get("/users", getAllUsersAdmin);
router.put("/users/:id/status", toggleUserStatus);

// Appointments (cancel via POST /appointments/:id/cancel, which allows ADMIN)
router.get("/appointments", getAllAppointmentsAdmin);

export default router;
