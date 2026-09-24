import httpStatus from "http-status";
import { AppError } from "./AppError.js";


export const getRequiredParam = (
  params: Record<string, string | string[] | undefined>,
  key: string
): string => {
  const value = params[key];

  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, `${key} is required in the URL`);
  }

  return value;
};










/**
 * Gets a required URL parameter and ensures it is a valid string.
 *
 * Express types route parameters as `string | string[]` because it supports
 * repeated route parameters (for example, `:id+`). In our routes, parameters
 * are always expected to be a single string, so this helper validates the value
 * and narrows the type from `string | string[] | undefined` to `string`.
 *
 * Throws a 400 Bad Request error if the parameter is missing, empty, or not a string.
 *
 * Usage:
 * const id = getRequiredParam(req.params, "id");
 */