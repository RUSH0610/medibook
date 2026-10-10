import apiClient from "./apiClient.js";

const patient = { role: "patient" };

export const uploadMedicalRecord = (formData) =>
  apiClient.post("/api/v1/medical-records", formData, patient);
export const getMyMedicalRecords = () => apiClient.get("/api/v1/medical-records/my", patient);
export const shareRecordWithDoctor = (recordId, doctorId) =>
  apiClient.post("/api/v1/medical-records/share", { recordId, doctorId }, patient);
export const deleteMedicalRecord = (recordId) =>
  apiClient.delete(`/api/v1/medical-records/${recordId}`, patient);
export const getDoctorSharedRecords = () =>
  apiClient.get("/api/v1/medical-records/shared-with-me", { role: "doctor" });
