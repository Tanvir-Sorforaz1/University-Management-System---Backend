import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { EnrollmentController } from "./enrollment.controller.js";
import { EnrollmentValidation } from "./enrollment.validation.js";

const router = Router();

router.post(
  "/",
  auth(Role.STUDENT),
  validateRequest(EnrollmentValidation.CreateEnrollmentZodSchema),
  EnrollmentController.createEnrollment
);

router.get("/my", auth(Role.STUDENT), EnrollmentController.getMyEnrollments);

export const EnrollmentRoutes = router;
