import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Warehouse, ArrowRight, ShieldCheck, KeyRound, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { apiClient } from '../lib/api';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Sheet } from '../components/ui/Sheet';
import { useToast } from '../components/ui/Toast';
import { ApiResponse, AuthResponse } from '../types';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('Sai Babu P');
  const [password, setPassword] = useState('Admin@1');
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

          {/* Default Administrator Quick Selectors */}
          <div className="mt-8 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
            <div className="p-3.5 rounded-xl bg-apple-bg dark:bg-white/[0.04] text-xs text-apple-secondary dark:text-apple-darkSecondary">
              <div className="flex items-center gap-2 mb-2 font-semibold text-apple-text dark:text-apple-darkText">
                <ShieldCheck className="w-4 h-4 text-apple-accent" />
                <span>Authorized Administrator Accounts:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUsername('Sai Babu P');
                    setPassword('Admin@1');
                  }}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    username === 'Sai Babu P' || username === 'rgsenterprise2026@gmail.com'
                      ? 'border-apple-accent bg-apple-accent/10 text-apple-accent font-medium shadow-sm'
                      : 'border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="block font-semibold">Admin 1</span>
                  <span className="text-[11px] text-apple-text dark:text-apple-darkText font-medium block truncate">
                    Sai Babu P
                  </span>
                  <span className="text-[10px] text-apple-secondary block truncate">
                    rgsenterprise2026@gmail.com
                  </span>
                  <span className="text-[10px] font-mono text-apple-accent mt-0.5 block">Pass: Admin@1</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUsername('B Chandrasekhar');
                    setPassword('Admin@2');
                  }}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    username === 'B Chandrasekhar' || username === 'bschandrasekhar4@gmail.com'
                      ? 'border-apple-accent bg-apple-accent/10 text-apple-accent font-medium shadow-sm'
                      : 'border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="block font-semibold">Admin 2</span>
                  <span className="text-[11px] text-apple-text dark:text-apple-darkText font-medium block truncate">
                    B Chandrasekhar
                  </span>
                  <span className="text-[10px] text-apple-secondary block truncate">
                    bschandrasekhar4@gmail.com
                  </span>
                  <span className="text-[10px] font-mono text-apple-accent mt-0.5 block">Pass: Admin@2</span>
                </button>
              </div>
              <p className="text-[11px] text-apple-secondary mt-2.5 text-center">
                * You will be prompted to set your personal password upon initial sign-in.
              </p>
            </div>
          </div>
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
