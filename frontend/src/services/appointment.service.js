import apiClient from "./apiClient.js";

const patient = { role: "patient" };
const doctor = { role: "doctor" };

// Patient
export const bookAppointment = (data) => apiClient.post("/api/v1/appointments", data, patient);
export const getMyAppointments = () => apiClient.get("/api/v1/appointments/my", patient);
export const rescheduleAppointment = (id, data) =>
  apiClient.post(`/api/v1/appointments/${id}/reschedule`, data, patient);

// Doctor
export const getDoctorAppointments = () => apiClient.get("/api/v1/appointments/doctor", doctor);
export const completeAppointment = (id) => apiClient.post(`/api/v1/appointments/${id}/complete`, {}, doctor);

// Shared: patient owner, treating doctor or admin. `role` selects which session to use.
export const cancelAppointment = (id, role = "patient") =>
  apiClient.post(`/api/v1/appointments/${id}/cancel`, {}, { role });
