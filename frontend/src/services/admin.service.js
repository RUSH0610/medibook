import apiClient from "./apiClient.js";

const admin = { role: "admin" };

export const getAdminDashboard = () => apiClient.get("/api/v1/admin/dashboard", admin);
export const getAllDoctors = () => apiClient.get("/api/v1/admin/doctors", admin);
export const addDoctor = (formData) =>
  apiClient.post("/api/v1/admin/doctors", formData, admin);
export const toggleDoctorAvailability = (doctorId) =>
  apiClient.put(`/api/v1/admin/doctors/${doctorId}/availability`, {}, admin);
export const getAdminAppointments = () => apiClient.get("/api/v1/admin/appointments", admin);
