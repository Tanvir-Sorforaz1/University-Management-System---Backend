import bcrypt from "bcryptjs";
import { AdminType, Department, Role } from "../../../generated/prisma/enums.js";
import config from "../config/index.js";
import { prisma } from "../lib/prisma.js";

const DEPARTMENTS = [Department.CSE, Department.EEE, Department.CIVIL];
const TOTAL_SEMESTERS = 8;
const DEFAULT_FEE_AMOUNT = 25000; // BDT 
const DEFAULT_CREDIT_HOURS = 15;

const ordinal = (n: number) => {
  if ([11, 12, 13].includes(n)) return "th";
  return { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
};

/**
 * Creates the single VC account from env vars — but only if a user with
 * that email doesn't already exist. Safe to call on every server start.
 */
const seedVc = async () => {
  const email = config.super_admin_email?.trim().toLowerCase();
  const password = config.super_admin_password;

  if (!email || !password) {
    console.warn(
      "Seed: SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — skipping VC seed."
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return; // already seeded, nothing to do
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds) || 10
  );

  await prisma.user.create({
    data: {
      email,
      name: "Vice Chancellor",
      password: hashedPassword,
      role: Role.ADMIN,
      adminType: AdminType.VC,
    },
  });

  console.log(`Seed: VC account created (${email}).`);
};

/**
 * Ensures all 24 fixed Semester rows exist (3 departments × 8 semesters).
 * Checks the count first so a fully-seeded DB does 1 query and returns —
 * upsert on (department, semesterNumber) handles the partially-seeded case
 * (e.g. server crashed mid-seed last time) without duplicating anything.
 */
const seedSemesters = async () => {
  const expectedCount = DEPARTMENTS.length * TOTAL_SEMESTERS;
  const existingCount = await prisma.semester.count();

  if (existingCount >= expectedCount) {
    return; // already fully seeded, nothing to do
  }

  for (const department of DEPARTMENTS) {
    for (let semesterNumber = 1; semesterNumber <= TOTAL_SEMESTERS; semesterNumber++) {
      await prisma.semester.upsert({
        where: {
          department_semesterNumber: { department, semesterNumber },
        },
        update: {},
        create: {
          department,
          semesterNumber,
          name: `${semesterNumber}${ordinal(semesterNumber)} Semester`,
          feeAmount: DEFAULT_FEE_AMOUNT,
          creditHours: DEFAULT_CREDIT_HOURS,
        },
      });
    }
  }

  console.log(`Seed: ensured ${expectedCount} semesters exist.`);
};

export const seedDatabase = async () => {
  await seedVc();
  await seedSemesters();
};
