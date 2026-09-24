import z from "zod";

const CreateEnrollmentZodSchema = z.object({
  semesterId: z.string().min(1, "semesterId is required"),
});

export const EnrollmentValidation = {
  CreateEnrollmentZodSchema,
};
