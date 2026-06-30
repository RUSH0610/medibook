import notificationModel from "../models/notificationModel.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Get notifications for logged in user/doctor
const getNotifications = asyncHandler(async (req, res) => {
  const { recipientRole } = req.body;
  const recipientId = req.userId;
  const notifications = await notificationModel
    .find({ recipientId, recipientRole })
    .sort({ createdAt: -1 })
    .limit(30);
  return res.status(200).json(new ApiResponse(200, { notifications }, "Notifications fetched"));
});

// Mark one notification as read
const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.body;
  const recipientId = req.userId;
  const notification = await notificationModel.findById(notificationId);
  if (!notification) throw new ApiError(404, "Notification not found");
  if (notification.recipientId.toString() !== recipientId.toString())
    throw new ApiError(403, "Unauthorized");
  notification.isRead = true;
  await notification.save();
  return res.status(200).json(new ApiResponse(200, null, "Marked as read"));
});

// Mark all as read
const markAllRead = asyncHandler(async (req, res) => {
  const recipientId = req.userId;
  await notificationModel.updateMany(
    { recipientId, isRead: false },
    { isRead: true },
  );
  return res.status(200).json(new ApiResponse(200, null, "All marked as read"));
});

// Get unread count
const getUnreadCount = asyncHandler(async (req, res) => {
  const recipientId = req.userId;
  const count = await notificationModel.countDocuments({
    recipientId,
    isRead: false,
  });
  return res.status(200).json(new ApiResponse(200, { count }, "Unread count fetched"));
});

export { getNotifications, markAsRead, markAllRead, getUnreadCount };
