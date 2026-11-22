import React, { useState, Suspense, lazy, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton } from '../ui/Skeleton';
import { perfLogger } from '../../utils/perfLogger';
import { clsx } from 'clsx';

// Lazy-load FirstLoginModal so users only load it when required
const FirstLoginModal = lazy(() =>
  import('../common/FirstLoginModal').then((m) => ({ default: m.FirstLoginModal }))
);

export const AppShell: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('rgs_sidebar_collapsed') === 'true';
  });
  const location = useLocation();

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('rgs_sidebar_collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    perfLogger.endRoute(location.pathname);
  }, [location.pathname]);

  // If initial auth is validating with no saved credentials, render minimal page skeleton
  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-apple-bg dark:bg-apple-darkBg p-8">
        <PageSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-apple-bg dark:bg-apple-darkBg flex flex-col relative overflow-x-hidden">
      {/* Background Brand Watermark */}
      <div
        className={clsx(
          'site-bg-watermark transition-all duration-200 ease-in-out',
          isSidebarCollapsed ? 'app-shell-watermark-collapsed' : 'app-shell-watermark'
        )}
        aria-hidden="true"
      />

      {/* Sidebar for Desktop & Mobile drawer - NEVER unmounts on route changes */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Main Content Area */}
      <div
        className={clsx(
          'flex flex-col flex-1 relative z-10 min-h-screen transition-all duration-200 ease-in-out',
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        )}
      >
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-16 max-w-7xl w-full mx-auto">
          {/* Suspense boundary only wraps the content area, preserving the AppShell, Sidebar and Header permanently */}
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>

        {/* Global Universal Fixed Footer - Always pinned at the bottom across all pages */}
        <footer
          className={clsx(
            'fixed bottom-0 right-0 z-30 h-10 border-t border-black/[0.06] dark:border-white/[0.08] text-xs text-gray-500 dark:text-gray-400 bg-white/95 dark:bg-apple-cardDark/95 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between transition-all duration-200 ease-in-out shadow-sm',
            isSidebarCollapsed ? 'left-0 lg:left-20' : 'left-0 lg:left-64'
          )}
        >
          <div className="flex items-center gap-2 truncate text-[11px] sm:text-xs">
            <span>© {new Date().getFullYear()} RGS ENTERPRISES. All rights reserved. Copyrights claim.</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-[11px] sm:text-xs">
            <a
              href="https://github.com/yashwanthgalla/rgs_enterprises"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-300 hover:text-apple-accent dark:hover:text-apple-accent transition-colors font-medium hover:underline lowercase"
            >
              github
            </a>
          </div>
        </footer>
      </div>

      {/* Mandatory Password/Profile Change Modal on First Login */}
      <Suspense fallback={null}>
        <FirstLoginModal />
      </Suspense>
    </div>
  );
};

