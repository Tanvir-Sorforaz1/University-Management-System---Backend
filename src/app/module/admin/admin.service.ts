import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import {
  AdminType,
  PaymentStatus,
  Role,
} from "../../../../generated/prisma/enums.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import config from "../../config/index.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { recordAuditLog } from "../../utils/auditLog.js";
import { buildMeta, parseQuery } from "../../utils/pagination.js";
import type { IQuery } from "../../interfaces/index.js";
import type {
  ICreateAdminPayload,
  ICreateFacultyPayload,
  IUpdateUserStatusPayload,
} from "./admin.interface.js";

/** Placeholder generator — swap for a real faculty-id scheme. */
const generateFacultyId = (department: string) =>
  `${department}-${Date.now().toString(36).toUpperCase()}`;

const hashPassword = (password: string) =>
  bcrypt.hash(password, Number(config.bcrypt_salt_rounds) || 10);

const createFaculty = async (
  payload: ICreateFacultyPayload,
  actor: { userId: string }
) => {
  const email = payload.email.trim().toLowerCase();

  const isUserExist = await prisma.user.findUnique({ where: { email } });

  if (isUserExist) {
    throw new AppError(httpStatus.CONFLICT, "An account with this email already exists");
  }

  const hashedPassword = await hashPassword(payload.password);

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Only one department head allowed at a time — demote the current one
    // before promoting the new hire, so the invariant never breaks.
    if (payload.isDepartmentHead) {
      await tx.facultyProfile.updateMany({
        where: { department: payload.department, isDepartmentHead: true },
        data: { isDepartmentHead: false },
      });
    }

    const createdUser = await tx.user.create({
      data: {
        email,
        name: payload.name,
        password: hashedPassword,
        role: Role.FACULTY,
      },
    });

    const createdFacultyProfile = await tx.facultyProfile.create({
      data: {
        userId: createdUser.id,
        facultyId: payload.facultyId ?? generateFacultyId(payload.department),
        department: payload.department,
        isDepartmentHead: payload.isDepartmentHead ?? false,
        designation: payload.designation,
        phone: payload.phone,
      },
    });

    return { user: createdUser, facultyProfile: createdFacultyProfile };
  });

  await recordAuditLog({
    performedById: actor.userId,
    action: "CREATE_FACULTY",
    entity: "FacultyProfile",
    entityId: result.facultyProfile.id,
    changes: {
      department: payload.department,
      isDepartmentHead: payload.isDepartmentHead ?? false,
    },
  });

  return {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role,
    facultyProfile: result.facultyProfile,
  };
};

const createAdmin = async (
  payload: ICreateAdminPayload,
  actor: { userId: string }
) => {
  // Only a VC or a SUPER admin may create other admin accounts — a Registrar
  // or Finance admin should not be able to grant admin access to anyone.
  const actingAdmin = await prisma.user.findUnique({ where: { id: actor.userId } });

  if (!actingAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, "Admin not found");
  }

  const isAllowedToCreateAdmins =
  actingAdmin?.role === Role.ADMIN &&
  (actingAdmin.adminType === AdminType.VC ||
    actingAdmin.adminType === AdminType.SUPER);

  if (!isAllowedToCreateAdmins) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only the VC or a super admin can create admin accounts"
    );
  }

  const email = payload.email.trim().toLowerCase();

  const isUserExist = await prisma.user.findUnique({ where: { email } });

  if (isUserExist) {
    throw new AppError(httpStatus.CONFLICT, "An account with this email already exists");
  }

  const hashedPassword = await hashPassword(payload.password);

  const createdUser = await prisma.user.create({
    data: {
      email,
      name: payload.name,
      password: hashedPassword,
      role: Role.ADMIN,
      adminType: payload.adminType,
    },
  });

  await recordAuditLog({
    performedById: actor.userId,
    action: "CREATE_ADMIN",
    entity: "User",
    entityId: createdUser.id,
    changes: { adminType: payload.adminType },
  });

  return {
    id: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
    role: createdUser.role,
    adminType: createdUser.adminType,
  };
};

const assignDepartmentHead = async (
  facultyProfileId: string,
  actor: { userId: string }
) => {
  const faculty = await prisma.facultyProfile.findUnique({
    where: { id: facultyProfileId },
  });

  if (!faculty || faculty.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Faculty not found");
  }

  if (faculty.isDepartmentHead) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This faculty member is already the department head"
    );
  }

  await prisma.$transaction([
    //first making sure that there is no other department head for the same department, if any then demoting them to a regular faculty member before promoting the new department head
    prisma.facultyProfile.updateMany({
      where: { department: faculty.department, isDepartmentHead: true },
      data: { isDepartmentHead: false },
    }),
    prisma.facultyProfile.update({
      where: { id: facultyProfileId },
      data: { isDepartmentHead: true },
    }),
  ]);

  await recordAuditLog({
    performedById: actor.userId,
    action: "ASSIGN_DEPARTMENT_HEAD",
    entity: "FacultyProfile",
    entityId: facultyProfileId,
    changes: { department: faculty.department, isDepartmentHead: true },
  });

  return prisma.facultyProfile.findUnique({ where: { id: facultyProfileId } });
};

const getAllUsers = async (query: IQuery) => {
  const { skip, take, orderBy, page, limit } = parseQuery(query);

  const where: Record<string, unknown> = { deletedAt: null };

  if (query.role) {
    where.role = query.role;
  }

  if (query.searchTerm) {
    where.OR = [
      { name: { contains: query.searchTerm as string, mode: "insensitive" } },
      { email: { contains: query.searchTerm as string, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: "desc" },
      omit: { password: true },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, meta: buildMeta(page, limit, total) };
};

const updateUserStatus = async (
  userId: string,
  payload: IUpdateUserStatusPayload,
  actor: { userId: string }
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive: payload.isActive },
    omit: { password: true },
  });

  await recordAuditLog({
    performedById: actor.userId,
    action: payload.isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
    entity: "User",
    entityId: userId,
    changes: { isActive: payload.isActive },
  });

  return updatedUser;
};

const getDashboardStats = async () => {
  const [totalStudents, totalFaculty, totalAdmins, totalPaidFees, totalPendingFees] =
    await Promise.all([
      prisma.studentProfile.count({ where: { deletedAt: null } }),
      prisma.facultyProfile.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: Role.ADMIN, deletedAt: null } }),
      prisma.fee.count({ where: { isPaid: true } }),
      prisma.fee.count({ where: { isPaid: false } }),
    ]);

  const revenue = await prisma.payment.aggregate({
    where: { status: PaymentStatus.SUCCESS },
    _sum: { amount: true },
  });

  return {
    totalStudents,
    totalFaculty,
    totalAdmins,
    totalPaidFees,
    totalPendingFees,
    totalRevenue: revenue._sum.amount ?? 0,
  };
};

const getAuditLogs = async (query: IQuery) => {
  const { skip, take, orderBy, page, limit } = parseQuery(query);

  const where: Record<string, unknown> = {};
  if (query.entity) {
    where.entity = query.entity;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, meta: buildMeta(page, limit, total) };
};

export const AdminService = {
  createFaculty,
  createAdmin,
  assignDepartmentHead,
  getAllUsers,
  updateUserStatus,
  getDashboardStats,
  getAuditLogs,
};
