/*import axios from 'axios'
import { env } from '@/lib/env'

export const api = axios.create({ baseURL: env.API_URL, withCredentials: true })

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('hb_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // TODO: route to login
    }
    return Promise.reject(err)
  },
)

export type ApiResult<T> = Promise<T>

export const http = {
  get: async <T>(url: string, params?: any): ApiResult<T> => (await api.get<T>(url, { params })).data,
  post: async <T>(url: string, body?: any): ApiResult<T> => (await api.post<T>(url, body)).data,
  put: async <T>(url: string, body?: any): ApiResult<T> => (await api.put<T>(url, body)).data,
  patch: async <T>(url: string, body?: any): ApiResult<T> => (await api.patch<T>(url, body)).data,
  del: async <T>(url: string): ApiResult<T> => (await api.delete<T>(url)).data,
  postForm: async <T>(url: string, form: FormData): ApiResult<T> =>
    (await api.post<T>(url, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data,
}
*/



// api/api.ts
import axios from "axios";
import { env } from "@/lib/env";

export const api = axios.create({
  baseURL: env.API_URL,
  withCredentials: true,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("hb_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // TODO: route to login when unauthorized
    }
    return Promise.reject(err);
  }
);

export type ApiResult<T> = Promise<T>;

export const http = {
  get: async <T>(url: string, params?: any): ApiResult<T> =>
    (await api.get<T>(url, { params })).data,
  post: async <T>(url: string, body?: any): ApiResult<T> =>
    (await api.post<T>(url, body)).data,
  put: async <T>(url: string, body?: any): ApiResult<T> =>
    (await api.put<T>(url, body)).data,
  patch: async <T>(url: string, body?: any): ApiResult<T> =>
    (await api.patch<T>(url, body)).data,
  del: async <T>(url: string): ApiResult<T> =>
    (await api.delete<T>(url)).data,
  postForm: async <T>(
    url: string,
    form: FormData
  ): ApiResult<T> =>
    (
      await api.post<T>(url, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data,
};
