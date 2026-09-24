import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { FeeController } from "./fee.controller.js";
import { FeeValidation } from "./fee.validation.js";

const router = Router();

router.post(
  "/",
  auth(Role.ADMIN),
  validateRequest(FeeValidation.CreateFeeZodSchema),
  FeeController.createFee
);

router.get("/my", auth(Role.STUDENT), FeeController.getMyFees);

export const FeeRoutes = router;
