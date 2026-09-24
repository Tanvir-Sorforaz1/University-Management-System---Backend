import httpStatus from "http-status";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { buildMeta, parseQuery } from "../../utils/pagination.js";
import type { IQuery } from "../../interfaces/index.js";
import type { ICreateFeePayload } from "./fee.interface.js";

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

export const FeeService = {
  createFee,
  getMyFees,
};
