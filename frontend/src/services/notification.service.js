import axios from "axios";
const BASE = import.meta.env.VITE_BACKEND_URL;

export const getNotifications = (data, token) => axios.post(`${BASE}/api/v1/notifications/list`, data, { headers: { token } });
