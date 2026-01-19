// services/axiosInstance.ts
import axios, { type AxiosResponse } from "axios";

// Tạo instance riêng
export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api", // cấu hình
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// =======================
// Request Interceptor
// =======================
axiosInstance.interceptors.request.use(
  (config) => {
    // Gắn token nếu có
    // const token = localStorage.getItem("access_token");
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =======================
// Response Interceptor
// =======================
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Ví dụ: token hết hạn → logout
      localStorage.removeItem("access_token");
      window.location.href = "/login"; // hoặc dispatch logout
    } else if (error.response?.status >= 400 && error.response?.status <= 500) {
      return Promise.reject(error?.response?.data);
    }

    return Promise.reject(error);
  }
);
