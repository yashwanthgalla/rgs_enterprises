import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Copy, Check, AlertCircle, X } from 'lucide-react';
import httpClient from '../../../api/httpClient';
import { ENDPOINTS } from '../../../api/endpoints';

interface CCTVRevealModalProps {
  hubId: number | string;
  hubName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CCTVRevealModal: React.FC<CCTVRevealModalProps> = ({
  hubId,
  hubName,
  isOpen,
  onClose,
}) => {
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedData, setRevealedData] = useState<{
    username: string;
    password: string;
    access_url?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setError('Please enter your administrator password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await httpClient.post(ENDPOINTS.HUBS.CCTV_REVEAL(hubId), {
        adminPassword: adminPassword.trim(),
      });
      setRevealedData(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.errors?.detail ||
        'Password verification failed. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (revealedData?.password) {
      navigator.clipboard.writeText(revealedData.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetAndClose = () => {
    setAdminPassword('');
    setError(null);
    setRevealedData(null);
    setShowPassword(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-apple-lg border border-[#E5E7EB] w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Security Verification</h3>
              <p className="text-xs text-[#6B7280]">{hubName} CCTV Credentials</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {!revealedData ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-[#4B5563] leading-relaxed">
                CCTV access credentials are encrypted at rest. To reveal them, re-confirm your
                administrator password. This action will be recorded in the security audit trail.
              </p>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                  Administrator Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter your login password"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:border-transparent transition-all pr-10"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl border border-[#D1D5DB] text-[#4B5563] hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl bg-[#0071E3] text-white hover:bg-[#0077ED] transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Reveal Credentials'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
                Identity verified. Credentials decrypted successfully.
              </div>

              <div className="space-y-3 bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                <div>
                  <span className="block text-[11px] font-medium text-[#6B7280]">Username</span>
                  <span className="text-xs font-mono font-semibold text-[#111827]">
                    {revealedData.username}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-[#6B7280]">Password</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono font-semibold text-[#111827]">
                      {revealedData.password}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-1.5 text-xs text-[#0071E3] hover:bg-[#0071E3]/10 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {revealedData.access_url && (
                  <div>
                    <span className="block text-[11px] font-medium text-[#6B7280]">Access URL</span>
                    <a
                      href={revealedData.access_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#0071E3] hover:underline break-all"
                    >
                      {revealedData.access_url}
                    </a>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full px-4 py-2 text-xs font-semibold rounded-xl bg-[#111827] text-white hover:bg-black transition-colors"
              >
                Close & Clear
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
