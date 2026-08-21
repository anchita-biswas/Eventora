const rateLimit = require("express-rate-limit");

const makeLimiter = (max, keyGenerator, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });

const authLimiter = makeLimiter(
  5,
  (req) => `${req.ip}:${(req.body?.email || "").toLowerCase()}`,
  "Too many attempts, please try again later.",
);

// Keyed by IP alone (not IP+email) — every registration naturally uses a
// new email, so the IP+email limiter never engages against someone creating
// many accounts (and firing an OTP email to each) from one IP.
const registerLimiter = makeLimiter(
  50,
  (req) => req.ip,
  "Too many registration attempts, please try again later.",
);

const bookingOtpLimiter = makeLimiter(
  5,
  (req) => `${req.ip}:${req.user?._id || ""}`,
  "Too many attempts, please try again later.",
);

module.exports = { authLimiter, registerLimiter, bookingOtpLimiter };
