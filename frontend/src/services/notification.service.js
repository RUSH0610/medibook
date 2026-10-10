import apiClient from "./apiClient.js";

const patient = { role: "patient" };

export const getNotifications = () => apiClient.get("/api/v1/notifications", patient);
export const getUnreadCount = () => apiClient.get("/api/v1/notifications/unread-count", patient);
export const markNotificationRead = (id) => apiClient.post(`/api/v1/notifications/${id}/read`, {}, patient);
export const markAllNotificationsRead = () => apiClient.post("/api/v1/notifications/read-all", {}, patient);
