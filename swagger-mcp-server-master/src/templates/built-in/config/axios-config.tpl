/**
 * Auto-generated Axios client configuration
 * Generated through Swagger MCP Server
 */
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import axios from "axios";

/**
 * API Configuration
 */
export const API_CONFIG: AxiosRequestConfig = {
  baseURL: "{baseUrl}",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  }
};

/**
 * Axios instance with interceptors
 */
export const axiosInstance: AxiosInstance = axios.create(API_CONFIG);

// Request interceptor - Handle auth tokens and other request modifications
axiosInstance.interceptors.request.use(
  (config) => {
    // 从本地存储获取token并添加到请求头
    // const token = localStorage.getItem("auth_token");
    // if (token) {
    //   config.headers["Authorization"] = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle common error cases
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          console.error("Unauthorized access");
          // 处理未授权情况
          break;
        case 403:
          console.error("Forbidden access");
          // 处理禁止访问情况
          break;
        case 404:
          console.error("Resource not found");
          // 处理资源不存在情况
          break;
        case 500:
          console.error("Server error");
          // 处理服务器错误
          break;
        default:
          console.error(`Error with status: ${error.response.status}`);
      }
    } else if (error.request) {
      console.error("No response received", error.request);
    } else {
      console.error("Error", error.message);
    }
    return Promise.reject(error);
  }
);
