import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { Godown, RentEntry, Expense, Staff, Asset, AppSettings } from '../types';

// Get base URL from environment or fallback to live local/production backend
const getBaseUrl = (): string => {
  let envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || envUrl.trim() === '') {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      envUrl = 'http://localhost:8000/api/v1';
    } else {
      envUrl = 'https://rgs-enterprises-backend.vercel.app/api/v1';
    }
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

// In-Memory Request Cache & In-Flight Promise Deduplication Layer
interface CacheEntry {
  data: any;
  timestamp: number;
}

const apiCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();
const DEFAULT_TTL_MS = 25000; // 25s TTL for smooth instant page navigation

export const clearApiCache = (pattern?: string | RegExp) => {
  if (!pattern) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)) {
      apiCache.delete(key);
    }
  }
};

// Cached & Deduplicated GET Request Dispatcher
export const cachedGet = async <T = any>(
  url: string,
  config?: any,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> => {
  const skipCache = Boolean(config?.skipCache);
  const cacheKey = `${url}?${JSON.stringify(config?.params || {})}`;

  // 1. Serve from TTL cache if valid and not skipping
  if (!skipCache) {
    const entry = apiCache.get(cacheKey);
    if (entry && Date.now() - entry.timestamp < ttlMs) {
      return entry.data as T;
    }
  }

  // 2. Return identical pending in-flight promise to prevent duplicate wire calls
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  // 3. Dispatch fresh request and share promise
  const promise = api.get(url, config)
    .then((res) => {
      const unwrapped = unwrap<T>(res);
      apiCache.set(cacheKey, { data: unwrapped, timestamp: Date.now() });
      return unwrapped;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, promise);
  return promise;
};

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

// Interceptor to handle unauthenticated 401s, invalidate caches on mutations, and format errors
api.interceptors.response.use(
  (response) => {
    // Invalidate relevant cache keys upon any successful data mutation
    const method = response.config.method?.toUpperCase();
    if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const url = response.config.url || '';
      if (url.includes('/godowns')) clearApiCache('godown');
      if (url.includes('/finance')) clearApiCache('finance');
      if (url.includes('/rent')) clearApiCache('rent');
      if (url.includes('/expenses')) clearApiCache('expense');
      if (url.includes('/employees') || url.includes('/staff')) clearApiCache('employee');
      if (url.includes('/assets')) clearApiCache('asset');
      if (url.includes('/reports')) clearApiCache('report');
      if (url.includes('/dashboard')) clearApiCache('dashboard');
      // Cross-cutting mutations clear financial stats and reports
      clearApiCache('stats');
      clearApiCache('summary');
      clearApiCache('cashflow');
    }
    return response;
  },
  (error: AxiosError<any>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      apiCache.clear();
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
    companyTagline: s.companyTagline || 'Industrial Hub & Warehouse Assets Management',
    contactEmail: s.contactEmail || s.alertEmail || 'rgsenterprise2026@gmail.com',
    contactPhone: s.contactPhone || '',
    address: s.address || s.companyAddress || '',
    currency: s.currencySymbol || s.currency || s.defaultCurrency || '₹',
    logoUrl: s.logoUrl || '/2.jpeg',
  };
};

// API Services with Intelligent Caching & Request Deduplication
export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data).then(unwrap),
  me: () => cachedGet('/auth/me', {}, 60000), // 1 min TTL for auth/me
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
  getStats: (skipCache = false) => cachedGet('/dashboard/stats', { skipCache }, 15000),
  getReminders: (skipCache = false) => cachedGet('/dashboard/reminders', { skipCache }, 20000),
  getCashflowTrend: (months = 6, skipCache = false) =>
    cachedGet(`/dashboard/cashflow-trend?months=${months}`, { skipCache }, 30000),
};

export const godownApi = {
  getAll: (page = 0, size = 50, skipCache = false) =>
    cachedGet(`/godowns?page=${page}&size=${size}`, { skipCache }, 20000).then((res: any) => {
      if (res?.content) {
        return { ...res, content: res.content.map(normalizeGodown) };
      }
      return normalizeList(res, normalizeGodown);
    }),
  getAllList: (skipCache = false) =>
    cachedGet('/godowns/all', { skipCache }, 30000).then((res: any) => normalizeList(res, normalizeGodown)),
  getCities: (skipCache = false) => cachedGet('/godowns/cities', { skipCache }, 60000),
  getById: (id: number | string, skipCache = false) =>
    cachedGet(`/godowns/${id}`, { skipCache }, 20000).then(normalizeGodown),
  getSummary: (id: number | string, skipCache = false) =>
    cachedGet(`/godowns/${id}/summary`, { skipCache }, 20000),
  revealCctvPassword: (id: number | string, adminPassword: string) =>
    api.post(`/godowns/${id}/reveal-cctv-password`, { adminPassword }).then(unwrap),
  create: (data: any) => {
    const payload = {
      name: data.name || data.erpName,
      erpName: data.erpName || data.name,
      code: data.code || `HUB-${Math.floor(100 + Math.random() * 900)}`,
      city: data.city || 'Hyderabad',
      state: data.state || 'Telangana',
      address: data.address || data.locationAddress || data.location || 'Location Address',
      locationAddress: data.locationAddress || data.address || data.location || 'Location Address',
      pincode: data.pincode || '500051',
      sizeSqft: data.capacitySqFt ? Number(data.capacitySqFt) : (data.sizeSqft ? Number(data.sizeSqft) : 0),
      totalCapacity: data.capacitySqFt ? Number(data.capacitySqFt) : (data.totalCapacity ? Number(data.totalCapacity) : 0),
      status: data.status || 'ACTIVE',
      hubStatus: data.status || 'ACTIVE',
      hubModel: data.hubModel || 'LDP',
      currentTenant: data.currentTenant || null,
      tenantPhone: data.tenantPhone || null,
      tenantEmail: data.tenantEmail || null,
      leaseStartDate: data.leaseStartDate || null,
      leaseEndDate: data.leaseEndDate || null,
      leaseDurationMonths: data.leaseDurationMonths || 0,
      monthlyRent: Number(data.monthlyRent || 0),
      securityAdvance: Number(data.securityAdvance ?? data.refundableAdvance ?? 0),
      refundableAdvance: Number(data.refundableAdvance ?? data.securityAdvance ?? 0),
      totalSetupCost: Number(data.totalSetupCost || 0),
      hubPocName: data.hubPocName || null,
      hubPocContact: data.hubPocContact || null,
      googleLocation: data.googleLocation || null,
      operationsPocName: data.operationsPocName || null,
      operationsPocMobile: data.operationsPocMobile || null,
      broadbandDetails: data.broadbandDetails || [],
      cctvUsername: data.cctvUsername || null,
      cctvPassword: data.cctvPassword || null,
      cctvAccessUrl: data.cctvAccessUrl || null,
      hasLabourLicence: Boolean(data.hasLabourLicence),
      labourLicenceStartDate: data.hasLabourLicence ? data.labourLicenceStartDate : null,
      labourLicenceExpiryDate: data.hasLabourLicence ? data.labourLicenceExpiryDate : null,
      hasTradeLicence: Boolean(data.hasTradeLicence),
      tradeLicenceStartDate: data.hasTradeLicence ? data.tradeLicenceStartDate : null,
      tradeLicenceExpiryDate: data.hasTradeLicence ? data.tradeLicenceExpiryDate : null,
      electricityProvider: data.electricityProvider || null,
      electricityServiceNumber: data.electricityServiceNumber || null,
      leaseContactName: data.leaseContactName || null,
      leaseContactMobile: data.leaseContactMobile || null,
      ownerAddress: data.ownerAddress || null,
      notes: data.notes || null,
    };
    return api.post('/godowns', payload).then(unwrap).then(normalizeGodown);
  },
  update: (id: number | string, data: any) => {
    const payload = {
      name: data.name || data.erpName,
      erpName: data.erpName || data.name,
      code: data.code || `HUB-${id}`,
      city: data.city || 'Hyderabad',
      state: data.state || 'Telangana',
      address: data.address || data.locationAddress || data.location || 'Location Address',
      locationAddress: data.locationAddress || data.address || data.location || 'Location Address',
      pincode: data.pincode || '500051',
      sizeSqft: data.capacitySqFt ? Number(data.capacitySqFt) : (data.sizeSqft ? Number(data.sizeSqft) : 0),
      totalCapacity: data.capacitySqFt ? Number(data.capacitySqFt) : (data.totalCapacity ? Number(data.totalCapacity) : 0),
      status: data.status || 'ACTIVE',
      hubStatus: data.status || 'ACTIVE',
      hubModel: data.hubModel || 'LDP',
      currentTenant: data.currentTenant || null,
      tenantPhone: data.tenantPhone || null,
      tenantEmail: data.tenantEmail || null,
      leaseStartDate: data.leaseStartDate || null,
      leaseEndDate: data.leaseEndDate || null,
      leaseDurationMonths: data.leaseDurationMonths || 0,
      monthlyRent: Number(data.monthlyRent || 0),
      securityAdvance: Number(data.securityAdvance ?? data.refundableAdvance ?? 0),
      refundableAdvance: Number(data.refundableAdvance ?? data.securityAdvance ?? 0),
      totalSetupCost: Number(data.totalSetupCost || 0),
      hubPocName: data.hubPocName || null,
      hubPocContact: data.hubPocContact || null,
      googleLocation: data.googleLocation || null,
      operationsPocName: data.operationsPocName || null,
      operationsPocMobile: data.operationsPocMobile || null,
      broadbandDetails: data.broadbandDetails || [],
      cctvUsername: data.cctvUsername || null,
      cctvPassword: data.cctvPassword || null,
      cctvAccessUrl: data.cctvAccessUrl || null,
      hasLabourLicence: Boolean(data.hasLabourLicence),
      labourLicenceStartDate: data.hasLabourLicence ? data.labourLicenceStartDate : null,
      labourLicenceExpiryDate: data.hasLabourLicence ? data.labourLicenceExpiryDate : null,
      hasTradeLicence: Boolean(data.hasTradeLicence),
      tradeLicenceStartDate: data.hasTradeLicence ? data.tradeLicenceStartDate : null,
      tradeLicenceExpiryDate: data.hasTradeLicence ? data.tradeLicenceExpiryDate : null,
      electricityProvider: data.electricityProvider || null,
      electricityServiceNumber: data.electricityServiceNumber || null,
      leaseContactName: data.leaseContactName || null,
      leaseContactMobile: data.leaseContactMobile || null,
      ownerAddress: data.ownerAddress || null,
      notes: data.notes || null,
    };
    return api.put(`/godowns/${id}`, payload).then(unwrap).then(normalizeGodown);
  },
  patch: (id: number | string, data: any) => {
    return api.put(`/godowns/${id}`, data).then(unwrap).then(normalizeGodown);
  },
  delete: (id: number | string) => api.delete(`/godowns/${id}`).then(unwrap),
};

export const financeApi = {
  getTotalRevenues: (params?: { hubId?: number | string; financialYear?: string }, skipCache = false) =>
    cachedGet('/finance/total-revenue', { params, skipCache }, 20000),
  createTotalRevenue: (data: any) =>
    api.post('/finance/total-revenue', data).then(unwrap),
  updateTotalRevenue: (id: number | string, data: any) =>
    api.put(`/finance/total-revenue/${id}`, data).then(unwrap),
  deleteTotalRevenue: (id: number | string) =>
    api.delete(`/finance/total-revenue/${id}`).then(unwrap),

  getRents: (params?: { hubId?: number | string; period?: string }, skipCache = false) =>
    cachedGet('/finance/rent', { params, skipCache }, 20000),
  createRent: (data: any) =>
    api.post('/finance/rent', data).then(unwrap),
  updateRent: (id: number | string, data: any) =>
    api.put(`/finance/rent/${id}`, data).then(unwrap),
  deleteRent: (id: number | string) =>
    api.delete(`/finance/rent/${id}`).then(unwrap),
};

export const rentApi = {
  getAll: (params?: { page?: number; size?: number; status?: string; month?: string; godownId?: number }, skipCache = false) =>
    cachedGet('/rent-entries', { params, skipCache }, 15000).then((res: any) => {
      if (res?.content) {
        return { ...res, content: res.content.map(normalizeRentEntry) };
      }
      return normalizeList(res, normalizeRentEntry);
    }),
  getByGodown: (godownId: number | string, skipCache = false) =>
    cachedGet(`/rent-entries/godown/${godownId}`, { skipCache }, 20000).then((res: any) => normalizeList(res, normalizeRentEntry)),
  getById: (id: number | string, skipCache = false) =>
    cachedGet(`/rent-entries/${id}`, { skipCache }, 20000).then(normalizeRentEntry),
  recordPayment: (id: number | string, data?: any) => {
    const payload = {
      paidAmount: Number(data?.paidAmount || data?.amountPaid || 0),
      paidDate: data?.paidDate || data?.paymentDate || new Date().toISOString().slice(0, 10),
      paymentMethod: data?.paymentMethod || 'BANK_TRANSFER',
      referenceNumber: data?.referenceNumber || data?.transactionRef || null,
      notes: data?.notes || null,
    };
    return api.post(`/rent-entries/${id}/pay`, payload).then(unwrap).then(normalizeRentEntry);
  },
  create: (data: any) => {
    const payload = {
      godownId: Number(data.godownId),
      rentMonth: data.rentMonth || data.month,
      dueAmount: Number(data.dueAmount ?? data.amountDue ?? 0),
      dueDate: data.dueDate,
      status: data.status || 'DUE',
      notes: data.notes || null,
    };
    return api.post('/rent-entries', payload).then(unwrap).then(normalizeRentEntry);
  },
  delete: (id: number | string) => api.delete(`/rent-entries/${id}`).then(unwrap),
};

export const expenseApi = {
  getAll: (params?: { page?: number; size?: number; category?: string; month?: string; godownId?: number }, skipCache = false) =>
    cachedGet('/expenses', { params, skipCache }, 15000).then((res: any) => {
      if (res?.content) {
        return { ...res, content: res.content.map(normalizeExpense) };
      }
      return normalizeList(res, normalizeExpense);
    }),
  getByGodown: (godownId: number | string, skipCache = false) =>
    cachedGet(`/expenses/godown/${godownId}`, { skipCache }, 20000).then((res: any) => normalizeList(res, normalizeExpense)),
  getById: (id: number | string, skipCache = false) =>
    cachedGet(`/expenses/${id}`, { skipCache }, 20000).then(normalizeExpense),
  create: (data: any) => {
    const payload = {
      godownId: data.godownId ? Number(data.godownId) : null,
      category: data.category || 'ELECTRICITY',
      billResponsibility: data.billResponsibility || 'COMPANY',
      amount: Number(data.amount || 0),
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
  getAll: (params?: { page?: number; size?: number; status?: string; godownId?: number }, skipCache = false) =>
    cachedGet('/employees', { params, skipCache }, 20000).then((res: any) => {
      if (res?.content) {
        return { ...res, content: res.content.map(normalizeStaff) };
      }
      return normalizeList(res, normalizeStaff);
    }),
  getByGodown: (godownId: number | string, skipCache = false) =>
    cachedGet(`/employees/godown/${godownId}`, { skipCache }, 20000).then((res: any) => normalizeList(res, normalizeStaff)),
  getById: (id: number | string, skipCache = false) =>
    cachedGet(`/employees/${id}`, { skipCache }, 20000).then(normalizeStaff),
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
  getAll: (params?: { page?: number; size?: number; employeeId?: number; month?: string }, skipCache = false) =>
    cachedGet('/salary-payments', { params, skipCache }, 15000),
  getByEmployee: (employeeId: number | string, skipCache = false) =>
    cachedGet(`/salary-payments/employee/${employeeId}`, { skipCache }, 20000),
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
  getAll: (params?: { page?: number; size?: number; status?: string; godownId?: number }, skipCache = false) =>
    cachedGet('/assets', { params, skipCache }, 20000).then((res: any) => {
      if (res?.content) {
        return { ...res, content: res.content.map(normalizeAsset) };
      }
      return normalizeList(res, normalizeAsset);
    }),
  getByGodown: (godownId: number | string, skipCache = false) =>
    cachedGet(`/assets/godown/${godownId}`, { skipCache }, 20000).then((res: any) => normalizeList(res, normalizeAsset)),
  getById: (id: number | string, skipCache = false) =>
    cachedGet(`/assets/${id}`, { skipCache }, 20000).then(normalizeAsset),
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
  getAll: (params?: { page?: number; size?: number; godownId?: number }, skipCache = false) =>
    cachedGet('/documents', { params, skipCache }, 20000),
  getByGodown: (godownId: number | string, skipCache = false) =>
    cachedGet(`/documents/godown/${godownId}`, { skipCache }, 20000),
  getById: (id: number | string, skipCache = false) => cachedGet(`/documents/${id}`, { skipCache }, 20000),
  upload: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap),
  download: (id: number | string) => api.get(`/documents/${id}/download`).then(unwrap),
  delete: (id: number | string) => api.delete(`/documents/${id}`).then(unwrap),
};

export const reportApi = {
  getSummary: (year?: number, skipCache = false) =>
    cachedGet('/reports/summary', { params: { year }, skipCache }, 30000),
  getGodownPnl: (year?: number, skipCache = false) =>
    cachedGet('/reports/godown-pnl', { params: { year }, skipCache }, 30000),
  exportCsvUrl: (params?: { year?: number; type?: 'total' | 'single'; hubId?: number | string } | number) => {
    if (typeof params === 'number') {
      return `${API_BASE_URL}/reports/export-csv?year=${params}`;
    }
    const q = new URLSearchParams();
    if (params?.year) q.append('year', String(params.year));
    if (params?.type) q.append('type', params.type);
    if (params?.hubId) q.append('hubId', String(params.hubId));
    const qs = q.toString();
    return `${API_BASE_URL}/reports/export-csv${qs ? `?${qs}` : ''}`;
  },
};

export const settingsApi = {
  get: (skipCache = false) => cachedGet('/settings', { skipCache }, 60000).then(normalizeSettings),
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
