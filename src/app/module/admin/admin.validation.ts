import z from "zod";
import { AdminType, Department } from "../../../../generated/prisma/enums.js";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[a-z]/, "Password must contain at least 1 lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
  .regex(/[0-9]/, "Password must contain at least 1 number");

const CreateFacultyZodSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.email("Invalid email address"),
  password: passwordSchema,
  department: z.enum(Department, {
    message: "department must be one of CSE, EEE, CIVIL",
  }),
  facultyId: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  isDepartmentHead: z.boolean().optional(),
  phone: z.string().trim().optional(),
});

const CreateAdminZodSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  email: z.email("Invalid email address"),
  password: passwordSchema,
  adminType: z.enum(AdminType, {
    message: "adminType must be one of VC, REGISTRAR, FINANCE, SUPER",
  }),
});

const UpdateUserStatusZodSchema = z.object({
  isActive: z.boolean(),
});

export const AdminValidation = {
  CreateFacultyZodSchema,
  CreateAdminZodSchema,
  UpdateUserStatusZodSchema,
};
