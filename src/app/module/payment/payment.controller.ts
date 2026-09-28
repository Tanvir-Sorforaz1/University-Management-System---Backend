import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { getRequiredParam } from "../../utils/getRequiredParam.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { PaymentService } from "./payment.service.js";

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User information is missing in the request");
  }

  const result = await PaymentService.initiatePayment(req.body, req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "bKash payment session initiated — redirect the student to bkashURL",
    data: result,
  });
});

const handleCallback = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.handleCallback(req.query);

  // This project has no frontend to redirect to (backend-only per the
  // brief), so the callback just returns JSON. If you add a frontend
  // later, swap this for:
  //   res.redirect(`${config.frontend_url}/payments/result?status=success`);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment finalized successfully",
    data: result,
  });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const id = getRequiredParam(req.params, "id");
  const result = await PaymentService.getPaymentById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment fetched successfully",
    data: result,
  });
});

export const PaymentController = {
  initiatePayment,
  handleCallback,
  getPaymentById,
};
