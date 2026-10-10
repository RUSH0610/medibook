import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/ApiResponse.js";
import * as aiService from "./ai.service.js";

// AI Symptom Triage & Navigation
export const checkSymptoms = asyncHandler(async (req, res) => {
  const { symptoms } = req.body;
  const result = await aiService.checkSymptoms({ symptoms });
  return res.status(200).json(
    new ApiResponse(200, result, "Symptoms analyzed successfully")
  );
});

export default {
  checkSymptoms,
};
