import httpStatus from "http-status";
import { NotificationType } from "../../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { recordAuditLog } from "../../utils/auditLog.js";
import { marksToGrade } from "../../utils/grade.js";
import { createNotification } from "../notification/notification.service.js";
import { TranscriptService } from "../transcript/transcript.service.js";
import type { ICreateResultPayload, IUpdateResultPayload } from "./result.interface.js";

/**
 * Faculty enters a mark. Upserts on the (examId, studentId) unique
 * constraint, so re-submitting the same exam+student corrects it instead
 * of erroring — recalculates the student's transcript either way.
 */
const createResult = async (
  payload: ICreateResultPayload,
  actor: { userId: string }
) => {
  const exam = await prisma.exam.findUnique({ where: { id: payload.examId } });

  if (!exam || exam.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
  }

  if (payload.marksObtained > exam.totalMarks) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "marksObtained cannot exceed the exam's totalMarks"
    );
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: payload.studentId },
  });

  if (!student || student.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Student not found");
  }

  const percentage = (payload.marksObtained / exam.totalMarks) * 100;
  const grade = marksToGrade(percentage);

  const result = await prisma.examResult.upsert({
    where: {
      examId_studentId: { examId: payload.examId, studentId: payload.studentId },
    },
    update: { marksObtained: payload.marksObtained, grade, remarks: payload.remarks },
    create: {
      examId: payload.examId,
      studentId: payload.studentId,
      marksObtained: payload.marksObtained,
      grade,
      remarks: payload.remarks,
    },
  });

  await TranscriptService.recalculateTranscript(payload.studentId);

  await createNotification({
    userId: student.userId,
    type: NotificationType.RESULT,
    title: "Result Published",
    message: `Your result for "${exam.title}" has been published.`,
  });

  return result;
};

const getMyResults = async (userId: string) => {
  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });

  if (!studentProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found for this account");
  }

  return prisma.examResult.findMany({
    where: { studentId: studentProfile.id },
    include: { exam: true },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Corrects an already-entered result. Always audit-logged with a
 * before/after diff, and always recalculates the transcript afterward.
 */
const updateResult = async (
  id: string,
  payload: IUpdateResultPayload,
  actor: { userId: string }
) => {
  const existingResult = await prisma.examResult.findUnique({
    where: { id },
    include: { exam: true },
  });

  if (!existingResult) {
    throw new AppError(httpStatus.NOT_FOUND, "Result not found");
  }

  const marksObtained = payload.marksObtained ?? existingResult.marksObtained;

  if (marksObtained > existingResult.exam.totalMarks) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "marksObtained cannot exceed the exam's totalMarks"
    );
  }

  const grade = marksToGrade((marksObtained / existingResult.exam.totalMarks) * 100);

  const updatedResult = await prisma.examResult.update({
    where: { id },
    data: { marksObtained, grade, remarks: payload.remarks ?? existingResult.remarks },
  });

  await TranscriptService.recalculateTranscript(existingResult.studentId);

  await recordAuditLog({
    performedById: actor.userId,
    action: "UPDATE_RESULT",
    entity: "ExamResult",
    entityId: id,
    changes: {
      before: { marksObtained: existingResult.marksObtained, grade: existingResult.grade },
      after: { marksObtained, grade },
    },
  });

  return updatedResult;
};

export const ResultService = {
  createResult,
  getMyResults,
  updateResult,
};
