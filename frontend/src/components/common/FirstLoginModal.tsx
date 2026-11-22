import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import {
  User as UserIcon,
  Lock,
  Mail,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../services/api';

/**
 * FirstLoginModal
 * Mandatory first-time onboarding modal: sets custom username & password.
 * Follows the "Minimal Text Rule", Apple-inspired Inter design system,
 * 8px grid, WCAG AA accessibility, and responsive full-screen sheet on mobile.
 */
export const FirstLoginModal: React.FC = () => {
  const { user, mustChangePassword, setMustChangePassword, updateUser, logout } = useAuth();
  const { success } = useToast();

  // Accessibility IDs
  const usernameId = useId();
  const emailId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();

  // Input refs for programmatic focus on validation failure
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const newPasswordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Visibility toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  // Field focus & blur tracking
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  // Username validation & availability checking
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Submission & network error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Avatar initials & display name
  const displayName = user?.fullName || user?.username || 'User';
  const initials = useMemo(() => {
    if (!displayName) return 'U';
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

  // Sync state if user loads after mount
  useEffect(() => {
    if (!username && (user?.fullName || user?.username)) {
      setUsername(user.fullName || user.username);
    }
    if (!email && user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Username syntax validation: 3-30 letters, numbers, spaces, underscores, dots, hyphens
  const isUsernameSyntaxValid = useMemo(() => {
    const trimmed = username.trim();
    return trimmed.length >= 3 && trimmed.length <= 30 && /^[a-zA-Z0-9_.\- ]+$/.test(trimmed);
  }, [username]);

  // Check if username matches current user's username or full name
  const isCurrentUsername = useMemo(() => {
    const trimmed = username.trim().toLowerCase();
    const currentUsername = (user?.username || '').trim().toLowerCase();
    const currentFullName = (user?.fullName || '').trim().toLowerCase();
    return (
      trimmed.length >= 3 &&
      (trimmed === currentUsername || trimmed === currentFullName)
    );
  }, [username, user?.username, user?.fullName]);

  const isUsernameValidAndAvailable = useMemo(() => {
    if (!username.trim() || !isUsernameSyntaxValid) return false;
    if (isCurrentUsername) return true;
    return isUsernameAvailable === true || isUsernameAvailable === null;
  }, [username, isUsernameSyntaxValid, isCurrentUsername, isUsernameAvailable]);

  // Debounced availability check
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed || isCurrentUsername) {
      setIsCheckingUsername(false);
      setIsUsernameAvailable(true);
      setUsernameError(null);
      return;
    }

    if (!isUsernameSyntaxValid) {
      setIsCheckingUsername(false);
      setIsUsernameAvailable(false);
      if (usernameTouched) {
        setUsernameError('Use 3–30 letters, numbers, spaces or underscores.');
      }
      return;
    }

    setIsCheckingUsername(true);
    setUsernameError(null);

    const timer = setTimeout(async () => {
      try {
        const res = (await authApi.checkUsername(trimmed)) as any;
        if (res && res.available) {
          setIsUsernameAvailable(true);
          setUsernameError(null);
        } else {
          setIsUsernameAvailable(false);
          setUsernameError('Already taken');
        }
      } catch {
        // Fallback: If network check fails, allow user to proceed
        setIsUsernameAvailable(true);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, isUsernameSyntaxValid, usernameTouched, isCurrentUsername]);

  // Password rules checklist
  const passwordRules = useMemo(() => {
    return [
      { id: 'length', label: '8+ characters', met: newPassword.length >= 8 },
      { id: 'uppercase', label: 'Uppercase letter', met: /[A-Z]/.test(newPassword) },
      { id: 'number', label: 'Number', met: /[0-9]/.test(newPassword) },
      { id: 'symbol', label: 'Symbol', met: /[^A-Za-z0-9]/.test(newPassword) },
    ];
  }, [newPassword]);

  const unmetPasswordRules = useMemo(() => {
    return passwordRules.filter((r) => !r.met);
  }, [passwordRules]);

  const isPasswordValid = unmetPasswordRules.length === 0;

  // Password strength score (0 to 4)
  const strengthScore = useMemo(() => {
    return passwordRules.filter((r) => r.met).length;
  }, [passwordRules]);

  // Confirm password validation
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const showConfirmMismatch =
    confirmPasswordTouched && confirmPassword.length > 0 && newPassword !== confirmPassword;

  // Overall form validity
  const isFormValid =
    isUsernameSyntaxValid &&
    isUsernameValidAndAvailable &&
    isPasswordValid &&
    passwordsMatch &&
    !isSubmitting;

  // Track Caps Lock state
  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState && e.getModifierState('CapsLock'));
  };

  const handleBlurUsername = () => {
    setUsernameTouched(true);
    if (!isUsernameSyntaxValid && username.trim()) {
      setUsernameError('Use 3–30 letters, numbers, spaces or underscores.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNetworkError(null);

    // Validation guard: move focus to first invalid field
    if (!isUsernameSyntaxValid || isUsernameAvailable === false) {
      setUsernameTouched(true);
      usernameInputRef.current?.focus();
      return;
    }
    if (!isPasswordValid) {
      newPasswordInputRef.current?.focus();
      return;
    }
    if (!passwordsMatch) {
      setConfirmPasswordTouched(true);
      confirmPasswordInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.updateProfile({
        username: username.trim(),
        newUsername: username.trim(),
        email: email.trim() || undefined,
        newEmail: email.trim() || undefined,
        newPassword,
      });

      if (res && (res as any).token) {
        localStorage.setItem('token', (res as any).token);
      }

      updateUser({
        username: username.trim(),
        email: email.trim(),
        mustChangePassword: false,
      });

      setIsSuccessState(true);

      // Brief success animation before dismissing modal
      setTimeout(() => {
        setMustChangePassword(false);
        success('Account set up successfully! Welcome to your dashboard.');
      }, 750);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Unable to save your account details. Please check your network connection and try again.';
      setNetworkError(msg);
      setIsSubmitting(false);
    }
  };

  if (!mustChangePassword) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-modal-title"
      aria-describedby="setup-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-md animate-fadeIn"
    >
      {/* Modal Container: Max 460px on desktop, full-screen sheet on mobile (<480px) */}
      <div className="w-full h-full sm:h-auto sm:max-w-[460px] bg-white dark:bg-slate-900 sm:rounded-[16px] shadow-2xl border-0 sm:border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between overflow-y-auto max-sm:p-6 p-8 transition-all duration-200 motion-reduce:transition-none">
        <div>
          {/* 1. Header */}
          <div className="mb-4">
            <h1
              id="setup-modal-title"
              className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
            >
              Set up your account
            </h1>
            <p
              id="setup-modal-desc"
              className="text-xs text-slate-500 dark:text-slate-400 mt-1"
            >
              Choose a username and password.
            </p>
          </div>

          {/* 2. Welcome Row: Circular initials avatar + welcome message (compact, single line) */}
          <div className="flex items-center gap-2.5 py-2.5 px-3 mb-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <div
              className="w-8 h-8 rounded-full bg-[#0A74E6]/10 dark:bg-[#0A74E6]/25 text-[#0A74E6] dark:text-[#3894ff] font-semibold text-xs flex items-center justify-center shrink-0 select-none"
              aria-hidden="true"
            >
              {initials}
            </div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
              Welcome, <span className="font-semibold text-slate-900 dark:text-slate-100">{displayName}</span>
            </p>
          </div>

          {/* Network Failure Banner with Retry */}
          {networkError && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-red-700 dark:text-red-300">
                <p>{networkError}</p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="mt-1.5 font-semibold text-[#0A74E6] dark:text-[#3894ff] hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* 3. Username */}
            <div>
              <label
                htmlFor={usernameId}
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  id={usernameId}
                  ref={usernameInputRef}
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (usernameError) setUsernameError(null);
                  }}
                  onBlur={handleBlurUsername}
                  placeholder="e.g. Sai Babu P"
                  autoComplete="username"
                  required
                  aria-invalid={Boolean(usernameError)}
                  aria-describedby={usernameError ? `${usernameId}-error` : undefined}
                  className={`w-full h-[48px] pl-10 pr-10 text-sm font-medium rounded-[12px] bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 border transition-all duration-150 outline-none ${
                    usernameError
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : isUsernameValidAndAvailable && !isCheckingUsername
                      ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-[#0A74E6] focus:ring-2 focus:ring-[#0A74E6]/20'
                  }`}
                />
                {/* Status indicator inside field */}
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                  {isCheckingUsername && (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  )}
                  {!isCheckingUsername && isUsernameValidAndAvailable && (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                  {!isCheckingUsername && usernameError && (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              {/* Minimal Text Rule: Appears ONLY on error */}
              {usernameError && (
                <p
                  id={`${usernameId}-error`}
                  aria-live="polite"
                  className="text-[11px] text-red-600 dark:text-red-400 mt-1 pl-1"
                >
                  {usernameError}
                </p>
              )}
            </div>

            {/* 4. Email: Prefilled, read-only, lock icon, inline Change button */}
            <div>
              <label
                htmlFor={emailId}
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  {isEditingEmail ? <Mail className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </span>
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  readOnly={!isEditingEmail}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className={`w-full h-[48px] pl-10 pr-16 text-sm rounded-[12px] border text-slate-900 dark:text-slate-100 transition-all duration-150 outline-none ${
                    isEditingEmail
                      ? 'bg-white dark:bg-slate-800 border-[#0A74E6] focus:ring-2 focus:ring-[#0A74E6]/20'
                      : 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 cursor-default'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setIsEditingEmail(!isEditingEmail)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#0A74E6] dark:text-[#3894ff] hover:underline px-1 py-0.5"
                >
                  {isEditingEmail ? 'Done' : 'Change'}
                </button>
              </div>
            </div>

            {/* 5. New Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor={newPasswordId}
                  className="text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  New password
                </label>
                {/* Caps lock warning (only visible when active) */}
                {isCapsLockOn && (
                  <span
                    aria-live="assertive"
                    className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 animate-pulse"
                  >
                    Caps Lock is on
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id={newPasswordId}
                  ref={newPasswordInputRef}
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={() => setNewPasswordFocused(true)}
                  onKeyDown={handlePasswordKey}
                  onKeyUp={handlePasswordKey}
                  placeholder="Set your password"
                  autoComplete="new-password"
                  required
                  aria-invalid={newPassword.length > 0 && !isPasswordValid}
                  className="w-full h-[48px] pl-10 pr-10 text-sm font-medium rounded-[12px] bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:border-[#0A74E6] focus:ring-2 focus:ring-[#0A74E6]/20 transition-all duration-150 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Bar & Unmet Rules (Minimal text rule: hides satisfied rules) */}
              {(newPasswordFocused || newPassword.length > 0) && (
                <div className="mt-2 space-y-2">
                  {/* Slim strength progress bar */}
                  <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => {
                      const isActive = strengthScore >= step;
                      let barColor = 'bg-slate-200 dark:bg-slate-700';
                      if (isActive) {
                        if (strengthScore <= 1) barColor = 'bg-red-500';
                        else if (strengthScore === 2) barColor = 'bg-amber-500';
                        else if (strengthScore === 3) barColor = 'bg-[#0A74E6]';
                        else barColor = 'bg-emerald-500';
                      }
                      return (
                        <div
                          key={step}
                          className={`flex-1 h-full rounded-full transition-all duration-200 ${barColor}`}
                        />
                      );
                    })}
                  </div>

                  {/* Checklist of rules NOT yet met (each disappears as met) */}
                  {unmetPasswordRules.length > 0 && (
                    <div
                      aria-live="polite"
                      className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5 text-[11px] text-slate-500 dark:text-slate-400"
                    >
                      {unmetPasswordRules.map((rule) => (
                        <span key={rule.id} className="inline-flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-slate-400" />
                          {rule.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 6. Confirm Password */}
            <div>
              <label
                htmlFor={confirmPasswordId}
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Confirm password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id={confirmPasswordId}
                  ref={confirmPasswordInputRef}
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setConfirmPasswordTouched(true)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  required
                  aria-invalid={Boolean(showConfirmMismatch)}
                  className={`w-full h-[48px] pl-10 pr-10 text-sm font-medium rounded-[12px] bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 border transition-all duration-150 outline-none ${
                    showConfirmMismatch
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : passwordsMatch
                      ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-[#0A74E6] focus:ring-2 focus:ring-[#0A74E6]/20'
                  }`}
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {passwordsMatch && (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {/* Minimal Text Rule: Shown ONLY on mismatch */}
              {showConfirmMismatch && (
                <p
                  aria-live="polite"
                  className="text-[11px] text-red-600 dark:text-red-400 mt-1 pl-1"
                >
                  Passwords don't match
                </p>
              )}
            </div>

            {/* 7. Primary Action Button "Save & Continue" */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isFormValid}
                className={`w-full h-[48px] rounded-[12px] font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-sm ${
                  isSuccessState
                    ? 'bg-emerald-600 text-white'
                    : isFormValid
                    ? 'bg-[#0A74E6] hover:bg-[#0863c4] active:scale-[0.99] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200/50 dark:border-slate-800'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : isSuccessState ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Saved! Entering dashboard…</span>
                  </>
                ) : (
                  <>
                    <span>Save & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Small "Sign out" link instead of close "X" */}
        <div className="mt-6 pt-3 text-center border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={logout}
            className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};
