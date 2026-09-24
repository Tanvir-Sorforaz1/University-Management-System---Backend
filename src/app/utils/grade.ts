import { Grade } from "../../../generated/prisma/enums.js";

/** Grade point scale (4.0 scale). Adjust to match your institution's policy. */
export const GRADE_POINTS: Record<Grade, number> = {
  A_PLUS: 4.0,
  A: 3.75,
  A_MINUS: 3.5,
  B_PLUS: 3.25,
  B: 3.0,
  B_MINUS: 2.75,
  C_PLUS: 2.5,
  C: 2.25,
  D: 2.0,
  F: 0.0,
};

/** Marks-percentage cutoffs, evaluated top-down. */
const GRADE_CUTOFFS: { min: number; grade: Grade }[] = [
  { min: 80, grade: Grade.A_PLUS },
  { min: 75, grade: Grade.A },
  { min: 70, grade: Grade.A_MINUS },
  { min: 65, grade: Grade.B_PLUS },
  { min: 60, grade: Grade.B },
  { min: 55, grade: Grade.B_MINUS },
  { min: 50, grade: Grade.C_PLUS },
  { min: 45, grade: Grade.C },
  { min: 40, grade: Grade.D },
  { min: 0, grade: Grade.F },
];

/** Converts a percentage score (0-100) into a letter grade. */
export const marksToGrade = (percentage: number): Grade => {
  const match = GRADE_CUTOFFS.find((c) => percentage >= c.min);
  return match ? match.grade : Grade.F;
};

interface ExamComponent {
  marksObtained: number;
  totalMarks: number;
  weightPercent: number;
}

/**
 * Combines every graded Exam a student has in one Semester (quiz/midterm/final,
 * each with its own weightPercent) into a single 0-100 semester percentage,
 * then maps it to a letter grade for that semester.
 */
export const calculateSemesterGrade = (
  components: ExamComponent[]
): { percentage: number; grade: Grade } => {
  const totalWeight = components.reduce((sum, c) => sum + c.weightPercent, 0);

  if (totalWeight === 0) {
    return { percentage: 0, grade: Grade.F };
  }

  const weightedScore = components.reduce((sum, c) => {
    const componentPercentage = (c.marksObtained / c.totalMarks) * 100;
    return sum + componentPercentage * (c.weightPercent / totalWeight);
  }, 0);

  const percentage = Math.round(weightedScore * 100) / 100;
  return { percentage, grade: marksToGrade(percentage) };
};

interface CompletedSemester {
  grade: Grade;
  creditHours: number;
}

/**
 * Calculates CGPA (credit-hour weighted) across every semester a student has
 * exam results in. Used by transcript.service.ts whenever a result changes.
 */
export const calculateCgpa = (
  semesters: CompletedSemester[]
): { cgpa: number; totalCreditsEarned: number } => {
  if (semesters.length === 0) {
    return { cgpa: 0, totalCreditsEarned: 0 };
  }

  const totalCredits = semesters.reduce((sum, s) => sum + s.creditHours, 0);

  const totalQualityPoints = semesters.reduce(
    (sum, s) => sum + GRADE_POINTS[s.grade] * s.creditHours,
    0
  );

  // Credits from a failed (F) semester still count toward attempted credits,
  // but not toward "earned" credits.
  const creditsEarned = semesters
    .filter((s) => s.grade !== Grade.F)
    .reduce((sum, s) => sum + s.creditHours, 0);

  return {
    cgpa:
      totalCredits === 0
        ? 0
        : Math.round((totalQualityPoints / totalCredits) * 100) / 100,
    totalCreditsEarned: creditsEarned,
  };
};
