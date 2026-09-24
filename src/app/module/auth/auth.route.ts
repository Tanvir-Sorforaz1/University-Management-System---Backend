import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { AuthController } from "./auth.controller.js";
import { AuthValidation } from "./auth.validation.js";

const router = Router();

// Public self-registration always creates a STUDENT account.
router.post(
  "/register",
  validateRequest(AuthValidation.RegisterStudentZodSchema),
  AuthController.registerStudent
);

router.post(
  "/verify-email",
  validateRequest(AuthValidation.VerifyEmailZodSchema),
  AuthController.verifyEmail

)

router.post(
  "/login",
  validateRequest(AuthValidation.LoginZodSchema),
  AuthController.loginUser
);

router.get(
  "/me",
  auth(Role.STUDENT, Role.FACULTY, Role.ADMIN),
  AuthController.getMe
);

router.post("/refresh-token", AuthController.refreshToken);

router.post("/logout", auth(), AuthController.logout);

export const AuthRoutes = router;
