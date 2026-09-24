import type { Department, Role } from "../../../../generated/prisma/enums.js";

/**
 * Public self-registration only ever creates a STUDENT account.
 * FACULTY and ADMIN accounts are created by an ADMIN through the
 * admin module (admin.service.ts) — never through this endpoint.
 */
export interface IRegisterStudentPayload {
  email: string;
  name: string;
  password: string;
  departmentName: Department; // "CSE" | "EEE" | "CIVIL"
  studentId?: string; // auto-generated when omitted
  phone?: string;
  address?: string;
  dateOfBirth?: string; // ISO date string
}

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IverifyEmailPayload{
  email: string;
  otp: string;
}

export interface IRequestUser {
  userId: string;
  name: string;
  email: string;
  role: Role;
}
