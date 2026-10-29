import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { AppSettings, ApiResponse } from '../types';

interface SettingsContextType {
  settings: AppSettings;
  currencySymbol: string;
  companyName: string;
  logoUrl: string;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

const defaultSettings: AppSettings = {
  id: 1,
  companyName: 'RGS Godown Portfolio',
  logoUrl: '',
  currencySymbol: '₹',
  contactEmail: 'operations@rgsenterprises.com',
  contactPhone: '+91 98490 54321',
  updatedAt: new Date().toISOString(),
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  const refreshSettings = async () => {
    try {
      const res = await apiClient.get<ApiResponse<AppSettings>>('/settings');
      if (res.data.success && res.data.data) {
        setSettings(res.data.data);
      }
    } catch {
      // Use defaults if unauthenticated or offline
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const payload = {
      companyName: newSettings.companyName || settings.companyName,
      logoUrl: newSettings.logoUrl !== undefined ? newSettings.logoUrl : settings.logoUrl,
      currencySymbol: newSettings.currencySymbol || settings.currencySymbol,
      contactEmail: newSettings.contactEmail || settings.contactEmail,
      contactPhone: newSettings.contactPhone || settings.contactPhone,
    };

    const res = await apiClient.put<ApiResponse<AppSettings>>('/settings', payload);
    if (res.data.success && res.data.data) {
      setSettings(res.data.data);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        currencySymbol: settings.currencySymbol || '₹',
        companyName: settings.companyName || 'RGS Godown Portfolio',
        logoUrl: settings.logoUrl || '',
        refreshSettings,
        updateSettings,
      }}
    >
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
