import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { AdminController } from "./admin.controller.js";
import { AdminValidation } from "./admin.validation.js";

const router = Router();

// Every route here requires an authenticated ADMIN (VC / Registrar / Finance
// / Super — all share the ADMIN role). Finer-grained checks — e.g. only
// VC/SUPER may create other admins — happen inside admin.service.ts, since
// AdminType isn't part of the 3 fixed roles checkAuth enforces.

router.post(
  "/faculty",
  auth(Role.ADMIN),
  validateRequest(AdminValidation.CreateFacultyZodSchema),
  AdminController.createFaculty
);

router.post(
  "/admins",
  auth(Role.ADMIN),
  validateRequest(AdminValidation.CreateAdminZodSchema),
  AdminController.createAdmin
);

router.patch(
  "/faculty/:facultyProfileId/department-head",
  auth(Role.ADMIN),
  AdminController.assignDepartmentHead
);

router.get("/users", auth(Role.ADMIN), AdminController.getAllUsers);

router.patch(
  "/users/:userId/status",
  auth(Role.ADMIN),
  validateRequest(AdminValidation.UpdateUserStatusZodSchema),
  AdminController.updateUserStatus
);

router.get("/dashboard-stats", auth(Role.ADMIN), AdminController.getDashboardStats);

router.get("/audit-logs", auth(Role.ADMIN), AdminController.getAuditLogs);

export const AdminRoutes = router;
