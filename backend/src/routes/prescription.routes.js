import express from "express";
import {
  issuePrescription,
  getPatientPrescriptions,
  getDoctorPrescriptions,
  getPrescriptionById,
} from "../controllers/prescriptionController.js";
import {authDoctor,authUser} from "../middlewares/auth.middleware.js";


const prescriptionRouter = express.Router();

prescriptionRouter.post("/issue", authDoctor, issuePrescription);
prescriptionRouter.post("/patient-list", authUser, getPatientPrescriptions);
prescriptionRouter.get("/doctor-list", authDoctor, getDoctorPrescriptions);
prescriptionRouter.get("/:id", getPrescriptionById);

export default prescriptionRouter;
