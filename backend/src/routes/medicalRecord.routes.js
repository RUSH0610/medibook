import express from "express";
import {
  uploadRecord,
  getPatientRecords,
  deleteRecord,
  shareWithDoctor,
  getDoctorSharedRecords,
} from "../controllers/medicalRecordController.js";
import {authUser} from "../middlewares/auth.middleware.js";
import {authDoctor} from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const medicalRecordRouter = express.Router();

// Patient routes
medicalRecordRouter.post(
  "/upload",
  upload.single("file"),
  authUser,
  uploadRecord,
);
medicalRecordRouter.post("/list", authUser, getPatientRecords);
medicalRecordRouter.post("/delete", authUser, deleteRecord);
medicalRecordRouter.post("/share", authUser, shareWithDoctor);

// Doctor route — view records shared with this doctor
medicalRecordRouter.post("/doctor-records", authDoctor, getDoctorSharedRecords);

export default medicalRecordRouter;
