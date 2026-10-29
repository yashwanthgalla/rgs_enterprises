import React, { useState, useEffect } from 'react';
import { Sliders, Save, Building, Image, Mail, Phone, Shield, User, KeyRound } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { ApiResponse, AuthResponse } from '../types';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { user, updateUser } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [companyName, setCompanyName] = useState(settings.companyName);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || '₹');
  const [contactEmail, setContactEmail] = useState(settings.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(settings.contactPhone || '');
  const [isSaving, setIsSaving] = useState(false);

  // Profile & Credentials State
  const [profileUsername, setProfileUsername] = useState(user?.username || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileFullName, setProfileFullName] = useState(user?.fullName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setCompanyName(settings.companyName);
    setLogoUrl(settings.logoUrl || '');
    setCurrencySymbol(settings.currencySymbol || '₹');
    setContactEmail(settings.contactEmail || '');
    setContactPhone(settings.contactPhone || '');
  }, [settings]);

  useEffect(() => {
    if (user) {
      setProfileUsername(user.username);
      setProfileEmail(user.email || '');
      setProfileFullName(user.fullName || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings({
        companyName,
        logoUrl,
        currencySymbol,
        contactEmail,
        contactPhone,
      });
      toastSuccess('Portfolio branding and settings saved to database!');
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toastError('New password and confirmation do not match.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toastError('New password must be at least 6 characters.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await apiClient.put<ApiResponse<AuthResponse>>('/auth/profile', {
        username: profileUsername.trim(),
        email: profileEmail.trim(),
        fullName: profileFullName.trim(),
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      if (res.data.success && res.data.data) {
        updateUser(res.data.data.user, res.data.data.token);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        toastSuccess('Administrator profile & credentials updated successfully!');
      }
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-text dark:text-apple-darkText">
          Organization Settings & Profile
        </h1>
        <p className="text-sm text-apple-secondary dark:text-apple-darkSecondary mt-1">
          Customize portfolio branding, company title, currency formats, and administrator credentials.
        </p>
      </div>

      {/* Row 1: Profile & Credentials Customization */}
      <Card>
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-black/[0.04] dark:border-white/[0.06]">
          <div className="p-2.5 rounded-xl bg-apple-accent/10 text-apple-accent">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-apple-text dark:text-apple-darkText">
              Administrator Profile & Security Credentials
            </h2>
            <p className="text-xs text-apple-secondary">
              Update your username, email address, and personal password.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField
              label="Username"
              required
              value={profileUsername}
              onChange={(e) => setProfileUsername(e.target.value)}
              placeholder="e.g. Sai Babu P"
            />
            <FormField
              label="Email Address"
              type="email"
              required
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              placeholder="e.g. rgsenterprise2026@gmail.com"
            />
            <FormField
              label="Full Name / Display Name"
              required
              value={profileFullName}
              onChange={(e) => setProfileFullName(e.target.value)}
              placeholder="e.g. Sai Babu P"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-apple-bg dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] space-y-3">
            <span className="text-xs font-semibold text-apple-text dark:text-apple-darkText block">
              Change Password (leave blank if not changing)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <FormField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
              <FormField
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSavingProfile}
              icon={<Save className="w-4 h-4" />}
            >
              Update Profile & Credentials
            </Button>
          </div>
        </form>
      </Card>

      {/* Row 2: Organization Branding & Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-1 p-5 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-apple-accent text-white flex items-center justify-center font-bold text-lg mb-4 shadow-sm">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <h3 className="font-semibold text-apple-text dark:text-apple-darkText">
              {user?.fullName || 'Administrator'}
            </h3>
            <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary font-mono mt-0.5">
              @{user?.username}
            </p>
            {user?.email && (
              <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary mt-0.5 truncate">
                {user.email}
              </p>
            )}
            <div className="mt-3">
              <Badge variant="accent">{user?.role || 'ADMIN'}</Badge>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-black/[0.04] dark:border-white/[0.06] text-xs text-apple-secondary">
            <span className="block font-medium text-apple-text dark:text-apple-darkText mb-1">
              Active Security
            </span>
            <span>JWT Bearer Authentication with BCrypt encryption enabled.</span>
          </div>
        </Card>

        {/* Branding & Configuration Form */}
        <Card className="md:col-span-2">
          <form onSubmit={handleSave} className="space-y-4">
            <FormField
              label="Company / Portfolio Title [APP NAME]"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. RGS Enterprises Godown Portfolio"
              hint="Changes the branding across navigation, invoices, and reports"
            />

            <FormField
              label="Logo Image URL"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              hint="Leave blank to use the default Apple-styled icon"
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Currency Symbol"
                required
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="₹"
              />
              <FormField
                label="Support Phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98490 54321"
              />
            </div>

            <FormField
              label="Operations Email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="operations@rgsenterprises.com"
            />

            <div className="pt-4 flex items-center justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
                icon={<Save className="w-4 h-4" />}
              >
                Save Branding Settings
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};


