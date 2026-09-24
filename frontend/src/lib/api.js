import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'sams.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Axios instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = tokenStore.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle 401 & format response
axiosInstance.interceptors.response.use(
  (response) => {
    // If request was for raw blob download
    if (response.config.responseType === 'blob') {
      return response.data;
    }
    // Return inner data field if formatted as { success, data }
    return response.data?.data !== undefined ? response.data.data : response.data;
  },
  (error) => {
    const status = error.response?.status;
    const errorData = error.response?.data?.error;

    if (status === 401) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
      return Promise.reject(new ApiError('Your session expired. Please sign in again.', 401));
    }

    const message = errorData?.message || error.message || `Request failed (${status || 'Network Error'})`;
    return Promise.reject(new ApiError(message, status, errorData?.details));
  },
);

export const api = {
  get: (path, params, opts = {}) => axiosInstance.get(path, { params, ...opts }),
  post: (path, body, opts = {}) => axiosInstance.post(path, body, opts),
  put: (path, body, opts = {}) => axiosInstance.put(path, body, opts),
  patch: (path, body, opts = {}) => axiosInstance.patch(path, body, opts),
  delete: (path, opts = {}) => axiosInstance.delete(path, opts),
  download: (path, params, opts = {}) =>
    axiosInstance.get(path, { params, responseType: 'blob', ...opts }),
};

/** Triggers a browser download for exported reports. */
export async function downloadReport({ type, format = 'excel', ...filters }) {
  const blob = await api.download('/reports/export', { type, format, ...filters });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-report-${new Date().toISOString().slice(0, 10)}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { axiosInstance as axios };
export default api;

