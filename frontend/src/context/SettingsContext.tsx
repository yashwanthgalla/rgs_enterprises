import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { settingsApi } from '../services/api';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  formatCurrency: (amount: number | undefined | null) => string;
}

const defaultSettings: AppSettings = {
  companyName: 'RGS ENTERPRISES',
  companyTagline: 'Industrial Godown & Warehouse Assets Management',
  contactEmail: 'rgsenterprise2026@gmail.com',
  currency: '₹',
  logoUrl: '/rgs-enterprises-logo.jpeg',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('appSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultSettings,
          ...parsed,
          currency: parsed.currency || parsed.currencySymbol || parsed.defaultCurrency || '₹',
        };
      }
      return defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data: any = await settingsApi.get();
        if (data) {
          const normalized = {
            ...data,
            currency: data.currency || data.currencySymbol || data.defaultCurrency || '₹',
            contactEmail: data.contactEmail || data.alertEmail || 'rgsenterprise2026@gmail.com',
          };
          setSettings((prev) => ({ ...prev, ...normalized }));
          localStorage.setItem('appSettings', JSON.stringify(normalized));
        }
      } catch {
        // Keep defaults if not loaded
      }
    };
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = (await settingsApi.update(newSettings)) as any;
      const normalized = {
        ...updated,
        currency: updated.currency || updated.currencySymbol || updated.defaultCurrency || '₹',
      };
      setSettings(normalized);
      localStorage.setItem('appSettings', JSON.stringify(normalized));
    } catch (err) {
      setSettings((prev) => ({ ...prev, ...newSettings }));
      throw err;
    }
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    const symbol = settings?.currency || (settings as any)?.currencySymbol || (settings as any)?.defaultCurrency || '₹';
    if (amount === undefined || amount === null || isNaN(amount)) {
      return `${symbol}0`;
    }
    return `${symbol}${amount.toLocaleString('en-IN')}`;
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, formatCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
