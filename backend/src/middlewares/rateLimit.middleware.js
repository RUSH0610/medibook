import ApiError from "../utils/ApiError.js";

// In-memory sliding-window rate limiter middleware
// Tracks requests per client IP within a configurable time window
export const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 60, message = "Too many requests. Please try again later." } = {}) => {
  const hits = new Map();

  // Periodic cleanup of stale entries every 5 minutes
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.startTime > windowMs) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (interval.unref) interval.unref();

  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
    const now = Date.now();

    let record = hits.get(ip);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      hits.set(ip, record);
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      return next(new ApiError(429, message, [], "RATE_LIMIT_EXCEEDED"));
    }

    next();
  };
};

export default rateLimit;
