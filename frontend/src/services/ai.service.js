import apiClient from "./apiClient.js";

export const checkSymptoms = (symptoms) =>
  apiClient.post("/api/v1/ai/symptom-check", { symptoms }, { role: "patient" });
