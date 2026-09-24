import z from "zod";
import { AttendanceStatus } from "../../../../generated/prisma/enums.js";

const MarkAttendanceZodSchema = z.object({
  semesterId: z.string().min(1, "semesterId is required"),
  studentId: z.string().min(1, "studentId is required"),
  date: z.string().min(1, "date is required"),
  status: z.enum(AttendanceStatus),
});

export const AttendanceValidation = {
  MarkAttendanceZodSchema,
};
