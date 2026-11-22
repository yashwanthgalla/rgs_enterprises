import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { STALE_TIMES } from './queryClient';
import { settingsApi, godownApi, authApi, dashboardApi } from '../services/api';

/**
 * Bootstrap Session Data:
 * Prefetches and warms the cache for reference data (settings, user, compact hub list, stats)
 * immediately after login or session initialization so that dropdowns, navigation,
 * and hub names load instantaneously across the entire dashboard.
 */
export const bootstrapSessionData = async (client: QueryClient) => {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  if (!token) return;

  try {
    await Promise.allSettled([
      // 1. Organization Settings (30 min cache)
      client.prefetchQuery({
        queryKey: queryKeys.settings.all(),
        queryFn: () => settingsApi.get(true),
        staleTime: STALE_TIMES.LONG_LIVED,
      }),

      // 2. Compact Hub Reference List (30 min cache)
      client.prefetchQuery({
        queryKey: queryKeys.hubs.compact(),
        queryFn: async () => {
          const res: any = await godownApi.getAllList();
          const list = Array.isArray(res) ? res : res?.content || [];
          return list.map((h: any) => ({
            id: h.id,
            code: h.code,
            name: h.erpName || h.name,
            state: h.state,
            city: h.city,
            status: h.status || h.hubStatus,
          }));
        },
        staleTime: STALE_TIMES.LONG_LIVED,
      }),

      // 3. User Session Profile
      client.prefetchQuery({
        queryKey: queryKeys.auth.me(),
        queryFn: () => authApi.me(),
        staleTime: STALE_TIMES.STANDARD,
      }),

      // 4. Initial Dashboard KPIs
      client.prefetchQuery({
        queryKey: queryKeys.dashboard.stats(),
        queryFn: () => dashboardApi.getStats(),
        staleTime: STALE_TIMES.STANDARD,
      }),
    ]);
  } catch (err) {
    console.warn('Session bootstrap prefetch encountered non-fatal error:', err);
  }
};
