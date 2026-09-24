import type { AdminType, Department } from "../../../../generated/prisma/enums.js";

/**
 * Creates a new FACULTY account. Can optionally be marked as the
 * department head — any existing head in that department is
 * automatically demoted (enforced in admin.service.ts).
 */
export interface ICreateFacultyPayload {
  name: string;
  email: string;
  password: string;
  department: Department;
  facultyId?: string; // auto-generated when omitted
  designation?: string;
  isDepartmentHead?: boolean;
  phone?: string;
}

/**
 * Restricted in admin.service.ts to only VC/SUPER admins — see comment there.
 */
export interface ICreateAdminPayload {
  name: string;
  email: string;
  password: string;
  adminType: AdminType;
}

export interface IUpdateUserStatusPayload {
  isActive: boolean;
}
