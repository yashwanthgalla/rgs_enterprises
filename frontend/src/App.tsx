import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { PageSkeleton } from './components/ui/Skeleton';

// Route-Based Code Splitting: Lazy-load page components on demand
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Godowns = lazy(() => import('./pages/Godowns').then((m) => ({ default: m.Godowns })));
const GodownDetail = lazy(() => import('./pages/GodownDetail').then((m) => ({ default: m.GodownDetail })));
const Finance = lazy(() => import('./pages/Finance').then((m) => ({ default: m.Finance })));
const Expenses = lazy(() => import('./pages/Expenses').then((m) => ({ default: m.Expenses })));
const StaffDirectory = lazy(() => import('./pages/Staff').then((m) => ({ default: m.StaffDirectory })));
const Assets = lazy(() => import('./pages/Assets').then((m) => ({ default: m.Assets })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <BrowserRouter>
              <Suspense fallback={<div className="p-8"><PageSkeleton /></div>}>
                <Routes>
                  {/* Public Route */}
                  <Route path="/login" element={<Login />} />

                  {/* Protected Layout Routes */}
                  <Route path="/" element={<AppShell />}>
                    <Route index element={<Dashboard />} />
                    <Route path="hubs" element={<Godowns />} />
                    <Route path="hubs/:id" element={<GodownDetail />} />
                    <Route path="godowns" element={<Godowns />} />
                    <Route path="godowns/:id" element={<GodownDetail />} />
                    <Route path="finance" element={<Finance />} />
                    <Route path="finance/revenue" element={<Finance />} />
                    <Route path="finance/rent" element={<Finance />} />
                    <Route path="rent-ledger" element={<Navigate to="/finance/rent" replace />} />
                    <Route path="information" element={<Navigate to="/information/electricity" replace />} />
                    <Route path="information/electricity" element={<Expenses />} />
                    <Route path="information/wifi" element={<Expenses />} />
                    {/* Backwards compatibility for /expenses */}
                    <Route path="expenses" element={<Navigate to="/information/electricity" replace />} />
                    <Route path="expenses/bills" element={<Navigate to="/information/electricity" replace />} />
                    <Route path="expenses/electricity" element={<Navigate to="/information/electricity" replace />} />
                    <Route path="expenses/wifi" element={<Navigate to="/information/wifi" replace />} />
                    <Route path="staff" element={<StaffDirectory />} />
                    <Route path="assets" element={<Assets />} />
                    <Route path="documents" element={<Navigate to="/" replace />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </SettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
