import React, { useState } from 'react';
import { ShieldCheck, Lock, User as UserIcon, Mail, CheckCircle, Eye, EyeOff } from 'lucide-react';
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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  if (!mustChangePassword) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

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
        currentPassword: currentPassword.trim() || undefined,
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
      success('Username and password updated successfully! Welcome to RGS Enterprises.');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update credentials. Please check your inputs.';
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
      title="First-Time Login Setup"
      description="Please personalize your username and configure your private password before continuing."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-apple-accent/10 border border-apple-accent/20 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-apple-accent shrink-0 mt-0.5" />
          <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            Welcome, <strong>{user?.fullName || user?.username || 'User'}</strong>! As this is your first time logging in, please set your desired <strong>username</strong> and <strong>secure password</strong>. All passwords are stored in an encrypted, masked format.
          </div>
        </div>

        {formError && (
          <div className="p-3 rounded-xl bg-apple-danger/10 border border-apple-danger/20 text-xs font-medium text-apple-danger">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Desired Username" hint="Choose any username as you wish" required>
            <div className="relative">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. yashwanth_admin"
                className="pl-9 font-medium"
                required
              />
              <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </FormField>

          <FormField label="Email" hint="Account recovery email">
            <div className="relative">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="pl-9"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </FormField>
        </div>

        <FormField label="Temporary / Current Password (Optional)">
          <div className="relative">
            <Input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter if prompted"
              className="pl-9 pr-10"
            />
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title={showCurrentPassword ? 'Mask password' : 'Show password'}
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="New Password" required hint="Stored masked (min 6 chars)">
            <div className="relative">
              <Input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="pl-9 pr-10"
                required
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title={showNewPassword ? 'Mask password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>

          <FormField label="Confirm New Password" required hint="Re-enter to verify">
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="pl-9 pr-10"
                required
              />
              <CheckCircle className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title={showConfirmPassword ? 'Mask password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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

