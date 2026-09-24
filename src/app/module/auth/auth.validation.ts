import z from "zod";
import { Department } from "../../../../generated/prisma/enums.js";

const RegisterStudentZodSchema = z.object({
  email: z.email("Invalid email address"),
  name: z.string().min(3, "Name must be at least 3 characters long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[a-z]/, "Password must contain at least 1 lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number"),
  departmentName: z.enum(Department, {
    message: "departmentName must be one of CSE, EEE, CIVIL",
  }),
  studentId: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  dateOfBirth: z.string().optional(),
});

const VerifyEmailZodSchema = z.object({
  email: z.email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

const LoginZodSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const AuthValidation = {
  RegisterStudentZodSchema,
  VerifyEmailZodSchema,
  LoginZodSchema,
};
