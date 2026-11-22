export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login/',
    SEND_OTP: '/auth/forgot-password/send-otp/',
    VERIFY_OTP: '/auth/forgot-password/verify/',
    USERS: '/auth/users/',
  },
  CORE: {
    STATES: '/core/states/',
  },
  HUBS: {
    LIST: '/hubs/',
    DETAIL: (id: number | string) => `/hubs/${id}/`,
    RESTORE: (id: number | string) => `/hubs/${id}/restore/`,
    CCTV_REVEAL: (id: number | string) => `/hubs/${id}/cctv/reveal/`,
    CODE_HISTORY: (id: number | string) => `/hubs/${id}/code-history/`,
    CONTACTS: (hubId: number | string) => `/hubs/${hubId}/contacts/`,
    LICENCES: (hubId: number | string) => `/hubs/${hubId}/licences/`,
    BROADBAND: (hubId: number | string) => `/hubs/${hubId}/broadband/`,
  },
  FINANCE: {
    AGREEMENTS: '/finance/agreements/',
    INVOICES: '/finance/invoices/',
    PAYMENTS: '/finance/payments/',
    MONTHLY_COSTS: '/finance/monthly-costs/',
    ANNUAL_COSTS: '/finance/annual-costs/',
  },
  HR: {
    EMPLOYEES: '/hr/employees/',
    ASSIGNMENTS: '/hr/assignments/',
    SALARIES: '/hr/salaries/',
  },
  ASSETS: {
    EQUIPMENT: '/assets/equipment/',
  },
  DOCUMENTS: {
    LIST: '/documents/',
  },
  AUDIT: {
    LOGS: '/audit/logs/',
  },
  ALERTS: {
    ACTIVE: '/alerts/',
  },
} as const;
