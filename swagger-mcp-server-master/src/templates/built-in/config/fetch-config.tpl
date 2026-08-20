/**
 * Auto-generated Fetch client configuration
 * Generated through Swagger MCP Server
 */

/**
 * API Configuration
 */
export const API_CONFIG = {
  baseURL: "{baseUrl}",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  timeout: 30000,
};

/**
 * Common response interface
 */
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  status: number;
  ok: boolean;
}

/**
 * Error response interface
 */
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Fetch API wrapper with timeout and error handling
 */
export async function fetchWithConfig<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Add default headers
  const headers = {
    ...API_CONFIG.headers,
    ...options.headers,
  };
  
  // Add authorization if available
  // const token = localStorage.getItem("auth_token");
  // if (token) {
  //   headers.Authorization = `Bearer ${token}`;
  // }
  
  // Set up request options with headers
  const requestOptions: RequestInit = {
    ...options,
    headers,
  };
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
  requestOptions.signal = controller.signal;
  
  try {
    // Make the request
    const response = await fetch(`${API_CONFIG.baseURL}${url}`, requestOptions);
    
    // Parse response
    let data;
    let error;
    
    try {
      if (response.headers.get("Content-Type")?.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (e) {
      console.error("Error parsing response:", e);
    }
    
    // Handle error cases
    if (!response.ok) {
      error = {
        message: data?.message || "Unknown error occurred",
        code: data?.code,
        status: response.status,
      };
      
      // Handle specific error codes
      switch (response.status) {
        case 401:
          console.error("Unauthorized access");
          // 处理未授权情况 - 重定向到登录页或显示消息
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
      }
    }
    
    return {
      data: data as T,
      error,
      status: response.status,
      ok: response.ok,
    };
  } catch (err) {
    // Handle network errors or timeouts
    const isTimeout = (err as Error).name === "AbortError";
    const errorMessage = isTimeout
      ? `Request timed out (${API_CONFIG.timeout}ms)`
      : (err as Error).message;
    
    return {
      error: {
        message: errorMessage,
        code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
      },
      status: 0,
      ok: false,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
