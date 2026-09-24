import type { NotificationType } from "../../../../generated/prisma/enums.js";

export interface ICreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}
