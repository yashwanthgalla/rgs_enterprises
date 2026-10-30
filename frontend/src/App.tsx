import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Godowns } from './pages/Godowns';
import { GodownDetail } from './pages/GodownDetail';
import { RentLedger } from './pages/RentLedger';
import { Expenses } from './pages/Expenses';
import { StaffDirectory } from './pages/Staff';
import { Assets } from './pages/Assets';
import { Documents } from './pages/Documents';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />

                {/* Protected Layout Routes */}
                <Route path="/" element={<AppShell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="godowns" element={<Godowns />} />
                  <Route path="godowns/:id" element={<GodownDetail />} />
                  <Route path="rent-ledger" element={<RentLedger />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="staff" element={<StaffDirectory />} />
                  <Route path="assets" element={<Assets />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
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
