import axios from "axios";
import socket from "../socket/index.js";

// Create axios instance with defaults
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Attach access token to every request
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Refresh token state
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    error ? prom.reject(error) : prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;


    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }


    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // console.log("🔄 Attempting to refresh access token...");
      // console.log("Refresh URL:", `${import.meta.env.VITE_API_URL}/api/auth/refresh-token`);

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/refresh-token`,
        {},
        { withCredentials: true }
      );

      const newAccessToken = data.accessToken;

      // console.log("✅ Token refreshed successfully");

      // Save new token
      localStorage.setItem("accessToken", newAccessToken);

      // Update axios headers
      api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      // 🔥 Update socket token + reconnect if necessary
      socket.auth = { token: newAccessToken };
      if (!socket.connected) {
        socket.connect();
      }

      // Resolve queued requests
      processQueue(null, newAccessToken);

      // Retry original failed request
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed → logout
      console.error("❌ Token refresh failed:", refreshError.response?.data || refreshError.message);
      // console.log("🔄 Logging out user...");
      
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");

      processQueue(refreshError, null);

      // Disconnect socket
      if (socket.connected) {
        socket.disconnect();
      }

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const LoginUser = async (userData) => {
  const res = await api.post("/auth/login", userData);
  const { accessToken, user } = res.data;

  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("user", JSON.stringify(user));

  return res;
};

export const LogoutUser = async () => {
  await api.post("/auth/logout");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  socket.disconnect();
};

export default api;
