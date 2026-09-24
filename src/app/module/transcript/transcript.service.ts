import httpStatus from "http-status";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { calculateCgpa, calculateSemesterGrade } from "../../utils/grade.js";

/**
 * Recalculates a student's CGPA from every Semester they have at least one
 * ExamResult in, weighted by each Semester's creditHours. Called from
 * result.service.ts right after a result is created or corrected.
 *
 * Simplification: this does not require the Semester's Enrollment to be
 * marked COMPLETED first — it just looks at wherever results already exist.
 */
const recalculateTranscript = async (studentId: string) => {
  const examResults = await prisma.examResult.findMany({
    where: { studentId },
    include: { exam: { include: { semester: true } } },
  });

  const bySemester = new Map<
    string,
    {
      creditHours: number;
      components: { marksObtained: number; totalMarks: number; weightPercent: number }[];
    }
  >();

  for (const result of examResults) {
    const semester = result.exam.semester;
    const bucket = bySemester.get(semester.id) ?? {
      creditHours: semester.creditHours,
      components: [],
    };

    bucket.components.push({
      marksObtained: result.marksObtained,
      totalMarks: result.exam.totalMarks,
      weightPercent: result.exam.weightPercent,
    });

    bySemester.set(semester.id, bucket);
  }

  const semesterGrades = Array.from(bySemester.values()).map((bucket) => {
    const { grade } = calculateSemesterGrade(bucket.components);
    return { grade, creditHours: bucket.creditHours };
  });

  const { cgpa, totalCreditsEarned } = calculateCgpa(semesterGrades);

  return prisma.transcript.upsert({
    where: { studentId },
    update: { cgpa, totalCreditsEarned },
    create: { studentId, cgpa, totalCreditsEarned },
  });
};

const getMyTranscript = async (userId: string) => {
  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });

  if (!studentProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Student profile not found for this account");
  }

  const transcript = await prisma.transcript.findUnique({
    where: { studentId: studentProfile.id },
  });

  if (!transcript) {
    throw new AppError(httpStatus.NOT_FOUND, "Transcript not found");
  }

  return transcript;
};

const getTranscriptByStudentId = async (studentId: string) => {
  const transcript = await prisma.transcript.findUnique({ where: { studentId } });

  if (!transcript) {
    throw new AppError(httpStatus.NOT_FOUND, "Transcript not found");
  }

  return transcript;
};

export const TranscriptService = {
  recalculateTranscript,
  getMyTranscript,
  getTranscriptByStudentId,
};
