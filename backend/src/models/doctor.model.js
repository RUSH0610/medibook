import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, required: true },
    speciality: { type: String, required: true },
    degree: { type: String, required: true },
    experience: { type: String, required: true },
    about: { type: String, required: true },
    available: { type: Boolean, default: true },
    fees: { type: Number, required: true },
    address: { type: Object, required: true },
    date: { type: Number, required: true },
    slots_booked: { type: Object, default: {} },

    // NEW: contact & social
    phone: { type: String, default: "" },
    languages: [{ type: String }],
    hospitalAffiliation: { type: String, default: "" },
    consultationRoom: { type: String, default: "" },

    // NEW: stats
    totalAppointments: { type: Number, default: 0 },
    completedAppointments: { type: Number, default: 0 },
    cancelledAppointments: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },

    // NEW: availability settings
    maxAppointmentsPerDay: { type: Number, default: 20 },
    slotDuration: { type: Number, default: 30 }, // minutes
    workingDays: [{ type: String }], // ['Mon','Tue',...]
    workingHoursStart: { type: String, default: "09:00" },
    workingHoursEnd: { type: String, default: "17:00" },

    // NEW: verification
    isVerified: { type: Boolean, default: false },
    licenseNumber: { type: String, default: "" },
    onLeave: { type: Boolean, default: false },
    leaveUntil: { type: String, default: "" },
  },
  { minimize: false, timestamps: true }
);

doctorSchema.index({ speciality: 1 })
doctorSchema.index({ available: 1 })

const doctorModel =
  mongoose.models.doctor || mongoose.model("doctor", doctorSchema);

export default doctorModel;
