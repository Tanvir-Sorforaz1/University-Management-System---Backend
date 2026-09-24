import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { AttendanceService } from "./attendance.service.js";

const markAttendance = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User information is missing in the request");
  }

  const result = await AttendanceService.markAttendance(req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attendance marked successfully",
    data: result,
  });
});

const getMyAttendance = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User information is missing in the request");
  }

  const result = await AttendanceService.getMyAttendance(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attendance fetched successfully",
    data: result,
  });
});

const getAttendanceById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    throw new AppError(httpStatus.BAD_REQUEST, "Attendance ID is required");
  }

  const result = await AttendanceService.getAttendanceById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attendance record fetched successfully",
    data: result,
  });
});

export const AttendanceController = {
  markAttendance,
  getMyAttendance,
  getAttendanceById,
};
