import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllRead,
  getUnreadCount,
} from "../controllers/notificationController.js";
import {authUser} from "../middlewares/auth.middleware.js";

const notificationRouter = express.Router();

notificationRouter.post("/list", authUser, getNotifications);
notificationRouter.post("/mark-read", authUser, markAsRead);
notificationRouter.post("/mark-all-read", authUser, markAllRead);
notificationRouter.post("/unread-count", authUser, getUnreadCount);

export default notificationRouter;
