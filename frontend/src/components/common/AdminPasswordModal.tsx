import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField, Input } from '../ui/Input';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (adminPassword: string) => Promise<boolean>;
  title?: string;
  description?: string;
  actionLabel?: string;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Administrator Verification Required',
  description = 'To view or copy protected system passwords, please enter your administrator account password.',
  actionLabel = 'Verify & Reveal',
}) => {
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClose = () => {
    setAdminPassword('');
    setErrorMsg(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setErrorMsg('Please enter your administrator account password.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const ok = await onConfirm(adminPassword);
      if (ok) {
        handleClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Incorrect administrator password. Access denied.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Protected Security Credential</p>
            <p className="text-amber-700 mt-0.5 text-[11px] leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <FormField
          label="Administrator Account Password"
          required
          error={errorMsg || undefined}
        >
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your login password"
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="pr-10"
              autoFocus
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </FormField>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#F3F4F6]">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            icon={<Lock className="w-3.5 h-3.5" />}
            className="rounded-xl shadow-apple-sm font-semibold"
          >
            {actionLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
