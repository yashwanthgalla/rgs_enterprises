import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { PageSkeleton } from './components/ui/Skeleton';
import { RoleGuard } from './components/common/RoleGuard';

// Route-Based Code Splitting: Lazy-load page components on demand
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Hubs = lazy(() => import('./pages/Godowns').then((m) => ({ default: m.Godowns })));
const HubDetail = lazy(() => import('./pages/GodownDetail').then((m) => ({ default: m.GodownDetail })));
const Finance = lazy(() => import('./pages/Finance').then((m) => ({ default: m.Finance })));
const Expenses = lazy(() => import('./pages/Expenses').then((m) => ({ default: m.Expenses })));
const StaffDirectory = lazy(() => import('./pages/Staff').then((m) => ({ default: m.StaffDirectory })));
const Assets = lazy(() => import('./pages/Assets').then((m) => ({ default: m.Assets })));
const Visualance = lazy(() => import('./pages/Visualance').then((m) => ({ default: m.Visualance })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Mailing = lazy(() => import('./pages/Mailing').then((m) => ({ default: m.Mailing })));
const Invoice = lazy(() => import('./pages/Invoice').then((m) => ({ default: m.Invoice })));

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Route */}
                <Route
                  path="/login"
                  element={
                    <Suspense fallback={<div className="p-8"><PageSkeleton /></div>}>
                      <Login />
                    </Suspense>
                  }
                />

                {/* Protected Layout Routes (AppShell persistent layout never unmounts) */}
                <Route path="/" element={<AppShell />}>
                  <Route index element={<Dashboard />} />

                    {/* Standardized Hub Routes (Numeric IDs) */}
                    <Route path="hubs" element={<Hubs />} />
                    <Route path="hubs/:id" element={<HubDetail />} />

                    {/* Legacy Bookmark Redirects */}
                    <Route path="godowns" element={<Navigate to="/hubs" replace />} />
                    <Route path="godowns/:id" element={<Navigate to="/hubs" replace />} />

                    {/* Finance: Restricted to ADMIN */}
                    <Route
                      path="finance"
                      element={
                        <RoleGuard allowedRoles={['ADMIN']}>
                          <Finance />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="finance/revenue"
                      element={
                        <RoleGuard allowedRoles={['ADMIN']}>
                          <Finance />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="finance/rent"
                      element={
                        <RoleGuard allowedRoles={['ADMIN']}>
                          <Finance />
                        </RoleGuard>
                      }
                    />
                    <Route path="rent-ledger" element={<Navigate to="/finance/rent" replace />} />
                    <Route path="information" element={<Navigate to="/information/electricity" replace />} />
                    <Route path="information/electricity" element={<Expenses />} />
                    <Route path="information/wifi" element={<Expenses />} />
                    <Route path="expenses" element={<Navigate to="/information/electricity" replace />} />
                    <Route path="expenses/bills" element={<Navigate to="/information/electricity" replace />} />
                    <Route path="expenses/electricity" element={<Navigate to="/information/electricity" replace />} />
                    <Route path="expenses/wifi" element={<Navigate to="/information/wifi" replace />} />

                    {/* Staff & Assets: ADMIN and MANAGER */}
                    <Route
                      path="staff"
                      element={
                        <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                          <StaffDirectory />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="assets"
                      element={
                        <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                          <Assets />
                        </RoleGuard>
                      }
                    />
                    <Route path="visualance" element={<Visualance />} />
                    <Route path="surveillance" element={<Navigate to="/visualance" replace />} />
                    <Route path="cctv" element={<Navigate to="/visualance" replace />} />
                    <Route path="information/visualance" element={<Navigate to="/visualance" replace />} />
                    <Route path="documents" element={<Navigate to="/" replace />} />

                    {/* Reports & Settings: Restricted to ADMIN */}
                    <Route
                      path="reports"
                      element={
                        <RoleGuard allowedRoles={['ADMIN']}>
                          <Reports />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="settings"
                      element={
                        <RoleGuard allowedRoles={['ADMIN']}>
                          <Settings />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="mailing"
                      element={
                        <RoleGuard allowedRoles={['ADMIN']}>
                          <Mailing />
                        </RoleGuard>
                      }
                    />
                    <Route path="invoice" element={<Invoice />} />
                    <Route path="invoices" element={<Navigate to="/invoice" replace />} />
                  </Route>

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
          </SettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
