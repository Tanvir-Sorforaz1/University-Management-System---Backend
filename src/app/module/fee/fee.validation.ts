import z from "zod";

const CreateFeeZodSchema = z.object({
  studentId: z.string().min(1, "studentId is required"),
  semesterId: z.string().min(1, "semesterId is required"),
  amount: z.number().positive("amount must be a positive number"),
  dueDate: z.string().min(1, "dueDate is required"),
});

const UpdateFeeZodSchema = z.object({
  amount: z.number().positive("amount must be a positive number").optional(),
  dueDate: z.string().min(1, "dueDate cannot be empty").optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: "At least one fee field must be provided",
});

export const FeeValidation = {
  CreateFeeZodSchema,
  UpdateFeeZodSchema,
};
