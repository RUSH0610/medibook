import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db, schema } from "../../db/index.js";
import { eq, and, sql, gt } from "drizzle-orm";
import ApiError from "../../utils/ApiError.js";
import { sendOTPEmail } from "../../utils/sendEmail.js";

export const ACCESS_TOKEN_EXPIRY = "15m";
export const REFRESH_TOKEN_DAYS = 7;
export const MAX_OTP_ATTEMPTS = 5;

// Cryptographically secure 6-digit OTP
export const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

// Validates a submitted OTP against a stored record with attempt limiting.
// 5 wrong guesses invalidate the code and throw 429.
export const assertOtpMatches = async (record, submitted, message = "Invalid OTP code") => {
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    await db.delete(schema.otps).where(eq(schema.otps.id, record.id));
    throw new ApiError(429, "Too many incorrect attempts. Please request a new code.", [], "OTP_ATTEMPTS_EXCEEDED");
  }

  const a = Buffer.from(String(record.otpCode));
  const b = Buffer.from(String(submitted ?? "").trim());
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!ok) {
    const nextAttempts = (record.attempts || 0) + 1;
    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      await db.delete(schema.otps).where(eq(schema.otps.id, record.id));
      throw new ApiError(429, "Too many incorrect attempts. Please request a new code.", [], "OTP_ATTEMPTS_EXCEEDED");
    }
    await db
      .update(schema.otps)
      .set({ attempts: nextAttempts })
      .where(eq(schema.otps.id, record.id));
    throw new ApiError(400, message, [], "INVALID_OTP");
  }
};

// Generate Access and Refresh Token pair
export const generateTokens = async (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshTokenRaw = crypto.randomBytes(40).toString("hex");
  const refreshTokenHash = crypto
    .createHash("sha256")
    .update(refreshTokenRaw)
    .digest("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

  await db.insert(schema.refreshTokens).values({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt,
  });

  return { accessToken, refreshToken: refreshTokenRaw };
};

// Register Patient - Step 1: Send OTP
export const register = async ({ name, email, password }) => {
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email));

  if (existing.length) {
    throw new ApiError(400, "Email already registered", [], "EMAIL_ALREADY_EXISTS");
  }

  const otpCode = generateOTP();
  const hashedPassword = await bcrypt.hash(password, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Delete previous unverified registration OTPs for this email
  await db
    .delete(schema.otps)
    .where(
      and(
        eq(schema.otps.email, email),
        eq(schema.otps.purpose, "REGISTRATION")
      )
    );

  await db.insert(schema.otps).values({
    email,
    otpCode,
    purpose: "REGISTRATION",
    payload: { name, password: hashedPassword },
    expiresAt,
  });

  // Always log OTP in non-production environments
  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV] OTP for ${email}: ${otpCode}`);
  }

  try {
    await sendOTPEmail(email, otpCode, name);
  } catch (err) {
    console.warn("[Auth] Failed to send email via Gmail:", err.message);
  }

  return { email };
};

// Register Patient - Step 2: Verify OTP and create account
export const verifyOTP = async ({ email, otp }) => {
  const otpRes = await db
    .select()
    .from(schema.otps)
    .where(
      and(
        eq(schema.otps.email, email),
        eq(schema.otps.purpose, "REGISTRATION"),
        gt(schema.otps.expiresAt, new Date())
      )
    )
    .orderBy(sql`${schema.otps.createdAt} DESC`)
    .limit(1);

  if (!otpRes.length) {
    throw new ApiError(400, "OTP expired or not found. Please register again", [], "INVALID_OTP");
  }

  const record = otpRes[0];
  await assertOtpMatches(record, otp, "Invalid OTP code");

  const { name, password } = record.payload;

  // Insert User + Patient in single transaction
  const newUser = await db.transaction(async (tx) => {
    const uRes = await tx
      .insert(schema.users)
      .values({
        name,
        email,
        passwordHash: password,
        role: "PATIENT",
        isActive: true,
        isVerified: true,
      })
      .returning({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
      });

    const createdUser = uRes[0];

    await tx.insert(schema.patients).values({ userId: createdUser.id });

    // Delete used OTP
    await tx
      .delete(schema.otps)
      .where(
        and(
          eq(schema.otps.email, email),
          eq(schema.otps.purpose, "REGISTRATION")
        )
      );

    return createdUser;
  });

  const { accessToken, refreshToken } = await generateTokens(newUser);

  return { accessToken, refreshToken, user: newUser };
};

// Universal Login: Patients, Doctors, Admins
export const login = async ({ email, password }) => {
  const userRes = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      passwordHash: schema.users.passwordHash,
      role: schema.users.role,
      phone: schema.users.phone,
      avatar_url: schema.users.avatarUrl,
      is_active: schema.users.isActive,
    })
    .from(schema.users)
    .where(eq(schema.users.email, email));

  if (!userRes.length) {
    throw new ApiError(401, "Invalid credentials", [], "INVALID_CREDENTIALS");
  }

  const user = userRes[0];

  if (!user.is_active) {
    throw new ApiError(403, "Account is deactivated. Please contact support.", [], "ACCOUNT_INACTIVE");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials", [], "INVALID_CREDENTIALS");
  }

  const { accessToken, refreshToken } = await generateTokens(user);

  let extra = {};
  if (user.role === "PATIENT") {
    const p = await db
      .select({ id: schema.patients.id })
      .from(schema.patients)
      .where(eq(schema.patients.userId, user.id));
    if (p.length) extra.patientId = p[0].id;
  } else if (user.role === "DOCTOR") {
    const d = await db
      .select({ id: schema.doctors.id, is_approved: schema.doctors.isApproved })
      .from(schema.doctors)
      .where(eq(schema.doctors.userId, user.id));
    if (d.length) {
      extra.doctorId = d[0].id;
      extra.isApproved = d[0].is_approved;
    }
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar_url,
    ...extra,
  };

  return {
    accessToken,
    refreshToken,
    user: safeUser,
    role: user.role.toLowerCase(),
  };
};

// Refresh Access Token with Refresh Token Rotation
export const refresh = async ({ refreshTokenRaw }) => {
  if (!refreshTokenRaw) {
    throw new ApiError(401, "Refresh token required", [], "MISSING_REFRESH_TOKEN");
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshTokenRaw)
    .digest("hex");

  const tokenRes = await db
    .select({
      id: schema.refreshTokens.id,
      userId: schema.refreshTokens.userId,
      tokenHash: schema.refreshTokens.tokenHash,
      expiresAt: schema.refreshTokens.expiresAt,
      isRevoked: schema.refreshTokens.isRevoked,
      user_id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      is_active: schema.users.isActive,
    })
    .from(schema.refreshTokens)
    .innerJoin(schema.users, eq(schema.users.id, schema.refreshTokens.userId))
    .where(eq(schema.refreshTokens.tokenHash, tokenHash));

  if (!tokenRes.length) {
    throw new ApiError(401, "Invalid refresh token", [], "INVALID_REFRESH_TOKEN");
  }

  const storedToken = tokenRes[0];

  if (storedToken.isRevoked) {
    await db
      .update(schema.refreshTokens)
      .set({ isRevoked: true })
      .where(eq(schema.refreshTokens.userId, storedToken.user_id));
    throw new ApiError(401, "Revoked session reuse detected. All sessions terminated.", [], "SESSION_HIJACK_DETECTED");
  }

  if (new Date(storedToken.expiresAt) < new Date()) {
    throw new ApiError(401, "Refresh token has expired. Please log in again.", [], "REFRESH_TOKEN_EXPIRED");
  }

  if (!storedToken.is_active) {
    throw new ApiError(403, "Account is inactive", [], "ACCOUNT_INACTIVE");
  }

  // Rotate Refresh Token
  const newRefreshTokenRaw = crypto.randomBytes(40).toString("hex");
  const newRefreshTokenHash = crypto
    .createHash("sha256")
    .update(newRefreshTokenRaw)
    .digest("hex");

  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + REFRESH_TOKEN_DAYS);

  await db.transaction(async (tx) => {
    await tx
      .update(schema.refreshTokens)
      .set({ isRevoked: true, replacedByToken: newRefreshTokenHash })
      .where(eq(schema.refreshTokens.id, storedToken.id));

    await tx.insert(schema.refreshTokens).values({
      userId: storedToken.user_id,
      tokenHash: newRefreshTokenHash,
      expiresAt: newExpiresAt,
    });
  });

  const newAccessToken = jwt.sign(
    {
      id: storedToken.user_id,
      email: storedToken.email,
      role: storedToken.role,
    },
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshTokenRaw,
  };
};

// Logout Current Session
export const logout = async ({ refreshTokenRaw }) => {
  if (refreshTokenRaw) {
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshTokenRaw)
      .digest("hex");

    await db
      .update(schema.refreshTokens)
      .set({ isRevoked: true })
      .where(eq(schema.refreshTokens.tokenHash, tokenHash));
  }
};

// Logout All Sessions
export const logoutAll = async ({ userId }) => {
  await db
    .update(schema.refreshTokens)
    .set({ isRevoked: true })
    .where(eq(schema.refreshTokens.userId, userId));
};

// Forgot Password
export const forgotPassword = async ({ email }) => {
  const userRes = await db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.email, email));

  if (!userRes.length) {
    return;
  }

  const user = userRes[0];
  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db
    .delete(schema.otps)
    .where(
      and(
        eq(schema.otps.email, email),
        eq(schema.otps.purpose, "PASSWORD_RESET")
      )
    );

  await db.insert(schema.otps).values({
    email,
    otpCode,
    purpose: "PASSWORD_RESET",
    expiresAt,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV] Password reset OTP for ${email}: ${otpCode}`);
  }

  try {
    await sendOTPEmail(email, otpCode, user.name);
  } catch (err) {
    console.warn("[Auth] Failed to send reset email:", err.message);
  }
};

// Reset Password
export const resetPassword = async ({ email, otp, newPassword }) => {
  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long", [], "WEAK_PASSWORD");
  }

  const otpRes = await db
    .select()
    .from(schema.otps)
    .where(
      and(
        eq(schema.otps.email, email),
        eq(schema.otps.purpose, "PASSWORD_RESET"),
        gt(schema.otps.expiresAt, new Date())
      )
    )
    .orderBy(sql`${schema.otps.createdAt} DESC`)
    .limit(1);

  if (!otpRes.length) {
    throw new ApiError(400, "Invalid or expired reset code", [], "INVALID_OTP");
  }

  await assertOtpMatches(otpRes[0], otp, "Invalid or expired reset code");

  const newHash = await bcrypt.hash(newPassword, 10);

  await db.transaction(async (tx) => {
    await tx
      .update(schema.users)
      .set({ passwordHash: newHash, updatedAt: sql`NOW()` })
      .where(eq(schema.users.email, email));

    await tx
      .delete(schema.otps)
      .where(
        and(
          eq(schema.otps.email, email),
          eq(schema.otps.purpose, "PASSWORD_RESET")
        )
      );

    const u = await tx
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email));

    if (u.length) {
      await tx
        .update(schema.refreshTokens)
        .set({ isRevoked: true })
        .where(eq(schema.refreshTokens.userId, u[0].id));
    }
  });
};

// Get Me
export const getMe = async ({ user }) => {
  let profile = { ...user };

  if (user.role === "PATIENT") {
    const p = await db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.userId, user.id));
    if (p.length) profile.patientData = p[0];
  } else if (user.role === "DOCTOR") {
    const d = await db
      .select({
        id: schema.doctors.id,
        userId: schema.doctors.userId,
        specializationId: schema.doctors.specializationId,
        qualification: schema.doctors.qualification,
        experienceYears: schema.doctors.experienceYears,
        bio: schema.doctors.bio,
        consultationFee: schema.doctors.consultationFee,
        licenseNumber: schema.doctors.licenseNumber,
        isApproved: schema.doctors.isApproved,
        isAvailable: schema.doctors.isAvailable,
        hospitalAffiliation: schema.doctors.hospitalAffiliation,
        consultationRoom: schema.doctors.consultationRoom,
        address: schema.doctors.address,
        avgRating: schema.doctors.avgRating,
        totalReviews: schema.doctors.totalReviews,
        speciality: schema.specializations.name,
      })
      .from(schema.doctors)
      .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
      .where(eq(schema.doctors.userId, user.id));
    if (d.length) profile.doctorData = d[0];
  }

  return { user: profile };
};

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
