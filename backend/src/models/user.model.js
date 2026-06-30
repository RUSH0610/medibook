import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, default: "" },
    address: { type: Object, default: { line1: "", line2: "" } },
    gender: { type: String, default: "Not Selected" },
    dob: { type: String, default: "Not Selected" },
    phone: { type: String, default: "" },
    bloodGroup: { type: String, default: "" },

    // NEW: emergency contact
    emergencyContact: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      relation: { type: String, default: "" },
    },

    // NEW: medical history
    allergies: [{ type: String }],
    chronicConditions: [{ type: String }],
    currentMedications: [{ type: String }],
    pastSurgeries: [{ type: String }],

    // NEW: insurance
    insuranceProvider: { type: String, default: "" },
    insurancePolicyNo: { type: String, default: "" },

    // NEW: notifications prefs
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },

    // NEW: account status
    isActive: { type: Boolean, default: true },
    totalAppointments: { type: Number, default: 0 },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true },
);

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
