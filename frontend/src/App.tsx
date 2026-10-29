import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './components/ui/Toast';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Godowns } from './pages/Godowns';
import { GodownDetail } from './pages/GodownDetail';
import { RentLedger } from './pages/RentLedger';
import { Expenses } from './pages/Expenses';
import { Assets } from './pages/Assets';
import { Staff } from './pages/Staff';
import { Documents } from './pages/Documents';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 0,
      refetchInterval: 10000, // 10s automatic live sync for multi-admin updates
    },
  },
});

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-apple-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-apple-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />

                {/* Protected Layout Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="godowns" element={<Godowns />} />
                  <Route path="godowns/:id" element={<GodownDetail />} />
                  <Route path="rent-ledger" element={<RentLedger />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="assets" element={<Assets />} />
                  <Route path="staff" element={<Staff />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
