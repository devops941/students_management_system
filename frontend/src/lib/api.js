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

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    qs.append(key, value);
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

/**
 * Single entry point for all API calls. Handles auth header, JSON parsing and
 * a global 401 handler so an expired session bounces to the login screen.
 */
async function request(path, { method = 'GET', body, params, raw = false, signal } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}${buildQuery(params)}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (res.status === 401) {
    tokenStore.clear();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login');
    }
    throw new ApiError('Your session expired. Please sign in again.', 401);
  }

  if (raw) {
    if (!res.ok) throw new ApiError('Request failed', res.status);
    return res.blob();
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new ApiError(
      payload?.error?.message || `Request failed (${res.status})`,
      res.status,
      payload?.error?.details,
    );
  }
  return payload?.data;
}

export const api = {
  get: (path, params, opts) => request(path, { ...opts, params }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  download: (path, params) => request(path, { params, raw: true }),
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

export default api;
