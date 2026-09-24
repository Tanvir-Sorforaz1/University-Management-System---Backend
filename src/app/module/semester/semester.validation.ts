import z from "zod";

// Semesters are fixed (24 total — 3 departments × 8) and seeded once.
// There is no create/delete here, only updating fee/credit-hours.
const UpdateSemesterZodSchema = z.object({
  name: z.string().trim().optional(),
  feeAmount: z.number().positive("feeAmount must be a positive number").optional(),
  creditHours: z.number().int().positive("creditHours must be a positive integer").optional(),
});

export const SemesterValidation = {
  UpdateSemesterZodSchema,
};
