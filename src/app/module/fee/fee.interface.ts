export interface ICreateFeePayload {
  studentId: string; // StudentProfile.id
  semesterId: string;
  dueDate: string; // ISO date string
}

export interface IUpdateFeePayload {
  amount?: number;
  dueDate?: string; // ISO date string
}
