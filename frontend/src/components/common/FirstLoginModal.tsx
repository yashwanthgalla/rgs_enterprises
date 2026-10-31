import React, { useState } from 'react';
import { ShieldCheck, Lock, User as UserIcon, Mail, CheckCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField, Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../services/api';

export const FirstLoginModal: React.FC = () => {
  const { user, mustChangePassword, setMustChangePassword, updateUser } = useAuth();
  const { success, error } = useToast();

  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  if (!mustChangePassword) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!currentPassword) {
      setFormError('Please enter your default temporary password');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setFormError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.updateProfile({
        username: username.trim() || undefined,
        newUsername: username.trim() || undefined,
        email: email.trim() || undefined,
        newEmail: email.trim() || undefined,
        currentPassword,
        newPassword,
      });

      if (res && (res as any).token) {
        localStorage.setItem('token', (res as any).token);
      }

      updateUser({
        username: username.trim() || user?.username,
        email: email.trim() || user?.email,
        mustChangePassword: false,
      });

      setMustChangePassword(false);
      success('Password and profile updated successfully! Welcome to GodownIQ.');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update password. Please check your current password.';
      setFormError(msg);
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={mustChangePassword}
      onClose={() => {}} // Cannot close without updating
      title="Initial Account Setup"
      description="For security, you must configure your personal password and verify your profile details before proceeding."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-2xl bg-apple-accent/10 border border-apple-accent/20 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-apple-accent shrink-0 mt-0.5" />
          <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            Welcome, <strong>{user?.fullName || user?.username || 'Administrator'}</strong>. Please change your default password to protect your administrator privileges.
          </div>
        </div>

        {formError && (
          <div className="p-3 rounded-xl bg-apple-danger/10 border border-apple-danger/20 text-xs font-medium text-apple-danger">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Username" hint="Your login identifier">
            <div className="relative">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="pl-9"
                required
              />
              <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </FormField>

          <FormField label="Email" hint="Notifications & recovery">
            <div className="relative">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="pl-9"
                required
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </FormField>
        </div>

        <FormField label="Current Temporary Password" required>
          <div className="relative">
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="e.g. Admin@1 or Admin@2"
              className="pl-9"
              required
            />
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
          </div>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="New Password" required hint="Min 6 characters">
            <div className="relative">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="pl-9"
                required
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </FormField>

          <FormField label="Confirm New Password" required>
            <div className="relative">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="pl-9"
                required
              />
              <CheckCircle className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </FormField>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            loading={loading}
            className="w-full"
            icon={<ShieldCheck className="w-4 h-4" />}
          >
            Save Credentials & Enter Dashboard
          </Button>
        </div>
      </form>
    </Modal>
  );
};

