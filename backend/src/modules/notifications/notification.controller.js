import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/ApiResponse.js";
import * as notificationService from "./notification.service.js";

// Get Notifications for Logged-In User
export const getNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getNotifications({
    userId: req.user.id,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Notifications fetched")
  );
});

// Mark Single Notification Read
export const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const notificationId = req.params.id;

  await notificationService.markAsRead({
    userId,
    notificationId,
  });

  return res.status(200).json(new ApiResponse(200, null, "Marked as read"));
});

// Mark All Read
export const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead({
    userId: req.user.id,
  });

  return res.status(200).json(new ApiResponse(200, null, "All marked as read"));
});

// Get Unread Notification Count
export const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount({
    userId: req.user.id,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Unread count fetched")
  );
});

export default {
  getNotifications,
  markAsRead,
  markAllRead,
  getUnreadCount,
};
