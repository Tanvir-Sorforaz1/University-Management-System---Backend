import httpStatus from "http-status";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { ICreateExamPayload, IUpdateExamPayload } from "./exam.interface.js";

const createExam = async (payload: ICreateExamPayload, actor: { userId: string }) => {
  const facultyProfile = await prisma.facultyProfile.findUnique({
    where: { userId: actor.userId },
  });

  if (!facultyProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Faculty profile not found for this account");
  }

  const semester = await prisma.semester.findUnique({
    where: { id: payload.semesterId },
  });

  if (!semester || semester.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Semester not found");
  }

  if (semester.department !== facultyProfile.department) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only create exams for your own department"
    );
  }

  return prisma.exam.create({
    data: {
      semesterId: payload.semesterId,
      title: payload.title,
      type: payload.type,
      examDate: new Date(payload.examDate),
      totalMarks: payload.totalMarks,
      weightPercent: payload.weightPercent,
      createdById: facultyProfile.id,
    },
  });
};

const getExamById = async (id: string) => {
  const exam = await prisma.exam.findUnique({ where: { id } });

  if (!exam || exam.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
  }

  return exam;
};

const updateExam = async (id: string, payload: IUpdateExamPayload) => {
  await getExamById(id);

  return prisma.exam.update({
    where: { id },
    data: {
      ...payload,
      examDate: payload.examDate ? new Date(payload.examDate) : undefined,
    },
  });
};

const deleteExam = async (id: string) => {
  await getExamById(id);

  // Soft delete — the exam and its results stay in history.
  return prisma.exam.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

export const ExamService = {
  createExam,
  getExamById,
  updateExam,
  deleteExam,
};
