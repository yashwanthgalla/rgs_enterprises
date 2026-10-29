import React, { useState, useEffect } from 'react';
import { Sliders, Save, Building, Image, Mail, Phone, Shield } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [companyName, setCompanyName] = useState(settings.companyName);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || '₹');
  const [contactEmail, setContactEmail] = useState(settings.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(settings.contactPhone || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCompanyName(settings.companyName);
    setLogoUrl(settings.logoUrl || '');
    setCurrencySymbol(settings.currencySymbol || '₹');
    setContactEmail(settings.contactEmail || '');
    setContactPhone(settings.contactPhone || '');
  }, [settings]);

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

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-text dark:text-apple-darkText">
          Organization Settings & Branding
        </h1>
        <p className="text-sm text-apple-secondary dark:text-apple-darkSecondary mt-1">
          Customize portfolio branding, company title, currency formats, and contact details.
        </p>
      </div>

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
                Save Settings
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

