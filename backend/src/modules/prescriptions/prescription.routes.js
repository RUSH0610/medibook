import express from "express";
import {
  issuePrescription,
  getPatientPrescriptions,
  getDoctorPrescriptions,
  getPrescriptionById,
} from "./prescription.controller.js";
import {
  requireAuth,
  requirePatient,
  requireDoctor,
} from "../../middlewares/auth.middleware.js";
import {
  validateRequest,
  validatePrescription,
} from "../../middlewares/validate.middleware.js";

const router = express.Router();

router.post("/", requireDoctor, validateRequest(validatePrescription), issuePrescription);
router.get("/my", requirePatient, getPatientPrescriptions);
router.get("/doctor", requireDoctor, getDoctorPrescriptions);
router.get("/:id", requireAuth, getPrescriptionById);

export default router;
