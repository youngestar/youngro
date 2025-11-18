import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

// 前端通用 Axios 实例
// - 默认以相对路径调用本应用的 API 路由（/api/*）
// - 如需代理到外部网关，可设置 NEXT_PUBLIC_API_BASE_URL
const baseURL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();

export const api: AxiosInstance = axios.create({
  baseURL: baseURL || undefined,
  timeout: 60_000,
  // withCredentials 可按需开启
  // withCredentials: true,
});

// 统一请求拦截：设置通用头、可注入追踪信息等
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.headers = config.headers || {};
    // 仅当未显式指定时设置 JSON 头
    if (!config.headers["Accept"])
      config.headers["Accept"] = "application/json";
    if (!config.headers["Content-Type"] && needsJsonContentType(config)) {
      config.headers["Content-Type"] = "application/json";
    }
    // 这里可以按需注入前端会话 ID、请求 ID 等
    // config.headers['x-request-id'] = crypto.randomUUID?.() || Date.now().toString()
    return config;
  },
  (error) => Promise.reject(error),
);

// 统一响应拦截：直接返回 data；错误归一化
api.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    const normalized = normalizeAxiosError(error);
    return Promise.reject(normalized);
  },
);

// 简化方法（保持类型友好）：
export function get<T = unknown>(url: string, config?: AxiosRequestConfig) {
  return api.get<T>(url, config);
}

export function post<T = unknown, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
) {
  return api.post<T>(url, body, config);
}

export function put<T = unknown, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
) {
  return api.put<T>(url, body, config);
}

export function patch<T = unknown, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
) {
  return api.patch<T>(url, body, config);
}

export function del<T = unknown>(url: string, config?: AxiosRequestConfig) {
  return api.delete<T>(url, config);
}

// —— Helpers ——

function needsJsonContentType(config: InternalAxiosRequestConfig) {
  const method = (config.method || "get").toLowerCase();
  return ["post", "put", "patch"].includes(method);
}

export interface ApiError extends Error {
  status?: number;
  data?: unknown;
  code?: string;
  isApiError: true;
}

export function normalizeAxiosError(err: AxiosError): ApiError {
  const status = err.response?.status;
  const data = err.response?.data;
  const message = (() => {
    if (typeof data === "object" && data) {
      const maybe = data as Record<string, unknown>;
      if (typeof maybe.message === "string") return maybe.message;
    }
    return err.message || "Request failed";
  })();

  const e = new Error(message) as ApiError;
  e.status = status;
  e.data = data;
  e.code = err.code;
  e.isApiError = true;
  return e;
}

// 使用示例：
// import { post } from '@/src/lib/api'
// const res = await post('/api/chat', { messages: [...], model: 'deepseek-chat', stream: false })
