/**
 * Dev-only performance logger for measuring route change duration and API latency.
 * Completely no-op in production builds.
 */

const isDev = import.meta.env.DEV;

class PerformanceLogger {
  private routeStartTimes = new Map<string, number>();

  startRoute(pathname: string) {
    if (!isDev) return;
    this.routeStartTimes.set(pathname, performance.now());
  }

  endRoute(pathname: string) {
    if (!isDev) return;
    const start = this.routeStartTimes.get(pathname);
    if (start) {
      const duration = (performance.now() - start).toFixed(1);
      this.routeStartTimes.delete(pathname);
      console.log(`%c[Perf] Navigation to ${pathname} completed in ${duration} ms`, 'color: #0071E3; font-weight: bold;');
    }
  }

  logApi(url: string, durationMs: number, fromCache = false) {
    if (!isDev) return;
    const color = fromCache ? '#10B981' : '#F59E0B';
    const tag = fromCache ? '[Cache HIT]' : '[Network]';
    console.log(
      `%c[Perf] API ${tag} ${url} - ${durationMs.toFixed(1)} ms`,
      `color: ${color}; font-weight: 500;`
    );
  }
}

export const perfLogger = new PerformanceLogger();
