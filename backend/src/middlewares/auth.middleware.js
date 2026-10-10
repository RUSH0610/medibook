import jwt from "jsonwebtoken";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import ApiError from "../utils/ApiError.js";

// Extract the bearer token from the Authorization header
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
};

// Core Authentication Middleware
// Decodes JWT, validates existence and active status in PostgreSQL,
// and attaches full user context + role entity IDs (patientId, doctorId).
export const authenticateToken = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new ApiError(401, "Authentication token required", [], "UNAUTHORIZED");
    }

    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET
      );
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new ApiError(401, "Access token has expired. Please refresh your session.", [], "TOKEN_EXPIRED");
      }
      throw new ApiError(401, "Invalid authentication token", [], "INVALID_TOKEN");
    }

    // Verify user in PostgreSQL via Drizzle
    const userRes = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        phone: schema.users.phone,
        avatar_url: schema.users.avatarUrl,
        is_active: schema.users.isActive,
        is_verified: schema.users.isVerified,
      })
      .from(schema.users)
      .where(eq(schema.users.id, decoded.id));

    if (!userRes.length) {
      throw new ApiError(401, "User account no longer exists", [], "USER_NOT_FOUND");
    }

    const user = userRes[0];

    if (!user.is_active) {
      throw new ApiError(403, "Your account has been deactivated. Please contact support.", [], "ACCOUNT_INACTIVE");
    }

    req.user = user;
    req.userId = user.id;

    // Attach role-specific entity IDs
    if (user.role === "PATIENT") {
      const pRes = await db
        .select({ id: schema.patients.id })
        .from(schema.patients)
        .where(eq(schema.patients.userId, user.id));
      if (pRes.length) {
        req.patientId = pRes[0].id;
      }
    } else if (user.role === "DOCTOR") {
      const dRes = await db
        .select({ id: schema.doctors.id })
        .from(schema.doctors)
        .where(eq(schema.doctors.userId, user.id));
      if (dRes.length) {
        req.doctorId = dRes[0].id;
        req.docId = dRes[0].id; // backward compatibility
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Role-Based Access Control Middleware Generator
// @param  {...string} allowedRoles - 'PATIENT', 'DOCTOR', 'ADMIN'
export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, "Authentication required", [], "UNAUTHORIZED"));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(
      new ApiError(
        403,
        `Forbidden: Role '${req.user.role}' lacks permission for this resource`,
        [],
        "FORBIDDEN_ROLE"
      )
    );
  }

  next();
};

export const requireAuth = authenticateToken;
export const requirePatient = [authenticateToken, requireRole("PATIENT")];
export const requireDoctor = [authenticateToken, requireRole("DOCTOR")];
export const requireAdmin = [authenticateToken, requireRole("ADMIN")];

export default {
  authenticateToken,
  requireAuth,
  requireRole,
  requirePatient,
  requireDoctor,
  requireAdmin,
};
