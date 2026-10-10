import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

// Each role keeps its own session token in localStorage.
export const TOKEN_KEYS = { patient: "token", doctor: "dToken", admin: "aToken" };

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send the httpOnly refresh-token cookie
});

const readToken = (role) => {
  try {
    if (role) return localStorage.getItem(TOKEN_KEYS[role]);
    // No role given: use whichever session exists (admin > doctor > patient)
    return (
      localStorage.getItem(TOKEN_KEYS.admin) ||
      localStorage.getItem(TOKEN_KEYS.doctor) ||
      localStorage.getItem(TOKEN_KEYS.patient)
    );
  } catch {
    return null;
  }
};

// Request: attach the Bearer token for the role the call was made for
apiClient.interceptors.request.use((config) => {
  const token = readToken(config.role);
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: silently refresh the 15-minute access token once, then retry
let refreshPromise = null;

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}/api/v1/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const newToken = res.data?.data?.accessToken;
        if (!newToken) throw new Error("No token returned from refresh");
        return newToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const roleFromJwt = (jwt) => {
  try {
    return JSON.parse(atob(jwt.split(".")[1])).role?.toLowerCase();
  } catch {
    return null;
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    if (status === 401 && code === "TOKEN_EXPIRED" && original && !original._retried) {
      original._retried = true;
      try {
        const newToken = await refreshAccessToken();
        const key = TOKEN_KEYS[roleFromJwt(newToken)];
        if (key) localStorage.setItem(key, newToken);
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return apiClient(original);
      } catch (refreshErr) {
        Object.values(TOKEN_KEYS).forEach((k) => localStorage.removeItem(k));
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
