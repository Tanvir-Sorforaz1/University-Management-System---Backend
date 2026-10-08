import type { Request, Response } from "express";
import httpStatus from "http-status";
import config from "../../config/index.js";
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
  const frontendUrl = config.frontend_url || (config.node_env === "development" ? "http://localhost:3000" : undefined);
  if (!frontendUrl) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "FRONTEND_URL is not configured");
  }

  const paymentID = typeof req.query.paymentID === "string" ? req.query.paymentID : "";
  const redirectToStatus = (status: "success" | "cancel" | "failed", internalPaymentId = paymentID) => {
    const destination = new URL(`/payment/${status}`, frontendUrl);
    if (internalPaymentId) destination.searchParams.set("paymentID", internalPaymentId);
    destination.searchParams.set("status", status);
    res.redirect(303, destination.toString());
  };

  try {
    const payment = await PaymentService.handleCallback(req.query);
    const paymentStatus = String(payment.status).toUpperCase();
    redirectToStatus(
      paymentStatus === "SUCCESS" ? "success" : paymentStatus === "CANCELLED" ? "cancel" : "failed",
      payment.id,
    );
  } catch {
    let internalPaymentId = paymentID;
    if (paymentID) {
      try {
        const payment = await PaymentService.getPaymentByGatewayId(paymentID);
        internalPaymentId = payment.id;
      } catch {
        internalPaymentId = "";
      }
    }
    redirectToStatus(String(req.query.status).toLowerCase() === "cancel" ? "cancel" : "failed", internalPaymentId);
  }
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
