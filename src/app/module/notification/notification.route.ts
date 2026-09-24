import { Router } from "express";
import { auth } from "../../middleware/checkAuth.js";
import { NotificationController } from "./notification.controller.js";

const router = Router();

router.get("/my", auth(), NotificationController.getMyNotifications);
router.patch("/:id/read", auth(), NotificationController.markAsRead);

export const NotificationRoutes = router;
