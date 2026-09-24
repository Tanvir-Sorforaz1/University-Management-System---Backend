import type { AttendanceStatus } from "../../../../generated/prisma/enums.js";

export interface IMarkAttendancePayload {
  semesterId: string;
  studentId: string; // StudentProfile.id
  date: string; // ISO date string
  status: AttendanceStatus;
}
