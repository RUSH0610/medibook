import express from "express"
import cors from "cors"
import userRouter   from "./routes/user.routes.js"
import doctorRouter from "./routes/doctor.routes.js"
import adminRouter  from "./routes/admin.routes.js"
import prescriptionRouter  from "./routes/prescription.routes.js"
import medicalRecordRouter from "./routes/medicalRecord.routes.js"
import reviewRouter        from "./routes/review.routes.js"
import notificationRouter  from "./routes/notification.routes.js"


const app = express()
app.use(express.json())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))


app.use("/api/v1/users",   userRouter)
app.use("/api/v1/doctors", doctorRouter)
app.use("/api/v1/admin",   adminRouter)
app.use("/api/v1/prescriptions",    prescriptionRouter)
app.use("/api/v1/medical-records",  medicalRecordRouter)
app.use("/api/v1/reviews",          reviewRouter)
app.use("/api/v1/notifications",    notificationRouter)


app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() })
})

// global error middleware — must be last
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500
  const message    = err.message    || "Internal Server Error"
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || []
  })
})

export default app
