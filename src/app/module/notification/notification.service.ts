import httpStatus from "http-status";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { buildMeta, parseQuery } from "../../utils/pagination.js";
import type { IQuery } from "../../interfaces/index.js";
import type { ICreateNotificationInput } from "./notification.interface.js";

/**
 * Called from other services (payment, result, enrollment) right after a
 * sensitive event succeeds. Never throws — a failed notification write
 * should never break the action that triggered it.
 */
export const createNotification = async (input: ICreateNotificationInput) => {
  try {
    await prisma.notification.create({ data: input });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};

const getMyNotifications = async (userId: string, query: IQuery) => {
  const { skip, take, orderBy, page, limit } = parseQuery(query);
  const where = { userId };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: "desc" },
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, meta: buildMeta(page, limit, total) };
};

const markAsRead = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
  }

  if (notification.userId !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "This notification does not belong to you");
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

export const NotificationService = {
  getMyNotifications,
  markAsRead,
};
