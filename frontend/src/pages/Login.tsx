import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Warehouse, ArrowRight, KeyRound, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { apiClient } from '../lib/api';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Sheet } from '../components/ui/Sheet';
import { useToast } from '../components/ui/Toast';
import { ApiResponse, AuthResponse } from '../types';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // First-time Password Change Modal State
  const [isFirstLoginModalOpen, setIsFirstLoginModalOpen] = useState(false);
  const [setupUsername, setSetupUsername] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingSetup, setIsSavingSetup] = useState(false);

  const { login, updateUser } = useAuth();
  const { companyName } = useSettings();
  const { error: toastError, success: toastSuccess } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoading(true);
    try {
      const authData = await login(username, password);
      // Check if user must change password
      if (authData.mustChangePassword || authData.user?.mustChangePassword) {
        setSetupUsername(authData.user.username);
        setSetupEmail(authData.user.email || '');
        setNewPassword('');
        setConfirmPassword('');
        setIsFirstLoginModalOpen(true);
        toastSuccess('Initial login verified. Please set your new password.');
      } else {
        toastSuccess('Welcome back! Signed in successfully.');
        navigate('/');
      }
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Invalid credentials. Please verify your username and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirstTimeSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toastError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toastError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSavingSetup(true);
    try {
      const res = await apiClient.put<ApiResponse<AuthResponse>>('/auth/profile', {
        username: setupUsername.trim(),
        email: setupEmail.trim(),
        newPassword,
      });

      if (res.data.success && res.data.data) {
        updateUser(res.data.data.user, res.data.data.token);
        toastSuccess(`Credentials configured! Welcome, ${res.data.data.user.username}.`);
        setIsFirstLoginModalOpen(false);
        navigate('/');
      }
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to update credentials.');
    } finally {
      setIsSavingSetup(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#000000] flex flex-col justify-center items-center p-4 selection:bg-apple-accent selection:text-white">
      <div className="w-full max-w-md">
        {/* Apple styled frosted card */}
        <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-2xl rounded-apple-xl border border-black/[0.08] dark:border-white/[0.12] p-8 shadow-apple-modal">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-apple-accent text-white shadow-md mb-4">
              <Warehouse className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-apple-text dark:text-apple-darkText">
              {companyName}
            </h2>
            <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary mt-1">
              Administrator Access & Portfolio Management Portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Username or Email"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Sai Babu P or rgsenterprise2026@gmail.com"
              autoComplete="username"
            />

            <FormField
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to Dashboard
              </Button>
            </div>
          </form>
        </div>

        {/* Security badge */}
        <p className="text-center text-xs text-apple-secondary dark:text-apple-darkSecondary mt-6">
          Secured with JSON Web Token (JWT) & Supabase PostgreSQL
        </p>
      </div>

      {/* First-Time Password & Profile Setup Centered Modal */}
      <Sheet
        isOpen={isFirstLoginModalOpen}
        onClose={() => {}} // Non-closable without setting password
        title="First-Time Administrator Setup"
        description="For security, please set your personal password. You may also adjust your username and email address."
      >
        <form onSubmit={handleFirstTimeSetupSubmit} className="space-y-4">
          <div className="p-3 bg-apple-accent/10 rounded-xl text-xs text-apple-accent flex items-center gap-2">
            <KeyRound className="w-4 h-4 shrink-0" />
            <span>Welcome! This account is currently using default credentials. Please set your secure password to proceed.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Username"
              required
              value={setupUsername}
              onChange={(e) => setSetupUsername(e.target.value)}
              placeholder="Your preferred username"
            />
            <FormField
              label="Email Address"
              type="email"
              required
              value={setupEmail}
              onChange={(e) => setSetupEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>

          <FormField
            label="New Personal Password"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
          />

          <FormField
            label="Confirm New Password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
          />

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSavingSetup}
              className="w-full"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Save Credentials & Enter Dashboard
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
};
