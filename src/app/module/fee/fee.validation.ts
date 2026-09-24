import z from "zod";

const CreateFeeZodSchema = z.object({
  studentId: z.string().min(1, "studentId is required"),
  semesterId: z.string().min(1, "semesterId is required"),
  amount: z.number().positive("amount must be a positive number"),
  dueDate: z.string().min(1, "dueDate is required"),
});

export const FeeValidation = {
  CreateFeeZodSchema,
};
