import type { ExamType } from "../../../../generated/prisma/enums.js";

export interface ICreateExamPayload {
  semesterId: string;
  title: string;
  type: ExamType;
  examDate: string; // ISO date string
  totalMarks: number;
  weightPercent: number;
}

export interface IUpdateExamPayload {
  title?: string;
  type?: ExamType;
  examDate?: string;
  totalMarks?: number;
  weightPercent?: number;
}
