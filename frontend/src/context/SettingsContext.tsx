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
  logoUrl: '/rgs-enterprises-logo.png',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('appSettings');
      return saved ? JSON.parse(saved) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data: any = await settingsApi.get();
        if (data) {
          setSettings((prev) => ({ ...prev, ...data }));
          localStorage.setItem('appSettings', JSON.stringify(data));
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
      setSettings(updated);
      localStorage.setItem('appSettings', JSON.stringify(updated));
    } catch (err) {
      setSettings((prev) => ({ ...prev, ...newSettings }));
      throw err;
    }
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return `${settings.currency}0`;
    }
    return `${settings.currency}${amount.toLocaleString('en-IN')}`;
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
