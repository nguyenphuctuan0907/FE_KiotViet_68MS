import { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { axiosInstance } from "./axiosInstance";

function wrapApi<T>(method: "GET" | "POST" | "PUT" | "DELETE", fn: (params?: any) => Promise<T>) {
  (fn as any).method = method;
  return fn;
}

export const baseService = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await axiosInstance.get(url, config);
    return response.data; // chỉ lấy data
  },
  post: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await axiosInstance.post(url, data, config);
    return response.data;
  },
  put: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await axiosInstance.put(url, data, config);
    return response.data;
  },
  patch: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await axiosInstance.patch(url, data, config);
    return response.data;
  },
  delete: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await axiosInstance.delete(url, {
      ...config,
      data: data
    });
    return response.data;
  }
};
