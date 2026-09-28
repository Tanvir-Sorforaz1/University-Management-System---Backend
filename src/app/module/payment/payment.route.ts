import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { paymentRateLimiter } from "../../middleware/rateLimiter.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { PaymentController } from "./payment.controller.js";
import { PaymentValidation } from "./payment.validation.js";

const router = Router();

router.post(
  "/initiate",
  auth(Role.STUDENT),
  paymentRateLimiter,
  validateRequest(PaymentValidation.InitiatePaymentZodSchema),
  PaymentController.initiatePayment
);

// No auth — bKash redirects the student's browser here directly after
// checkout. Finalized server-side via executeBkashPayment inside the
// service; the query string alone is never trusted.
router.get("/callback", PaymentController.handleCallback);

router.get("/:id", auth(), PaymentController.getPaymentById);

export const PaymentRoutes = router;
