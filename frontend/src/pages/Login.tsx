import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Warehouse, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { useToast } from '../components/ui/Toast';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@12345');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { companyName } = useSettings();
  const { error: toastError, success: toastSuccess } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoading(true);
    try {
      await login(username, password);
      toastSuccess('Welcome back! Signed in successfully.');
      navigate('/');
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Invalid username or password');
    } finally {
      setIsLoading(false);
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
              Enter your administrator credentials to manage your godown portfolio.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
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

          {/* Credentials Helper Pill */}
          <div className="mt-8 pt-6 border-t border-black/[0.06] dark:border-white/[0.08]">
            <div className="p-3.5 rounded-xl bg-apple-bg dark:bg-white/[0.04] text-xs text-apple-secondary dark:text-apple-darkSecondary">
              <div className="flex items-center gap-2 mb-2 font-semibold text-apple-text dark:text-apple-darkText">
                <ShieldCheck className="w-4 h-4 text-apple-accent" />
                <span>Multi-Admin Accounts (Password: <code>Admin@12345</code>):</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUsername('admin');
                    setPassword('Admin@12345');
                  }}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    username === 'admin'
                      ? 'border-apple-accent bg-apple-accent/10 text-apple-accent font-medium shadow-sm'
                      : 'border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="block font-semibold">Admin 1</span>
                  <span className="text-[11px] text-apple-secondary">admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('admin2');
                    setPassword('Admin@12345');
                  }}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    username === 'admin2'
                      ? 'border-apple-accent bg-apple-accent/10 text-apple-accent font-medium shadow-sm'
                      : 'border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="block font-semibold">Admin 2</span>
                  <span className="text-[11px] text-apple-secondary">admin2</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <p className="text-center text-xs text-apple-secondary dark:text-apple-darkSecondary mt-6">
          Secured with JSON Web Token (JWT) & Supabase PostgreSQL
        </p>
      </div>
    </div>
  );
};

