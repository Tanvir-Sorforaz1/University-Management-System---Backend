/*
  Warnings:

  - The values [DEPARTMENT] on the enum `AdminType` will be removed. If these variants are still used in the database, this will fail.
  - The values [DROPPED] on the enum `EnrollmentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `sectionId` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `droppedAt` on the `enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `sectionId` on the `enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `sectionId` on the `exams` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `faculty_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `semesters` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `semesters` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `semesters` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `semesters` table. All the data in the column will be lost.
  - You are about to drop the column `programId` on the `student_profiles` table. All the data in the column will be lost.
  - You are about to drop the `course_prerequisites` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `courses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `departments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `programs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sections` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[semesterId,studentId,date]` on the table `attendances` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentId,semesterId]` on the table `enrollments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[department,semesterNumber]` on the table `semesters` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `semesterId` to the `attendances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `semesterId` to the `enrollments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `semesterId` to the `exams` table without a default value. This is not possible if the table is not empty.
  - Added the required column `department` to the `faculty_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `department` to the `semesters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `feeAmount` to the `semesters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `semesterNumber` to the `semesters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `department` to the `student_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Department" AS ENUM ('CSE', 'EEE', 'CIVIL');

-- AlterEnum
BEGIN;
CREATE TYPE "AdminType_new" AS ENUM ('VC', 'REGISTRAR', 'FINANCE', 'SUPER');
ALTER TABLE "users" ALTER COLUMN "adminType" TYPE "AdminType_new" USING ("adminType"::text::"AdminType_new");
ALTER TYPE "AdminType" RENAME TO "AdminType_old";
ALTER TYPE "AdminType_new" RENAME TO "AdminType";
DROP TYPE "public"."AdminType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "EnrollmentStatus_new" AS ENUM ('ENROLLED', 'COMPLETED');
ALTER TABLE "public"."enrollments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "enrollments" ALTER COLUMN "status" TYPE "EnrollmentStatus_new" USING ("status"::text::"EnrollmentStatus_new");
ALTER TYPE "EnrollmentStatus" RENAME TO "EnrollmentStatus_old";
ALTER TYPE "EnrollmentStatus_new" RENAME TO "EnrollmentStatus";
DROP TYPE "public"."EnrollmentStatus_old";
ALTER TABLE "enrollments" ALTER COLUMN "status" SET DEFAULT 'ENROLLED';
COMMIT;

-- DropForeignKey
ALTER TABLE "attendances" DROP CONSTRAINT "attendances_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "course_prerequisites" DROP CONSTRAINT "course_prerequisites_courseId_fkey";

-- DropForeignKey
ALTER TABLE "course_prerequisites" DROP CONSTRAINT "course_prerequisites_prerequisiteCourseId_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_programId_fkey";

-- DropForeignKey
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "faculty_profiles" DROP CONSTRAINT "faculty_profiles_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "programs" DROP CONSTRAINT "programs_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "sections" DROP CONSTRAINT "sections_courseId_fkey";

-- DropForeignKey
ALTER TABLE "sections" DROP CONSTRAINT "sections_facultyId_fkey";

-- DropForeignKey
ALTER TABLE "sections" DROP CONSTRAINT "sections_semesterId_fkey";

-- DropForeignKey
ALTER TABLE "student_profiles" DROP CONSTRAINT "student_profiles_programId_fkey";

-- DropIndex
DROP INDEX "attendances_sectionId_studentId_date_key";

-- DropIndex
DROP INDEX "enrollments_sectionId_idx";

-- DropIndex
DROP INDEX "enrollments_studentId_sectionId_key";

-- DropIndex
DROP INDEX "exams_sectionId_idx";

-- DropIndex
DROP INDEX "faculty_profiles_departmentId_idx";

-- DropIndex
DROP INDEX "semesters_year_name_key";

-- DropIndex
DROP INDEX "student_profiles_programId_idx";

-- AlterTable
ALTER TABLE "attendances" DROP COLUMN "sectionId",
ADD COLUMN     "markedById" TEXT,
ADD COLUMN     "semesterId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "enrollments" DROP COLUMN "droppedAt",
DROP COLUMN "sectionId",
ADD COLUMN     "semesterId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "exams" DROP COLUMN "sectionId",
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "semesterId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "faculty_profiles" DROP COLUMN "departmentId",
ADD COLUMN     "department" "Department" NOT NULL,
ADD COLUMN     "isDepartmentHead" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "semesters" DROP COLUMN "endDate",
DROP COLUMN "startDate",
DROP COLUMN "status",
DROP COLUMN "year",
ADD COLUMN     "department" "Department" NOT NULL,
ADD COLUMN     "feeAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "semesterNumber" INTEGER NOT NULL,
ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "student_profiles" DROP COLUMN "programId",
ADD COLUMN     "currentSemester" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "department" "Department" NOT NULL;

-- DropTable
DROP TABLE "course_prerequisites";

-- DropTable
DROP TABLE "courses";

-- DropTable
DROP TABLE "departments";

-- DropTable
DROP TABLE "programs";

-- DropTable
DROP TABLE "sections";

-- DropEnum
DROP TYPE "SemesterStatus";

-- CreateIndex
CREATE UNIQUE INDEX "attendances_semesterId_studentId_date_key" ON "attendances"("semesterId", "studentId", "date");

-- CreateIndex
CREATE INDEX "enrollments_semesterId_idx" ON "enrollments"("semesterId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_studentId_semesterId_key" ON "enrollments"("studentId", "semesterId");

-- CreateIndex
CREATE INDEX "exams_semesterId_idx" ON "exams"("semesterId");

-- CreateIndex
CREATE INDEX "faculty_profiles_department_idx" ON "faculty_profiles"("department");

-- CreateIndex
CREATE INDEX "faculty_profiles_department_isDepartmentHead_idx" ON "faculty_profiles"("department", "isDepartmentHead");

-- CreateIndex
CREATE INDEX "semesters_department_idx" ON "semesters"("department");

-- CreateIndex
CREATE UNIQUE INDEX "semesters_department_semesterNumber_key" ON "semesters"("department", "semesterNumber");

-- CreateIndex
CREATE INDEX "student_profiles_department_idx" ON "student_profiles"("department");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "faculty_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "faculty_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
