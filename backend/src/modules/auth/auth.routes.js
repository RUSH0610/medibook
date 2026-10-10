import express from "express";
import {
  register,
  verifyOTP,
  login,
  refresh,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  getMe,
} from "./auth.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  validateRequest,
  validateRegistration,
  validateLogin,
} from "../../middlewares/validate.middleware.js";
import { rateLimit } from "../../middlewares/rateLimit.middleware.js";

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: "Too many auth requests. Please try again later." });

const router = express.Router();

router.post("/register", authLimiter, validateRequest(validateRegistration), register);
router.post("/verify-otp", authLimiter, verifyOTP);
router.post("/login", authLimiter, validateRequest(validateLogin), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", requireAuth, logoutAll);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", requireAuth, getMe);

export default router;
