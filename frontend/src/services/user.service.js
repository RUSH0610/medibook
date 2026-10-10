import apiClient from "./apiClient.js";

const patient = { role: "patient" };

export const getUserProfile = () => apiClient.get("/api/v1/users/profile", patient);
export const updateUserProfile = (data) =>
  apiClient.put("/api/v1/users/profile", data, patient);
