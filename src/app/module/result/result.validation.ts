import z from "zod";

const CreateResultZodSchema = z.object({
  examId: z.string().min(1, "examId is required"),
  studentId: z.string().min(1, "studentId is required"),
  marksObtained: z.number().min(0, "marksObtained cannot be negative"),
  remarks: z.string().trim().optional(),
});

const UpdateResultZodSchema = z.object({
  marksObtained: z.number().min(0, "marksObtained cannot be negative").optional(),
  remarks: z.string().trim().optional(),
});

export const ResultValidation = {
  CreateResultZodSchema,
  UpdateResultZodSchema,
};
