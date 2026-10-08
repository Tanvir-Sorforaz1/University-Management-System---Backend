import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { getRequiredParam } from "../../utils/getRequiredParam.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { ExamService } from "./exam.service.js";

const createExam = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User information is missing in the request");
  }

  const result = await ExamService.createExam(req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Exam created successfully",
    data: result,
  });
});

const getExamById = catchAsync(async (req: Request, res: Response) => {
  const id = getRequiredParam(req.params, "id");
  const result = await ExamService.getExamById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Exam fetched successfully",
    data: result,
  });
});

const getExams = catchAsync(async (req: Request, res: Response) => {
  const result = await ExamService.getExams(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Exams fetched successfully",
    data: result,
  });
});

const getFacultyExams = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(httpStatus.UNAUTHORIZED, "User information is missing in the request");
  const result = await ExamService.getFacultyExams(req.user.userId, req.query);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Faculty exams fetched successfully", data: result });
});

const updateExam = catchAsync(async (req: Request, res: Response) => {
  const id = getRequiredParam(req.params, "id");
  const result = await ExamService.updateExam(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Exam updated successfully",
    data: result,
  });
});

const deleteExam = catchAsync(async (req: Request, res: Response) => {
  const id = getRequiredParam(req.params, "id");
  const result = await ExamService.deleteExam(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Exam deleted successfully",
    data: result,
  });
});

export const ExamController = {
  createExam,
  getExams,
  getFacultyExams,
  getExamById,
  updateExam,
  deleteExam,
};
