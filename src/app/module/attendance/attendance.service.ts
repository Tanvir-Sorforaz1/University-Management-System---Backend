import httpStatus from "http-status";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { IMarkAttendancePayload } from "./attendance.interface.js";

/**
 * Marks (or corrects, same day) one student's attendance. Uses upsert on
 * the (semesterId, studentId, date) unique constraint so re-submitting the
 * same day just updates the status instead of erroring.
 */
const markAttendance = async (
  payload: IMarkAttendancePayload,
  actor: { userId: string }
) => {
  const facultyProfile = await prisma.facultyProfile.findUnique({
    where: { userId: actor.userId },
  });

  if (!facultyProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Faculty profile not found for this account");
  }

  const student = await prisma.studentProfile.findUnique({
    where: { id: payload.studentId },
  });

  if (!student || student.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Student not found");
  }

  if (student.department !== facultyProfile.department) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only mark attendance for students in your own department"
    );
  }

  const date = new Date(payload.date);

  return prisma.attendance.upsert({
    where: {
      semesterId_studentId_date: {
        semesterId: payload.semesterId,
        studentId: payload.studentId,
        date,
      },
    },
    update: {
      status: payload.status,
      markedById: facultyProfile.id,
    },
    create: {
      semesterId: payload.semesterId,
      studentId: payload.studentId,
      date,
      status: payload.status,
      markedById: facultyProfile.id,
    },
  });
};

const getMyAttendance = async (userId: string) => {
  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });

  if (!studentProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found for this account");
  }

  return prisma.attendance.findMany({
    where: { studentId: studentProfile.id },
    include: { semester: true },
    orderBy: { date: "desc" },
  });
};

const getAttendanceById = async (id: string) => {
  const attendance = await prisma.attendance.findUnique({
    where: { id },
    include: { student: true, semester: true, markedBy: true },
  });

  if (!attendance) {
    throw new AppError(httpStatus.NOT_FOUND, "Attendance record not found");
  }

  return attendance;
};

export const AttendanceService = {
  markAttendance,
  getMyAttendance,
  getAttendanceById,
};
