import { Router } from "express";

import authRouter from "../modules/auth/auth.routes.js";
import userRouter from "../modules/users/user.routes.js";
import doctorRouter from "../modules/doctors/doctor.routes.js";
import adminRouter from "../modules/admin/admin.routes.js";
import appointmentRouter from "../modules/appointments/appointment.routes.js";
import prescriptionRouter from "../modules/prescriptions/prescription.routes.js";
import medicalRecordRouter from "../modules/medicalRecords/medicalRecord.routes.js";
import reviewRouter from "../modules/reviews/review.routes.js";
import notificationRouter from "../modules/notifications/notification.routes.js";
import aiRouter from "../modules/ai/ai.routes.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/doctors", doctorRouter);
router.use("/admin", adminRouter);
router.use("/appointments", appointmentRouter);
router.use("/prescriptions", prescriptionRouter);
router.use("/medical-records", medicalRecordRouter);
router.use("/reviews", reviewRouter);
router.use("/notifications", notificationRouter);
router.use("/ai", aiRouter);

export default router;
