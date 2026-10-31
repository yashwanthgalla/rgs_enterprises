import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { Godown, RentEntry, Expense, Staff, Asset, AppSettings } from '../types';

// Get base URL from environment or fallback to live Render backend
const getBaseUrl = (): string => {
  let envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || envUrl.trim() === '') {
    envUrl = 'https://rgs-enterprises.onrender.com/api/v1';
  }
  envUrl = envUrl.replace(/\/+$/, '');
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

// Interceptor to handle unauthenticated 401s and extract server error messages
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const data = error.response?.data;
    if (data) {
      if (data.errors && typeof data.errors === 'object') {
        const errorDetails = Object.values(data.errors).join(', ');
        if (errorDetails) {
          error.message = errorDetails;
        }
      } else if (data.message) {
        error.message = data.message;
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

// Normalize list responses from Spring Data Page or Array
const normalizeList = <T>(res: any, mapper: (item: any) => T): T[] => {
  const list = Array.isArray(res) ? res : res?.content || [];
  return list.map(mapper);
};

// Normalizers
export const normalizeGodown = (g: any): Godown => {
  if (!g) return g;
  const location = g.location || [g.address, g.city, g.state].filter(Boolean).join(', ') || 'Hyderabad';
  return {
    ...g,
    location,
    capacitySqFt: g.capacitySqFt ?? Number(g.sizeSqft) ?? 0,
    occupiedSqFt: g.occupiedSqFt ?? (g.currentTenant ? (g.sizeSqft || g.capacitySqFt || 0) : 0),
    monthlyRent: Number(g.monthlyRent || 0),
  };
};

export const normalizeRentEntry = (r: any): RentEntry => {
  if (!r) return r;
  return {
    ...r,
    tenantName: r.tenantName || r.currentTenant || 'Tenant',
    month: r.month || r.rentMonth || '',
    amountDue: Number(r.amountDue ?? r.dueAmount ?? 0),
    amountPaid: Number(r.amountPaid ?? r.paidAmount ?? 0),
    paidDate: r.paidDate || r.paymentDate,
    referenceNumber: r.referenceNumber || r.transactionRef,
  };
};

export const normalizeExpense = (e: any): Expense => {
  if (!e) return e;
  return {
    ...e,
    expenseDate: e.expenseDate || e.billDate || '',
    amount: Number(e.amount || 0),
    billResponsibility: e.billResponsibility || e.responsibility || 'COMPANY',
  };
};

export const normalizeStaff = (s: any): Staff => {
  if (!s) return s;
  return {
    ...s,
    phoneNumber: s.phoneNumber || s.phone || '',
    monthlySalary: Number(s.monthlySalary || 0),
  };
};

export const normalizeAsset = (a: any): Asset => {
  if (!a) return a;
  return {
    ...a,
    purchaseCost: Number(a.purchaseCost ?? a.cost ?? 0),
    warrantyExpiry: a.warrantyExpiry || a.warrantyExpiryDate,
    status: a.status || (a.condition === 'DAMAGED' ? 'NEEDS_REPAIR' : 'OPERATIONAL'),
  };
};

export const normalizeSettings = (s: any): AppSettings => {
  if (!s) return s;
  return {
    companyName: s.companyName || 'RGS ENTERPRISES',
    companyTagline: s.companyTagline || 'Industrial Godown & Warehouse Assets Management',
    contactEmail: s.contactEmail || s.alertEmail || 'rgsenterprise2026@gmail.com',
    contactPhone: s.contactPhone || '',
    address: s.address || s.companyAddress || '',
    currency: s.currencySymbol || s.currency || s.defaultCurrency || '₹',
    logoUrl: s.logoUrl || '/2.jpeg',
  };
};

// API Services
export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data).then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
  updateProfile: (data: {
    username?: string;
    newUsername?: string;
    email?: string;
    newEmail?: string;
    fullName?: string;
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
    api.get(`/godowns?page=${page}&size=${size}`).then(unwrap).then((res: any) => {
      if (res?.content) {
        return { ...res, content: res.content.map(normalizeGodown) };
      }
      return normalizeList(res, normalizeGodown);
    }),
  getAllList: () =>
    api.get('/godowns/all').then(unwrap).then((res: any) => normalizeList(res, normalizeGodown)),
  getCities: () => api.get('/godowns/cities').then(unwrap),
  getById: (id: number | string) =>
    api.get(`/godowns/${id}`).then(unwrap).then(normalizeGodown),
  getSummary: (id: number | string) =>
    api.get(`/godowns/${id}/summary`).then(unwrap),
  create: (data: any) => {
    const payload = {
      name: data.name,
      code: data.code || `GDW-${Math.floor(100 + Math.random() * 900)}`,
      city: data.city || 'Hyderabad',
      state: data.state || 'Telangana',
      address: data.address || data.location || 'Plot Address',
      pincode: data.pincode || '500051',
      sizeSqft: Number(data.sizeSqft || data.capacitySqFt || 10000),
      status: data.status || 'ACTIVE',
      currentTenant: data.currentTenant || null,
      tenantPhone: data.tenantPhone || null,
      tenantEmail: data.tenantEmail || null,
      monthlyRent: Number(data.monthlyRent || 0),
      securityAdvance: Number(data.securityAdvance || 0),
      notes: data.notes || null,
    };
    return api.post('/godowns', payload).then(unwrap).then(normalizeGodown);
  },
  update: (id: number | string, data: any) => {
    const payload = {
      name: data.name,
      code: data.code || `GDW-${id}`,
      city: data.city || 'Hyderabad',
      state: data.state || 'Telangana',
      address: data.address || data.location || 'Plot Address',
      pincode: data.pincode || '500051',
      sizeSqft: Number(data.sizeSqft || data.capacitySqFt || 10000),
      status: data.status || 'ACTIVE',
      currentTenant: data.currentTenant || null,
      tenantPhone: data.tenantPhone || null,
      tenantEmail: data.tenantEmail || null,
      monthlyRent: Number(data.monthlyRent || 0),
      securityAdvance: Number(data.securityAdvance || 0),
      notes: data.notes || null,
    };
    return api.put(`/godowns/${id}`, payload).then(unwrap).then(normalizeGodown);
  },
  delete: (id: number | string) => api.delete(`/godowns/${id}`).then(unwrap),
};

export const rentApi = {
  getAll: (params?: { page?: number; size?: number; status?: string; month?: string; godownId?: number }) =>
    api.get('/rent-entries', { params }).then(unwrap).then((res: any) => {
      if (res?.content) {
        return { ...res, content: res.content.map(normalizeRentEntry) };
      }
      return normalizeList(res, normalizeRentEntry);
    }),
  getByGodown: (godownId: number | string) =>
    api.get(`/rent-entries/godown/${godownId}`).then(unwrap).then((res: any) => normalizeList(res, normalizeRentEntry)),
  getById: (id: number | string) =>
    api.get(`/rent-entries/${id}`).then(unwrap).then(normalizeRentEntry),
  create: (data: any) => {
    const payload = {
      godownId: Number(data.godownId),
      rentMonth: data.rentMonth || data.month,
      dueDate: data.dueDate,
      dueAmount: Number(data.dueAmount ?? data.amountDue ?? 0),
      paidAmount: Number(data.paidAmount ?? data.amountPaid ?? 0),
      status: data.status || 'DUE',
      paymentMethod: data.paymentMethod || null,
      transactionRef: data.transactionRef || data.referenceNumber || null,
      notes: data.notes || null,
    };
    return api.post('/rent-entries', payload).then(unwrap).then(normalizeRentEntry);
  },
  recordPayment: (id: number | string, data: {
    amountPaid?: number;
    paidAmount?: number;
    paymentMethod: string;
    referenceNumber?: string;
    transactionRef?: string;
    notes?: string;
    paymentDate?: string;
  }) => {
    const payload = {
      paidAmount: Number(data.paidAmount ?? data.amountPaid ?? 0),
      paymentDate: data.paymentDate || new Date().toISOString().slice(0, 10),
      paymentMethod: data.paymentMethod || 'UPI',
      transactionRef: data.transactionRef || data.referenceNumber || null,
      notes: data.notes || null,
    };
    return api.post(`/rent-entries/${id}/pay`, payload).then(unwrap).then(normalizeRentEntry);
  },
};

export const expenseApi = {
  getAll: (params?: { page?: number; size?: number; status?: string; category?: string; godownId?: number }) =>
    api.get('/expenses', { params }).then(unwrap).then((res: any) => {
      if (res?.content) {
        return { ...res, content: res.content.map(normalizeExpense) };
      }
      return normalizeList(res, normalizeExpense);
    }),
  getByGodown: (godownId: number | string) =>
    api.get(`/expenses/godown/${godownId}`).then(unwrap).then((res: any) => normalizeList(res, normalizeExpense)),
  getById: (id: number | string) =>
    api.get(`/expenses/${id}`).then(unwrap).then(normalizeExpense),
  create: (data: any) => {
    const payload = {
      godownId: data.godownId ? Number(data.godownId) : 1,
      category: data.category || 'ELECTRICITY',
      title: data.title,
      amount: Number(data.amount),
      responsibility: data.responsibility || data.billResponsibility || 'COMPANY',
      status: data.status || 'PENDING',
      billDate: data.billDate || data.expenseDate || new Date().toISOString().slice(0, 10),
      dueDate: data.dueDate || null,
      notes: data.notes || null,
    };
    return api.post('/expenses', payload).then(unwrap).then(normalizeExpense);
  },
  recordPayment: (id: number | string, data?: any) => {
    const payload = {
      paymentDate: data?.paymentDate || new Date().toISOString().slice(0, 10),
      paymentMethod: data?.paymentMethod || 'BANK_TRANSFER',
      transactionRef: data?.transactionRef || null,
      notes: data?.notes || data?.paidBy ? `Paid by ${data.paidBy}` : null,
    };
    return api.post(`/expenses/${id}/pay`, payload).then(unwrap).then(normalizeExpense);
  },
  delete: (id: number | string) => api.delete(`/expenses/${id}`).then(unwrap),
};

export const employeeApi = {
  getAll: (params?: { page?: number; size?: number; status?: string; godownId?: number }) =>
    api.get('/employees', { params }).then(unwrap).then((res: any) => {
      if (res?.content) {
        return { ...res, content: res.content.map(normalizeStaff) };
      }
      return normalizeList(res, normalizeStaff);
    }),
  getByGodown: (godownId: number | string) =>
    api.get(`/employees/godown/${godownId}`).then(unwrap).then((res: any) => normalizeList(res, normalizeStaff)),
  getById: (id: number | string) =>
    api.get(`/employees/${id}`).then(unwrap).then(normalizeStaff),
  create: (data: any) => {
    const payload = {
      godownId: data.godownId ? Number(data.godownId) : null,
      fullName: data.fullName,
      role: data.role || 'Security Guard',
      phone: data.phone || data.phoneNumber,
      email: data.email || null,
      monthlySalary: Number(data.monthlySalary),
      joiningDate: data.joiningDate || new Date().toISOString().slice(0, 10),
      status: data.status || 'ACTIVE',
    };
    return api.post('/employees', payload).then(unwrap).then(normalizeStaff);
  },
  delete: (id: number | string) => api.delete(`/employees/${id}`).then(unwrap),
};

export const salaryApi = {
  getAll: (params?: { page?: number; size?: number; employeeId?: number; month?: string }) =>
    api.get('/salary-payments', { params }).then(unwrap),
  getByEmployee: (employeeId: number | string) =>
    api.get(`/salary-payments/employee/${employeeId}`).then(unwrap),
  create: (data: any) => {
    const payload = {
      employeeId: Number(data.employeeId),
      paymentMonth: data.paymentMonth || data.month,
      amount: Number(data.amount),
      paymentDate: data.paymentDate || new Date().toISOString().slice(0, 10),
      paymentMode: data.paymentMode || data.paymentMethod || 'BANK_TRANSFER',
      status: data.status || 'PAID',
      notes: data.notes || null,
    };
    return api.post('/salary-payments', payload).then(unwrap);
  },
};

export const assetApi = {
  getAll: (params?: { page?: number; size?: number; status?: string; godownId?: number }) =>
    api.get('/assets', { params }).then(unwrap).then((res: any) => {
      if (res?.content) {
        return { ...res, content: res.content.map(normalizeAsset) };
      }
      return normalizeList(res, normalizeAsset);
    }),
  getByGodown: (godownId: number | string) =>
    api.get(`/assets/godown/${godownId}`).then(unwrap).then((res: any) => normalizeList(res, normalizeAsset)),
  getById: (id: number | string) =>
    api.get(`/assets/${id}`).then(unwrap).then(normalizeAsset),
  create: (data: any) => {
    const payload = {
      godownId: data.godownId ? Number(data.godownId) : null,
      name: data.name,
      category: data.category || 'CCTV',
      serialNumber: data.serialNumber || null,
      quantity: 1,
      cost: Number(data.cost ?? data.purchaseCost ?? 0),
      condition: data.condition || data.status || 'GOOD',
      purchaseDate: data.purchaseDate || new Date().toISOString().slice(0, 10),
      warrantyExpiryDate: data.warrantyExpiryDate || data.warrantyExpiry || null,
      notes: data.notes || null,
    };
    return api.post('/assets', payload).then(unwrap).then(normalizeAsset);
  },
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
  get: () => api.get('/settings').then(unwrap).then(normalizeSettings),
  update: (data: any) => {
    const payload = {
      companyName: data.companyName,
      companyTagline: data.companyTagline,
      currencySymbol: data.currencySymbol || data.defaultCurrency || data.currency || '₹',
      defaultCurrency: data.currencySymbol || data.defaultCurrency || data.currency || '₹',
      contactEmail: data.contactEmail || data.alertEmail,
      alertEmail: data.contactEmail || data.alertEmail,
      contactPhone: data.contactPhone,
      companyAddress: data.companyAddress || data.address,
      logoUrl: data.logoUrl,
    };
    return api.put('/settings', payload).then(unwrap).then(normalizeSettings);
  },
};
