import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  Building2,
  Mail,
  Save,
  Key,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FormField, Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../services/api';

export const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { success, error } = useToast();

  // Profile State
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    fullName: user?.fullName || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Company Settings State
  const [companyData, setCompanyData] = useState({
    companyName: settings.companyName || 'RGS ENTERPRISES',
    companyTagline: settings.companyTagline || 'Industrial Godown & Warehouse Assets Management',
    contactEmail: settings.contactEmail || 'rgsenterprise2026@gmail.com',
    contactPhone: settings.contactPhone || '',
    currency: settings.currency || '₹',
  });
  const [companyLoading, setCompanyLoading] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileData.newPassword) {
      if (!profileData.currentPassword) {
        error('Please enter your current password to set a new password');
        return;
      }
      if (profileData.newPassword !== profileData.confirmPassword) {
        error('New passwords do not match');
        return;
      }
      if (profileData.newPassword.length < 6) {
        error('New password must be at least 6 characters long');
        return;
      }
    }

    setProfileLoading(true);
    try {
      const payload: any = {
        newUsername: profileData.username.trim() || undefined,
        newEmail: profileData.email.trim() || undefined,
        newFullName: profileData.fullName.trim() || undefined,
      };

      if (profileData.newPassword) {
        payload.currentPassword = profileData.currentPassword;
        payload.newPassword = profileData.newPassword;
      }

      const res = await authApi.updateProfile(payload);
      if (res && (res as any).token) {
        localStorage.setItem('token', (res as any).token);
      }

      updateUser({
        username: profileData.username.trim(),
        email: profileData.email.trim(),
        fullName: profileData.fullName.trim(),
        mustChangePassword: false,
      });

      setProfileData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      success('Profile and credentials updated successfully!');
    } catch (err: any) {
      error(err.response?.data?.message || err.message || 'Failed to update credentials');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyLoading(true);
    try {
      await updateSettings(companyData);
      success('Company branding updated');
    } catch (err: any) {
      error('Failed to update company settings: ' + err.message);
    } finally {
      setCompanyLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Settings & Account Security
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Update your administrator credentials, email, password, and enterprise branding
        </p>
      </div>

      {/* Admin Profile & Password */}
      <Card className="p-6">
        <div className="flex items-center gap-3 pb-5 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="p-2.5 rounded-2xl bg-apple-accent/10 text-apple-accent">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Administrator Credentials & Profile
            </h2>
            <p className="text-xs text-gray-400">
              Signed in as {user?.role || 'ADMIN'}
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4 mt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full Name" required>
              <Input
                value={profileData.fullName}
                onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Username" required hint="Used to sign in">
              <Input
                value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                required
              />
            </FormField>
          </div>

          <FormField label="Admin Email" required hint="Password reset & system notices">
            <Input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              required
            />
          </FormField>

          <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Change Password (Leave blank to keep current)
            </h3>

            <FormField label="Current Password" hint="Required if changing password">
              <Input
                type="password"
                placeholder="Enter current password"
                value={profileData.currentPassword}
                onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <FormField label="New Password">
                <Input
                  type="password"
                  placeholder="Min 6 characters"
                  value={profileData.newPassword}
                  onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                />
              </FormField>

              <FormField label="Confirm New Password">
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={profileData.confirmPassword}
                  onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                />
              </FormField>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              loading={profileLoading}
              icon={<Save className="w-4 h-4" />}
            >
              Update Credentials
            </Button>
          </div>
        </form>
      </Card>

      {/* Organization Branding */}
      <Card className="p-6">
        <div className="flex items-center gap-3 pb-5 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="p-2.5 rounded-2xl bg-apple-purple/10 text-[#5856D6]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Enterprise Branding
            </h2>
            <p className="text-xs text-gray-400">
              Company title and currency symbol displayed across invoices
            </p>
          </div>
        </div>

        <form onSubmit={handleCompanySubmit} className="space-y-4 mt-5">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]">
            <img
              src="/rgs-enterprises-logo.png"
              alt="Brand Logo"
              className="w-14 h-14 object-contain rounded-xl bg-white dark:bg-white/10 p-1 border border-black/10 dark:border-white/10 shadow-apple-sm shrink-0"
            />
            <div>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                Official Company Logo
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Active in sidebar, login screen, and favicon (/rgs-enterprises-logo.png)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Organization Name" required>
              <Input
                value={companyData.companyName}
                onChange={(e) => setCompanyData({ ...companyData, companyName: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Currency Symbol" required>
              <Input
                value={companyData.currency}
                onChange={(e) => setCompanyData({ ...companyData, currency: e.target.value })}
                required
              />
            </FormField>
          </div>

          <FormField label="Company Tagline">
            <Input
              value={companyData.companyTagline}
              onChange={(e) => setCompanyData({ ...companyData, companyTagline: e.target.value })}
            />
          </FormField>

          <FormField label="Contact Email">
            <Input
              type="email"
              value={companyData.contactEmail}
              onChange={(e) => setCompanyData({ ...companyData, contactEmail: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              loading={companyLoading}
              icon={<Save className="w-4 h-4" />}
            >
              Save Branding
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

