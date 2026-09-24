import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { AttendanceController } from "./attendance.controller.js";
import { AttendanceValidation } from "./attendance.validation.js";

const router = Router();

router.post(
  "/",
  auth(Role.FACULTY),
  validateRequest(AttendanceValidation.MarkAttendanceZodSchema),
  AttendanceController.markAttendance
);

router.get("/my", auth(Role.STUDENT), AttendanceController.getMyAttendance);
router.get("/:id", auth(Role.FACULTY, Role.ADMIN), AttendanceController.getAttendanceById);

export const AttendanceRoutes = router;
