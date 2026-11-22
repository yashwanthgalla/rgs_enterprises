import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Stale time constants
export const STALE_TIMES = {
  LONG_LIVED: 30 * 60 * 1000,   // 30 min: states, organization settings, compact hub list
  STANDARD: 5 * 60 * 1000,      // 5 min: dashboard, hub details, assets
  DYNAMIC: 60 * 1000,           // 1 min: finance revenues, rent ledger, expenses, salaries
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIMES.STANDARD,
      gcTime: 30 * 60 * 1000, // 30 minutes in garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Sync Storage Persister for fast zero-latency offline/session restoration
export const syncStoragePersister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'RGS_QUERY_OFFLINE_CACHE',
});

// Dehydrate filter: NEVER persist sensitive data (salaries, CCTV, rent payments)
export const dehydrateOptions = {
  shouldDehydrateQuery: (query: any) => {
    const key = query.queryKey;
    if (!Array.isArray(key)) return false;
    const domain = key[0];
    const subKey = key[1];

    // Explicitly allow only non-sensitive read-only reference data
    if (domain === 'settings') return true;
    if (domain === 'states') return true;
    if (domain === 'hubs' && subKey === 'compact') return true;

    // Never persist anything else to localStorage
    return false;
  },
};

/**
 * Clears the query client memory cache and local persistence upon user sign-out
 */
export const clearQueryCache = () => {
  queryClient.clear();
  try {
    localStorage.removeItem('RGS_QUERY_OFFLINE_CACHE');
  } catch (err) {
    console.warn('Failed to clear persisted query cache:', err);
  }
};
