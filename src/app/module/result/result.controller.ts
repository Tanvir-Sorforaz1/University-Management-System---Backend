import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { getRequiredParam } from "../../utils/getRequiredParam.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { ResultService } from "./result.service.js";

const createResult = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User information is missing in the request");
  }

  const result = await ResultService.createResult(req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Result submitted successfully",
    data: result,
  });
});

const getMyResults = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User information is missing in the request");
  }

  const result = await ResultService.getMyResults(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Results fetched successfully",
    data: result,
  });
});

const updateResult = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User information is missing in the request");
  }

  const id = getRequiredParam(req.params, "id");
  const result = await ResultService.updateResult(id, req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Result corrected successfully",
    data: result,
  });
});

export const ResultController = {
  createResult,
  getMyResults,
  updateResult,
};
