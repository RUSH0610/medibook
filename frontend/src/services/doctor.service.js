import apiClient from "./apiClient.js";

const doctor = { role: "doctor" };

// Public
export const getDoctors = () => apiClient.get("/api/v1/doctors");
export const getDoctorSlots = (doctorId, date) =>
  apiClient.get(`/api/v1/doctors/${doctorId}/availability`, { params: { date } });

// Doctor panel
export const getDoctorProfile = () => apiClient.get("/api/v1/doctors/me/profile", doctor);
export const updateDoctorProfile = (data) => apiClient.put("/api/v1/doctors/me/profile", data, doctor);
export const getDoctorDashboard = () => apiClient.get("/api/v1/doctors/me/analytics", doctor);
