import httpStatus from "http-status";
import { PaymentStatus } from "../../../../generated/prisma/enums.js";
import type { Prisma } from "../../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { buildMeta, parseQuery } from "../../utils/pagination.js";
import type { IQuery } from "../../interfaces/index.js";
import type { ICreateFeePayload, IUpdateFeePayload } from "./fee.interface.js";

/**
 * Admin generates an invoice for a student to enter a specific Semester.
 * amount is copied from Semester.feeAmount at creation time, so a later
 * price change never rewrites history for already-billed students.
 */
const createFee = async (payload: ICreateFeePayload) => {
  const [student, semester] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { id: payload.studentId } }),
    prisma.semester.findUnique({ where: { id: payload.semesterId } }),
  ]);

  if (!student || student.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Student not found");
  }

  if (!semester || semester.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Semester not found");
  }

  const existingFee = await prisma.fee.findUnique({
    where: {
      studentId_semesterId: {
        studentId: payload.studentId,
        semesterId: payload.semesterId,
      },
    },
  });

  if (existingFee) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A fee invoice already exists for this student and semester"
    );
  }

  return prisma.fee.create({
    data: {
      studentId: payload.studentId,
      semesterId: payload.semesterId,
      amount: semester.feeAmount,
      dueDate: new Date(payload.dueDate),
    },
  });
};

const getMyFees = async (userId: string, query: IQuery) => {
  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });

  if (!studentProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found for this account");
  }

  const { skip, take, orderBy, page, limit } = parseQuery(query);
  const where = { studentId: studentProfile.id };

  const [fees, total] = await Promise.all([
    prisma.fee.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: "desc" },
      include: { semester: true },
    }),
    prisma.fee.count({ where }),
  ]);

  return { fees, meta: buildMeta(page, limit, total) };
};

const getAllFees = async (query: IQuery) => {
  const { skip, take, orderBy, page, limit } = parseQuery(query);
  const where: Prisma.FeeWhereInput = { deletedAt: null };

  if (query.isPaid === "true" || query.isPaid === "false") {
    where.isPaid = query.isPaid === "true";
  }

  if (typeof query.searchTerm === "string" && query.searchTerm.trim()) {
    const searchTerm = query.searchTerm.trim();
    where.OR = [
      { student: { studentId: { contains: searchTerm, mode: "insensitive" } } },
      { student: { user: { name: { contains: searchTerm, mode: "insensitive" } } } },
      { student: { user: { email: { contains: searchTerm, mode: "insensitive" } } } },
      { semester: { name: { contains: searchTerm, mode: "insensitive" } } },
    ];
  }

  const [fees, total] = await Promise.all([
    prisma.fee.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: "desc" },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            department: true,
            user: { select: { name: true, email: true } },
          },
        },
        semester: { select: { id: true, name: true, department: true, feeAmount: true } },
        payments: { select: { status: true } },
      },
    }),
    prisma.fee.count({ where }),
  ]);

  return { fees, meta: buildMeta(page, limit, total) };
};

const updateFee = async (id: string, payload: IUpdateFeePayload) => {
  const fee = await prisma.fee.findUnique({
    where: { id },
    include: { payments: { select: { status: true } } },
  });

  if (!fee || fee.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Fee invoice not found");
  }

  const paymentInProgress = fee.payments.some(
    ({ status }) => status === PaymentStatus.PENDING || status === PaymentStatus.SUCCESS,
  );
  if (fee.isPaid || paymentInProgress) {
    throw new AppError(httpStatus.CONFLICT, "This fee cannot be edited after payment has started");
  }

  return prisma.fee.update({
    where: { id },
    data: {
      amount: payload.amount,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
    },
    include: {
      student: {
        select: {
          id: true,
          studentId: true,
          department: true,
          user: { select: { name: true, email: true } },
        },
      },
      semester: { select: { id: true, name: true, department: true, feeAmount: true } },
    },
  });
};

export const FeeService = {
  createFee,
  getMyFees,
  getAllFees,
  updateFee,
};
