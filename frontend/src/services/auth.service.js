import apiClient from "./apiClient.js";

// One endpoint logs in patients, doctors and admins
export const login = (data) => apiClient.post("/api/v1/auth/login", data);
export const register = (data) => apiClient.post("/api/v1/auth/register", data);
export const verifyOTP = (data) => apiClient.post("/api/v1/auth/verify-otp", data);
export const forgotPassword = (data) => apiClient.post("/api/v1/auth/forgot-password", data);
export const resetPassword = (data) => apiClient.post("/api/v1/auth/reset-password", data);
export const logout = () => apiClient.post("/api/v1/auth/logout");
