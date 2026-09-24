import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type z from "zod";
import { AppError } from "../utils/AppError.js";
import { catchAsync } from "../utils/catchAsync.js";

export const validateRequest = (zodSchema: z.ZodObject) => {
  return catchAsync((req: Request, res: Response, next: NextFunction) => {
    const payload = req.body ?? {};

    const result = zodSchema.safeParse(payload);

    if (!result.success) {
      console.log(result.error);
      console.log(result.error.issues);

      throw new AppError(
        httpStatus.BAD_REQUEST,
        result.error.issues[0]?.message ?? "Validation failed from validateRequest middleware"
      );
    }

    req.body = result.data;

    next();
  });
};



// purpose of zodSchema.safeParse(payload) 

/*
const zodSchema = z.object({
  name: z.string(),
  age: z.number(),
});

// ✅ SUCCESS: valid data
const payload1 = {
  name: "Tanvir",
  age: 22,
};

const result1 = zodSchema.safeParse(payload1);
// {
//   success: true,
//   data: { name: "Tanvir", age: 22 }
// }

// ❌ FAILURE: invalid data
const payload2 = {
  name: "Tanvir",
  age: "22", // should be a number
};

const result2 = zodSchema.safeParse(payload2);
// {
//   success: false,
//   error: ZodError(...)
// }

// In short:
// success: true  → use result.data
// success: false → use result.error
*/