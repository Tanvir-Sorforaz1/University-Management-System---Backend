import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { ResultController } from "./result.controller.js";
import { ResultValidation } from "./result.validation.js";

const router = Router();

router.post(
  "/",
  auth(Role.FACULTY),
  validateRequest(ResultValidation.CreateResultZodSchema),
  ResultController.createResult
);

router.get("/my", auth(Role.STUDENT), ResultController.getMyResults);

router.patch(
  "/:id",
  auth(Role.FACULTY, Role.ADMIN),
  validateRequest(ResultValidation.UpdateResultZodSchema),
  ResultController.updateResult
);

export const ResultRoutes = router;
