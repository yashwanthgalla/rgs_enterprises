import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Get base URL from environment or fallback to live Render backend
const getBaseUrl = (): string => {
  let envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || envUrl.trim() === '') {
    envUrl = 'https://rgs-enterprises.onrender.com/api/v1';
  }
  // Remove trailing slashes
  envUrl = envUrl.replace(/\/+$/, '');
  // Ensure it includes /api/v1
  if (!envUrl.endsWith('/api/v1')) {
    envUrl = `${envUrl}/api/v1`;
  }
  return envUrl;
};

export const API_BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Interceptor to inject JWT Bearer Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Interceptor to handle unauthenticated 401s
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and user session if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper unwrapper for backend ApiResponse<T>
export const unwrap = <T>(res: { data: { data?: T; [key: string]: any } }): T => {
  if (res.data && 'data' in res.data && res.data.data !== undefined) {
    return res.data.data as T;
  }
  return res.data as unknown as T;
};

// API Services
export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data).then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
  updateProfile: (data: {
    newUsername?: string;
    newEmail?: string;
    newFullName?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => api.put('/auth/profile', data).then(unwrap),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats').then(unwrap),
  getReminders: () => api.get('/dashboard/reminders').then(unwrap),
  getCashflowTrend: (months = 6) =>
    api.get(`/dashboard/cashflow-trend?months=${months}`).then(unwrap),
};

export const godownApi = {
  getAll: (page = 0, size = 50) =>
    api.get(`/godowns?page=${page}&size=${size}`).then(unwrap),
  getAllList: () => api.get('/godowns/all').then(unwrap),
  getCities: () => api.get('/godowns/cities').then(unwrap),
  getById: (id: number | string) => api.get(`/godowns/${id}`).then(unwrap),
  getSummary: (id: number | string) =>
    api.get(`/godowns/${id}/summary`).then(unwrap),
  create: (data: any) => api.post('/godowns', data).then(unwrap),
  update: (id: number | string, data: any) =>
    api.put(`/godowns/${id}`, data).then(unwrap),
  delete: (id: number | string) => api.delete(`/godowns/${id}`).then(unwrap),
};

export const rentApi = {
  getAll: (params?: { page?: number; size?: number; status?: string; month?: string; godownId?: number }) =>
    api.get('/rent-entries', { params }).then(unwrap),
  getByGodown: (godownId: number | string) =>
    api.get(`/rent-entries/godown/${godownId}`).then(unwrap),
  getById: (id: number | string) =>
    api.get(`/rent-entries/${id}`).then(unwrap),
  create: (data: any) => api.post('/rent-entries', data).then(unwrap),
  update: (id: number | string, data: any) =>
    api.put(`/rent-entries/${id}`, data).then(unwrap),
  recordPayment: (id: number | string, data: {
    amountPaid: number;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
  }) => api.post(`/rent-entries/${id}/pay`, data).then(unwrap),
};

export const expenseApi = {
  getAll: (params?: { page?: number; size?: number; status?: string; category?: string; godownId?: number }) =>
    api.get('/expenses', { params }).then(unwrap),
  getByGodown: (godownId: number | string) =>
    api.get(`/expenses/godown/${godownId}`).then(unwrap),
  getById: (id: number | string) => api.get(`/expenses/${id}`).then(unwrap),
  create: (data: any) => api.post('/expenses', data).then(unwrap),
  update: (id: number | string, data: any) =>
    api.put(`/expenses/${id}`, data).then(unwrap),
  recordPayment: (id: number | string, data: { paidBy?: string; notes?: string }) =>
    api.post(`/expenses/${id}/pay`, data).then(unwrap),
  delete: (id: number | string) => api.delete(`/expenses/${id}`).then(unwrap),
};

export const employeeApi = {
  getAll: (params?: { page?: number; size?: number; status?: string; godownId?: number }) =>
    api.get('/employees', { params }).then(unwrap),
  getByGodown: (godownId: number | string) =>
    api.get(`/employees/godown/${godownId}`).then(unwrap),
  getById: (id: number | string) => api.get(`/employees/${id}`).then(unwrap),
  create: (data: any) => api.post('/employees', data).then(unwrap),
  update: (id: number | string, data: any) =>
    api.put(`/employees/${id}`, data).then(unwrap),
  delete: (id: number | string) => api.delete(`/employees/${id}`).then(unwrap),
};

export const salaryApi = {
  getAll: (params?: { page?: number; size?: number; employeeId?: number; month?: string }) =>
    api.get('/salary-payments', { params }).then(unwrap),
  getByEmployee: (employeeId: number | string) =>
    api.get(`/salary-payments/employee/${employeeId}`).then(unwrap),
  create: (data: any) => api.post('/salary-payments', data).then(unwrap),
  update: (id: number | string, data: any) =>
    api.put(`/salary-payments/${id}`, data).then(unwrap),
};

export const assetApi = {
  getAll: (params?: { page?: number; size?: number; status?: string; godownId?: number }) =>
    api.get('/assets', { params }).then(unwrap),
  getByGodown: (godownId: number | string) =>
    api.get(`/assets/godown/${godownId}`).then(unwrap),
  getById: (id: number | string) => api.get(`/assets/${id}`).then(unwrap),
  create: (data: any) => api.post('/assets', data).then(unwrap),
  update: (id: number | string, data: any) =>
    api.put(`/assets/${id}`, data).then(unwrap),
  delete: (id: number | string) => api.delete(`/assets/${id}`).then(unwrap),
};

export const documentApi = {
  getAll: (params?: { page?: number; size?: number; godownId?: number }) =>
    api.get('/documents', { params }).then(unwrap),
  getByGodown: (godownId: number | string) =>
    api.get(`/documents/godown/${godownId}`).then(unwrap),
  getById: (id: number | string) => api.get(`/documents/${id}`).then(unwrap),
  upload: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap),
  download: (id: number | string) => api.get(`/documents/${id}/download`).then(unwrap),
  delete: (id: number | string) => api.delete(`/documents/${id}`).then(unwrap),
};

export const reportApi = {
  getSummary: (year?: number) =>
    api.get('/reports/summary', { params: { year } }).then(unwrap),
  getGodownPnl: (year?: number) =>
    api.get('/reports/godown-pnl', { params: { year } }).then(unwrap),
  exportCsvUrl: (year?: number) =>
    `${API_BASE_URL}/reports/export-csv${year ? `?year=${year}` : ''}`,
};

export const settingsApi = {
  get: () => api.get('/settings').then(unwrap),
  update: (data: any) => api.put('/settings', data).then(unwrap),
};

