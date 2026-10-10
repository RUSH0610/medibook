import express from "express";
import {
  uploadRecord,
  getPatientRecords,
  getPatientTimeline,
  deleteRecord,
  shareWithDoctor,
  getDoctorSharedRecords,
} from "./medicalRecord.controller.js";
import { requirePatient, requireDoctor } from "../../middlewares/auth.middleware.js";
import upload from "../../middlewares/upload.middleware.js";

const router = express.Router();

// Patient
router.post("/", requirePatient, upload.single("file"), uploadRecord);
router.get("/my", requirePatient, getPatientRecords);
router.get("/timeline", requirePatient, getPatientTimeline);
router.post("/share", requirePatient, shareWithDoctor);
router.delete("/:id", requirePatient, deleteRecord);

// Doctor
router.get("/shared-with-me", requireDoctor, getDoctorSharedRecords);

export default router;
