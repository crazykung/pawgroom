// lib/api.ts
// HTTP client wrapper สำหรับ Next.js frontend

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

export const api = {
  // Auth
  login: (data: { tenantSlug: string; email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: data }),

  refresh: (refreshToken: string) =>
    request('/auth/refresh', { method: 'POST', body: { refreshToken } }),

  // Customers
  getCustomers: (token: string, search?: string) =>
    request(`/customers${search ? `?search=${search}` : ''}`, { token }),

  getCustomer: (id: string, token: string) =>
    request(`/customers/${id}`, { token }),

  createCustomer: (data: unknown, token: string) =>
    request('/customers', { method: 'POST', body: data, token }),

  lookupCustomer: (phone: string, token: string) =>
    request(`/customers/lookup?phone=${phone}`, { token }),

  // Queue
  getQueue: (token: string) =>
    request('/queue', { token }),

  createQueueTicket: (data: unknown, token: string) =>
    request('/queue', { method: 'POST', body: data, token }),

  updateQueueStatus: (id: string, status: string, token: string) =>
    request(`/queue/${id}/status`, { method: 'PATCH', body: { status }, token }),

  // Appointments
  getAppointments: (token: string, date?: string) =>
    request(`/appointments${date ? `?date=${date}` : ''}`, { token }),

  createAppointment: (data: unknown, token: string) =>
    request('/appointments', { method: 'POST', body: data, token }),

  // Jobs
  getJobs: (token: string) =>
    request('/job-orders', { token }),

  updateJobStatus: (id: string, status: string, token: string) =>
    request(`/job-orders/${id}/status`, { method: 'PATCH', body: { status }, token }),

  // Invoices
  createInvoice: (jobOrderId: string, token: string) =>
    request(`/invoices/from-job/${jobOrderId}`, { method: 'POST', token }),

  issueInvoice: (id: string, token: string) =>
    request(`/invoices/${id}/issue`, { method: 'POST', token }),

  addPayment: (id: string, data: unknown, token: string) =>
    request(`/invoices/${id}/payments`, { method: 'POST', body: data, token }),

  // Services
  getServices: (token: string) =>
    request('/services', { token }),

  getPricingQuote: (params: unknown, token: string) =>
    request('/pricing/quote', { method: 'POST', body: params, token }),

  // Settings
  getCompanyProfile: (token: string) =>
    request('/settings/company-profile', { token }),

  updateCompanyProfile: (data: unknown, token: string) =>
    request('/settings/company-profile', { method: 'PATCH', body: data, token }),

  getSettings: (prefix: string, token: string) =>
    request(`/settings/kv?prefix=${prefix}`, { token }),

  updateSettings: (items: unknown[], token: string) =>
    request('/settings/kv', { method: 'PUT', body: { items }, token }),

  // Health
  health: () =>
    request('/health'),
};

export default api;

// ─────────────────────────────────────────────────────────────────────────────
// apiClient — axios-compatible thin wrapper (used by admin pages)
// Returns { data: T } so pages can destructure consistently
// ─────────────────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

async function clientRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { responseType?: string },
): Promise<{ data: T }> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
  const url = path.startsWith('http') ? path : `${apiBase}${path}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    // Attempt token refresh
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      const r = await fetch(`${apiBase}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (r.ok) {
        const tokens = await r.json();
        localStorage.setItem('access_token', tokens.accessToken);
        // Retry original request
        return clientRequest<T>(method, path, body, opts);
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return { data: {} as T };

  if (opts?.responseType === 'blob') {
    const blob = await res.blob();
    return { data: blob as unknown as T };
  }

  const data = await res.json();
  return { data };
}

export const apiClient = {
  get: <T = unknown>(path: string, opts?: { responseType?: string }) =>
    clientRequest<T>('GET', path, undefined, opts),
  post: <T = unknown>(path: string, body?: unknown) =>
    clientRequest<T>('POST', path, body),
  put: <T = unknown>(path: string, body?: unknown) =>
    clientRequest<T>('PUT', path, body),
  patch: <T = unknown>(path: string, body?: unknown) =>
    clientRequest<T>('PATCH', path, body),
  delete: <T = unknown>(path: string) =>
    clientRequest<T>('DELETE', path),
};

