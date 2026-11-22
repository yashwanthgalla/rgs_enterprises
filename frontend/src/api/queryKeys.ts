/**
 * Central Query Keys Factory for TanStack Query
 * Ensures predictable cache invalidation and targeted optimistic updates across all domains.
 */

export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  settings: {
    all: () => ['settings'] as const,
  },
  states: {
    all: () => ['states'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => ['dashboard', 'stats'] as const,
    reminders: () => ['dashboard', 'reminders'] as const,
    cashflow: (months?: number) => ['dashboard', 'cashflow', months] as const,
  },
  hubs: {
    all: ['hubs'] as const,
    list: (filters?: Record<string, any>) => ['hubs', 'list', filters || {}] as const,
    compact: () => ['hubs', 'compact'] as const,
    detail: (id: string | number) => ['hubs', 'detail', String(id)] as const,
    contacts: (hubId: string | number) => ['hubs', 'contacts', String(hubId)] as const,
    licences: (hubId: string | number) => ['hubs', 'licences', String(hubId)] as const,
    broadband: (hubId: string | number) => ['hubs', 'broadband', String(hubId)] as const,
  },
  finance: {
    all: ['finance'] as const,
    revenues: (filters?: Record<string, any>) => ['finance', 'revenues', filters || {}] as const,
    rents: (filters?: Record<string, any>) => ['finance', 'rents', filters || {}] as const,
    rentEntries: (filters?: Record<string, any>) => ['finance', 'rentEntries', filters || {}] as const,
  },
  expenses: {
    all: ['expenses'] as const,
    list: (filters?: Record<string, any>) => ['expenses', 'list', filters || {}] as const,
    byHub: (hubId: string | number) => ['expenses', 'hub', String(hubId)] as const,
  },
  staff: {
    all: ['staff'] as const,
    list: (filters?: Record<string, any>) => ['staff', 'list', filters || {}] as const,
    byHub: (hubId: string | number) => ['staff', 'hub', String(hubId)] as const,
    salaries: (filters?: Record<string, any>) => ['staff', 'salaries', filters || {}] as const,
  },
  assets: {
    all: ['assets'] as const,
    list: (filters?: Record<string, any>) => ['assets', 'list', filters || {}] as const,
    byHub: (hubId: string | number) => ['assets', 'hub', String(hubId)] as const,
  },
  reports: {
    all: ['reports'] as const,
    summary: (year: number) => ['reports', 'summary', year] as const,
    pnl: (year: number) => ['reports', 'pnl', year] as const,
  },
  documents: {
    all: ['documents'] as const,
    list: (filters?: Record<string, any>) => ['documents', 'list', filters || {}] as const,
  },
};
