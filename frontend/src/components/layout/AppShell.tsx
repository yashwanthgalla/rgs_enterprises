import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';
import { FirstLoginModal } from '../common/FirstLoginModal';

export const AppShell: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-apple-bg dark:bg-apple-darkBg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-apple-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-gray-400">Loading GodownIQ...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-apple-bg dark:bg-apple-darkBg flex flex-col">
      {/* Sidebar for Desktop & Mobile drawer */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mandatory Password/Profile Change Modal on First Login */}
      <FirstLoginModal />
    </div>
  );
};

