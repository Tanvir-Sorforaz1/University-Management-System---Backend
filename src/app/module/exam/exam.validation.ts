import z from "zod";
import { ExamType } from "../../../../generated/prisma/enums.js";

const CreateExamZodSchema = z.object({
  semesterId: z.string().min(1, "semesterId is required"),
  title: z.string().min(1, "title is required"),
  type: z.enum(ExamType),
  examDate: z.string().min(1, "examDate is required"),
  totalMarks: z.number().positive("totalMarks must be positive"),
  weightPercent: z.number().positive("weightPercent must be positive"),
});

const UpdateExamZodSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(ExamType).optional(),
  examDate: z.string().optional(),
  totalMarks: z.number().positive().optional(),
  weightPercent: z.number().positive().optional(),
});

export const ExamValidation = {
  CreateExamZodSchema,
  UpdateExamZodSchema,
};
