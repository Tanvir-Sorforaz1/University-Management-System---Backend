import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { ExamController } from "./exam.controller.js";
import { ExamValidation } from "./exam.validation.js";

const router = Router();

router.post(
  "/",
  auth(Role.FACULTY),
  validateRequest(ExamValidation.CreateExamZodSchema),
  ExamController.createExam
);

router.get("/:id", auth(), ExamController.getExamById);

router.patch(
  "/:id",
  auth(Role.FACULTY, Role.ADMIN),
  validateRequest(ExamValidation.UpdateExamZodSchema),
  ExamController.updateExam
);

router.delete("/:id", auth(Role.FACULTY, Role.ADMIN), ExamController.deleteExam);

export const ExamRoutes = router;
