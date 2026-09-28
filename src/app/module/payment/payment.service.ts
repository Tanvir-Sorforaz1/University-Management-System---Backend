import httpStatus from "http-status";
import {
  NotificationType,
  PaymentMethod,
  PaymentStatus,
} from "../../../../generated/prisma/enums.js";
import config from "../../config/index.js";
import { createBkashPayment, executeBkashPayment } from "../../lib/bkash.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { createNotification } from "../notification/notification.service.js";
import type {
  IBkashCallbackQuery,
  IInitiatePaymentPayload,
} from "./payment.interface.js";

const asJson = (value: unknown) => JSON.parse(JSON.stringify(value));


const initiatePayment = async (
  payload: IInitiatePaymentPayload,
  actor: { userId: string }
) => {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: actor.userId },
    include: { user: true },
  });

  if (!studentProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found for this account");
  }

  const fee = await prisma.fee.findUnique({ where: { id: payload.feeId } });

  if (!fee || fee.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Fee not found");
  }

  if (fee.studentId !== studentProfile.id) {
    throw new AppError(httpStatus.FORBIDDEN, "This fee does not belong to you");
  }

  if (fee.isPaid) {
    throw new AppError(httpStatus.BAD_REQUEST, "This fee has already been paid");
  }

  const payment = await prisma.payment.create({
    data: {
      feeId: fee.id,
      studentId: studentProfile.id,
      amount: fee.amount,
      method: PaymentMethod.BKASH,
      status: PaymentStatus.PENDING,
    },
  });

  const bkashResult = await createBkashPayment({
    amount: fee.amount,
    payerReference: studentProfile.user.email,
    merchantInvoiceNumber: payment.id,
    callbackURL: `${config.bkash_callback_url}`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      gatewayPaymentId: bkashResult.paymentID,
      gatewayResponse: asJson(bkashResult),
    },
  });

  return { paymentId: payment.id, bkashURL: bkashResult.bkashURL };
};


const handleCallback = async (query: IBkashCallbackQuery) => {
  const { paymentID, status } = query;

  if (!paymentID) {
    throw new AppError(httpStatus.BAD_REQUEST, "paymentID is missing from bKash callback");
  }

  const payment = await prisma.payment.findUnique({ where: { gatewayPaymentId: paymentID } });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "No payment found for this bKash paymentID");
  }

  if (payment.status === PaymentStatus.SUCCESS) {
    return payment; // already processed — callback can fire more than once
  }

  if (status === "cancel") {
    return prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.CANCELLED },
    });
  }

  const executeResult = await executeBkashPayment(paymentID);
  const gatewayResponseJson = asJson(executeResult);

  const isSuccessful =
    status === "success" && executeResult.transactionStatus === "Completed";

  if (!isSuccessful) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED, gatewayResponse: gatewayResponseJson },
    });

    throw new AppError(
      httpStatus.BAD_REQUEST,
      executeResult.statusMessage || "bKash payment was not completed"
    );
  }

  const [updatedPayment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        transactionId: executeResult.trxID,
        paidAt: (() => {
          if (!executeResult.paymentExecuteTime) return new Date();
          const fixed = (executeResult.paymentExecuteTime as string)
            .replace(/(\d{2}:\d{2}:\d{2}):(\d{3})/, "$1.$2");
          const parsed = new Date(fixed);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        })(),
        gatewayResponse: gatewayResponseJson,
      },
    }),
    prisma.fee.update({
      where: { id: payment.feeId },
      data: { isPaid: true },
    }),
  ]);

  const student = await prisma.studentProfile.findUnique({
    where: { id: payment.studentId },
  });

  if (student) {
    await createNotification({
      userId: student.userId,
      type: NotificationType.PAYMENT,
      title: "Payment Received",
      message: `Your payment of ${payment.amount} BDT via bKash was received successfully.`,
    });
  }

  return updatedPayment;
};

const getPaymentById = async (id: string) => {
  const payment = await prisma.payment.findUnique({ where: { id } });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  return payment;
};

export const PaymentService = {
  initiatePayment,
  handleCallback,
  getPaymentById,
};
