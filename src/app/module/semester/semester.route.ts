import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { SemesterController } from "./semester.controller.js";
import { SemesterValidation } from "./semester.validation.js";

const router = Router();

// ?department=CSE&page=1&limit=10
router.get("/", auth(), SemesterController.getAllSemesters);
router.get("/:id", auth(), SemesterController.getSemesterById);

router.patch(
  "/:id",
  auth(Role.ADMIN),
  validateRequest(SemesterValidation.UpdateSemesterZodSchema),
  SemesterController.updateSemester
);

export const SemesterRoutes = router;
