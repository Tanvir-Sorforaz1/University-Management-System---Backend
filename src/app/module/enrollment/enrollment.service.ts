import httpStatus from "http-status";
import {
  EnrollmentStatus,
  NotificationType,
} from "../../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { createNotification } from "../notification/notification.service.js";
import type { ICreateEnrollmentPayload } from "./enrollment.interface.js";

/**
 * Business rule that can't be a DB constraint: a student may only enroll
 * in a Semester once they have a paid Fee for it.
 */
const createEnrollment = async (
  payload: ICreateEnrollmentPayload,
  actor: { userId: string }
) => {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: actor.userId },
  });

  if (!studentProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found for this account");
  }

  const semester = await prisma.semester.findUnique({
    where: { id: payload.semesterId },
  });

  if (!semester || semester.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Semester not found");
  }

  if (semester.department !== studentProfile.department) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This semester does not belong to your department"
    );
  }

  const fee = await prisma.fee.findUnique({
    where: {
      studentId_semesterId: {
        studentId: studentProfile.id,
        semesterId: semester.id,
      },
    },
  });

  if (!fee || !fee.isPaid) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You must pay this semester's fee before enrolling"
    );
  }

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_semesterId: {
        studentId: studentProfile.id,
        semesterId: semester.id,
      },
    },
  });

  if (existingEnrollment) {
    throw new AppError(httpStatus.CONFLICT, "You are already enrolled in this semester");
  }

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: studentProfile.id,
      semesterId: semester.id,
      status: EnrollmentStatus.ENROLLED,
    },
  });

  await createNotification({
    userId: actor.userId,
    type: NotificationType.ENROLLMENT,
    title: "Enrollment Confirmed",
    message: `You have been enrolled in ${semester.name ?? `Semester ${semester.semesterNumber}`}.`,
  });

  return enrollment;
};

const getMyEnrollments = async (userId: string) => {
  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });

  if (!studentProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found for this account");
  }

  return prisma.enrollment.findMany({
    where: { studentId: studentProfile.id },
    include: { semester: true },
    orderBy: { enrolledAt: "desc" },
  });
};

export const EnrollmentService = {
  createEnrollment,
  getMyEnrollments,
};
