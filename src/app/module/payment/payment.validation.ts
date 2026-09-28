import z from "zod";

const InitiatePaymentZodSchema = z.object({
  feeId: z.string().min(1, "feeId is required"),
});

export const PaymentValidation = {
  InitiatePaymentZodSchema,
};
