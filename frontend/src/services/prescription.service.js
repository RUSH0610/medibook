import apiClient from "./apiClient.js";

const patient = { role: "patient" };
const doctor = { role: "doctor" };

export const issuePrescription = (data) => apiClient.post("/api/v1/prescriptions", data, doctor);
export const getDoctorPrescriptions = () => apiClient.get("/api/v1/prescriptions/doctor", doctor);
export const getMyPrescriptions = () => apiClient.get("/api/v1/prescriptions/my", patient);
