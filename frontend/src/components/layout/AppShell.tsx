import React, { useState, Suspense, lazy, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton } from '../ui/Skeleton';
import { perfLogger } from '../../utils/perfLogger';

// Lazy-load FirstLoginModal so users only load it when required
const FirstLoginModal = lazy(() =>
  import('../common/FirstLoginModal').then((m) => ({ default: m.FirstLoginModal }))
);

export const AppShell: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

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
      <div className="site-bg-watermark app-shell-watermark" aria-hidden="true" />

      {/* Sidebar for Desktop & Mobile drawer - NEVER unmounts on route changes */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 relative z-10">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Suspense boundary only wraps the content area, preserving the AppShell, Sidebar and Header permanently */}
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Mandatory Password/Profile Change Modal on First Login */}
      <Suspense fallback={null}>
        <FirstLoginModal />
      </Suspense>
    </div>
  );
};

