import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Building2, ArrowRight, ShieldCheck, Eye, EyeOff, KeyRound, CheckCircle2, ArrowLeft, RefreshCw, Copy, Clipboard } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, FormField } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { authApi } from '../services/api';

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

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

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

  const handleOpenForgotModal = () => {
    setForgotStep(1);
    setForgotEmail(username.includes('@') ? username.trim() : '');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setSessionToken('');
    setForgotError('');
    setIsForgotModalOpen(true);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setForgotError('Please enter a valid registered administrator email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res: any = await authApi.sendForgotPasswordOtp(forgotEmail.trim().toLowerCase());
      setSessionToken(res.sessionToken || '');
      setForgotStep(2);
      toastSuccess('Verification OTP sent successfully! Please check your inbox.');
    } catch (err: any) {
      console.error('Send OTP error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to send OTP. Please try again.';
      setForgotError(msg);
      toastError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setForgotError('Please enter the 6-digit OTP received in your email.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setForgotError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('New password and confirm password do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      await authApi.verifyOtpAndResetPassword({
        email: forgotEmail.trim().toLowerCase(),
        otp: otp.trim(),
        sessionToken,
        newPassword,
      });

      toastSuccess('Password reset successfully! Please log in with your new password.');
      setUsername(forgotEmail.trim());
      setPassword('');
      setIsForgotModalOpen(false);
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      const msg = err.response?.data?.message || err.message || 'OTP verification failed or expired.';
      setForgotError(msg);
      toastError(msg);
    } finally {
      setForgotLoading(false);
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
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl overflow-hidden shadow-apple-md mb-4 animate-scaleUp border border-black/10 dark:border-white/10 bg-white">
            <img
              src="/2.jpeg"
              alt="RGS Enterprises Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {settings.companyName || 'RGS ENTERPRISES'}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium tracking-wide">
            RGS ENTERPRISES • Enterprise Hub Operations
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

            <div className="flex items-center justify-end -mt-1">
              <button
                type="button"
                onClick={handleOpenForgotModal}
                className="text-xs font-semibold text-apple-accent hover:underline transition-colors focus:outline-none"
              >
                Forgot password?
              </button>
            </div>

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

      {/* ========================================================================= */}
      {/* FORGOT PASSWORD MODAL (Secure OTP Stateless Verification)                */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title={forgotStep === 1 ? 'Reset Password' : 'Enter Verification Code'}
        description={
          forgotStep === 1
            ? 'Enter your registered email to receive a secure 6-digit OTP dispatched from nagayashwanthgalla@outlook.com.'
            : `Enter the 6-digit OTP dispatched to ${forgotEmail} and set your new password.`
        }
      >
        <div className="space-y-4">
          {forgotError && (
            <div className="p-3.5 rounded-2xl bg-apple-danger/10 border border-apple-danger/20 text-xs font-medium text-apple-danger flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>{forgotError}</span>
            </div>
          )}

          {forgotStep === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <FormField label="Registered Email Address" required>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="e.g. name@rgsenterprises.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-10"
                    autoFocus
                    required
                  />
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
                </div>
              </FormField>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                Security note: OTP email is dispatched from <strong>nagayashwanthgalla@outlook.com</strong> directly to the receiver email entered above. The verification code is valid for 10 minutes.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsForgotModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={forgotLoading}
                  icon={<KeyRound className="w-4 h-4" />}
                >
                  Send OTP Code
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndResetPassword} className="space-y-4">
              <FormField label="6-Digit Verification Code (OTP)" required>
                <div className="relative flex items-center">
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="text-center font-mono tracking-widest text-lg font-bold pr-20"
                    autoFocus
                    required
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    {otp ? (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(otp);
                          toastSuccess('OTP copied to clipboard!');
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-apple-accent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Copy OTP"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            const clean = text.replace(/\D/g, '').slice(0, 6);
                            if (clean) {
                              setOtp(clean);
                              toastSuccess('Pasted OTP from clipboard!');
                            }
                          } catch {
                            // clipboard read permission or empty
                          }
                        }}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold text-apple-accent hover:bg-apple-accent/10 transition-colors flex items-center gap-1"
                        title="Paste OTP from clipboard"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>Paste</span>
                      </button>
                    )}
                  </div>
                </div>
              </FormField>

              <FormField label="New Password (min 8 characters)" required>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter strong new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FormField>

              <FormField label="Confirm New Password" required>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FormField>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <button
                  type="button"
                  onClick={() => setForgotStep(1)}
                  className="inline-flex items-center gap-1 text-apple-accent hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change Email
                </button>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={forgotLoading}
                  className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-apple-accent hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Resend OTP
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsForgotModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={forgotLoading}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Verify & Reset Password
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};

