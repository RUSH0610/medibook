import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/ApiResponse.js";
import * as authService from "./auth.service.js";

const REFRESH_TOKEN_DAYS = 7;

// Set HTTP-Only Refresh Token Cookie
const setRefreshTokenCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    path: "/api/v1/auth",
  });
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const result = await authService.register({ name, email, password });
  return res.status(200).json(
    new ApiResponse(200, result, "Verification OTP sent to your email")
  );
});

export const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const { accessToken, refreshToken, user } = await authService.verifyOTP({ email, otp });
  setRefreshTokenCookie(res, refreshToken);
  return res.status(201).json(
    new ApiResponse(201, { accessToken, user }, "Account created successfully")
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { accessToken, refreshToken, user, role } = await authService.login({ email, password });
  setRefreshTokenCookie(res, refreshToken);
  return res.status(200).json(
    new ApiResponse(200, { accessToken, user, role }, "Login successful")
  );
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshTokenRaw = req.cookies?.refreshToken || req.body?.refreshToken;
  const { accessToken, refreshToken } = await authService.refresh({ refreshTokenRaw });
  setRefreshTokenCookie(res, refreshToken);
  return res.status(200).json(
    new ApiResponse(200, { accessToken }, "Token refreshed successfully")
  );
});

export const logout = asyncHandler(async (req, res) => {
  const refreshTokenRaw = req.cookies?.refreshToken || req.body?.refreshToken;
  await authService.logout({ refreshTokenRaw });
  res.clearCookie("refreshToken", { path: "/api/v1/auth" });
  return res.status(200).json(new ApiResponse(200, null, "Logged out successfully"));
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll({ userId: req.user.id });
  res.clearCookie("refreshToken", { path: "/api/v1/auth" });
  return res.status(200).json(new ApiResponse(200, null, "All sessions terminated successfully"));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.forgotPassword({ email });
  return res.status(200).json(
    new ApiResponse(200, null, "If that email exists, a password reset code has been sent.")
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  await authService.resetPassword({ email, otp, newPassword });
  return res.status(200).json(new ApiResponse(200, null, "Password reset successfully. Please log in."));
});

export const getMe = asyncHandler(async (req, res) => {
  const result = await authService.getMe({ user: req.user });
  return res.status(200).json(new ApiResponse(200, result, "Current user fetched"));
});

export default {
  register,
  verifyOTP,
  login,
  refresh,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  getMe,
};
