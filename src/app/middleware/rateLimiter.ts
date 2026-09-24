import rateLimit from "express-rate-limit";
import config from "../config/index.js";

const rateLimitedResponse = (message: string) => ({
  success: false,
  message,
});

/** General-purpose limiter applied globally in app.ts */
export const generalRateLimiter = rateLimit({
  windowMs: Number(config.rate_limit_window_ms) || 15 * 60 * 1000,
  limit: Number(config.rate_limit_max) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedResponse("Too many requests, please try again later"),
});

/** Stricter limiter for auth routes (register/verify-email/login) to slow brute-force attempts */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedResponse(
    "Too many attempts on this endpoint, please try again later"
  ),
});

/** Limiter for payment initiation to prevent abuse of the payment gateway */
export const paymentRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitedResponse("Too many payment requests, please slow down"),
});
