import ApiError from "../../utils/ApiError.js";
import { runSymptomTriage } from "./symptomTriage.service.js";

// AI Symptom Triage Service
export const checkSymptoms = async ({ symptoms }) => {
  if (!symptoms || typeof symptoms !== "string" || symptoms.trim().length < 10) {
    throw new ApiError(
      400,
      "Please describe your symptoms in more detail (at least 10 characters)",
      [],
      "VALIDATION_ERROR"
    );
  }

  return await runSymptomTriage(symptoms);
};

export default {
  checkSymptoms,
  runSymptomTriage,
};
