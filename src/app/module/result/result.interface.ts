export interface ICreateResultPayload {
  examId: string;
  studentId: string; // StudentProfile.id
  marksObtained: number;
  remarks?: string;
}

export interface IUpdateResultPayload {
  marksObtained?: number;
  remarks?: string;
}
