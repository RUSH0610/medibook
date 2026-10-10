import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllRead,
  getUnreadCount,
} from "./notification.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.post("/read-all", markAllRead);
router.post("/:id/read", markAsRead);

export default router;
