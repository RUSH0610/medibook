import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/ApiResponse.js";
import * as userService from "./user.service.js";

// Get Patient Profile Data
export const getProfile = asyncHandler(async (req, res) => {
  const result = await userService.getProfile({ userId: req.user.id });
  return res.status(200).json(
    new ApiResponse(200, result, "Profile fetched")
  );
});

// Update Patient Profile Data
export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    name,
    phone,
    address,
    dob,
    gender,
    bloodGroup,
    insuranceProvider,
    insurancePolicyNo,
    emergencyContact,
  } = req.body;
  const imageFile = req.file;

  await userService.updateProfile({
    userId,
    name,
    phone,
    address,
    dob,
    gender,
    bloodGroup,
    insuranceProvider,
    insurancePolicyNo,
    emergencyContact,
    imageFile,
  });

  return res.status(200).json(new ApiResponse(200, null, "Profile Updated"));
});

export default { getProfile, updateProfile };
