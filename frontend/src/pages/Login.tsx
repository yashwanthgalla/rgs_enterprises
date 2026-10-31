import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Building2, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, FormField } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const { settings } = useSettings();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username/email and password.');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login({
        username: username.trim(),
        password,
      });

      const displayName = loggedUser.fullName || loggedUser.username || 'Administrator';
      toastSuccess(`Welcome back, ${displayName}!`);
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = 'Authentication failed. Please verify your credentials.';
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.message && err.message.includes('Network Error')) {
        msg = 'Unable to connect to the backend server. Please verify your internet connection.';
      }
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 bg-[#F5F5F7] dark:bg-[#000000] selection:bg-apple-accent selection:text-white relative overflow-hidden">
      {/* Background Brand Watermark */}
      <div className="site-bg-watermark" aria-hidden="true" />

      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-apple-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl overflow-hidden shadow-apple-md mb-4 animate-scaleUp border border-black/10 dark:border-white/10 bg-white/80 backdrop-blur-md p-2">
            <img
              src="/rgs-logo-removebg-preview.png"
              alt="RGS Enterprises Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = '/rgs-enterprises-logo.png';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {settings.companyName || 'RGS ENTERPRISES'}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium tracking-wide">
            GodownIQ • Enterprise Warehouse Operations
          </p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-3xl glass-card shadow-apple-modal animate-scaleUp">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Sign In
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Enter your authorized administrator credentials
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-apple-danger/10 border border-apple-danger/20 text-xs font-medium text-apple-danger flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <FormField label="Username or Email" required>
              <div className="relative">
                <Input
                  type="text"
                  autoComplete="username"
                  placeholder="Enter username or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  required
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </FormField>

            <FormField label="Password" required>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>

            <div className="pt-2">
              <Button
                type="submit"
                loading={loading}
                className="w-full h-11 text-sm font-semibold rounded-2xl"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to Dashboard
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-apple-success" />
            <span>End-to-End Encrypted Session</span>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          © {new Date().getFullYear()} RGS Enterprises. All rights reserved.
        </p>
      </div>
    </div>
  );
};

