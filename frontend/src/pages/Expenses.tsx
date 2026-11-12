import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Zap,
  Wifi,
  Building,
  Save,
  ExternalLink,
  PlusCircle,
  Trash2,
  Plus,
  Radio,
  FileCheck2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FormField, Input, Select } from '../components/ui/Input';
import { useToast } from '../context/ToastContext';
import { godownApi } from '../services/api';
import { Godown, BroadbandConnection } from '../types';
import { clsx } from 'clsx';

export const Expenses: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'electricity' | 'wifi'
  const activeTab: 'electricity' | 'wifi' = location.pathname.includes('/wifi')
    ? 'wifi'
    : 'electricity';

  const handleTabChange = (tab: 'electricity' | 'wifi') => {
    navigate(`/expenses/${tab}`);
  };

  // Selected Hub for Electricity and WiFi sub-tabs
  const [selectedHubId, setSelectedHubId] = useState<string>('');

  // Electricity Form State
  const [electricityProvider, setElectricityProvider] = useState('');
  const [electricityServiceNumber, setElectricityServiceNumber] = useState('');
  const [savingElectricity, setSavingElectricity] = useState(false);

  // WiFi / Broadband Form State
  const [broadbandList, setBroadbandList] = useState<BroadbandConnection[]>([]);
  const [savingWifi, setSavingWifi] = useState(false);

  const fetchGodowns = async () => {
    setLoading(true);
    try {
      const gRes = await godownApi.getAllList().catch(() => godownApi.getAll(0, 100));
      const gList = Array.isArray(gRes) ? gRes : (gRes as any)?.content || [];

      setGodowns(gList);
      if (gList.length > 0 && !selectedHubId) {
        setSelectedHubId(String(gList[0].id));
      }
    } catch (err: any) {
      error('Failed to load hubs: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGodowns();
  }, []);

  // Update local Electricity and WiFi form state whenever selected hub or godowns list changes
  const selectedGodown = godowns.find((g) => String(g.id) === String(selectedHubId)) || godowns[0];

  useEffect(() => {
    if (selectedGodown) {
      setElectricityProvider(selectedGodown.electricityProvider || '');
      setElectricityServiceNumber(selectedGodown.electricityServiceNumber || '');

      const existingBbs = Array.isArray(selectedGodown.broadbandDetails)
        ? selectedGodown.broadbandDetails
        : [];
      if (existingBbs.length > 0) {
        setBroadbandList(
          existingBbs.map((bb) => ({
            networkProvider: bb.networkProvider || '',
            accountNumber: bb.accountNumber || '',
            registeredMobileNumber: bb.registeredMobileNumber || bb.registeredMobile || '',
            userId: bb.userId || '',
            currentPlanEndDate: bb.currentPlanEndDate || '',
            serviceContactNumber: bb.serviceContactNumber || '',
          }))
        );
      } else {
        setBroadbandList([]);
      }
    }
  }, [selectedHubId, selectedGodown?.id]);

  // Handle Save Electricity Details -> automatically updates Hub section
  const handleSaveElectricity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHubId) {
      error('Please select a hub');
      return;
    }
    setSavingElectricity(true);
    try {
      const updatedGodown = await godownApi.patch(selectedHubId, {
        electricityProvider: electricityProvider.trim(),
        electricityServiceNumber: electricityServiceNumber.trim(),
      });

      // Update in local state
      setGodowns((prev) =>
        prev.map((g) => (String(g.id) === String(selectedHubId) ? { ...g, ...updatedGodown } : g))
      );
      success('Electricity details updated and automatically synced to the Hub section!');
    } catch (err: any) {
      error('Failed to update electricity details: ' + (err.message || 'Error'));
    } finally {
      setSavingElectricity(false);
    }
  };

  // Handle Save WiFi Details -> automatically updates Hub section
  const handleSaveWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHubId) {
      error('Please select a hub');
      return;
    }
    setSavingWifi(true);
    try {
      // Filter out completely blank lines
      const cleanBbs = broadbandList
        .map((bb) => ({
          networkProvider: (bb.networkProvider || '').trim(),
          accountNumber: (bb.accountNumber || '').trim(),
          registeredMobileNumber: (bb.registeredMobileNumber || '').trim(),
          userId: (bb.userId || '').trim(),
          currentPlanEndDate: bb.currentPlanEndDate || null,
          serviceContactNumber: (bb.serviceContactNumber || '').trim(),
        }))
        .filter(
          (bb) =>
            bb.networkProvider ||
            bb.accountNumber ||
            bb.registeredMobileNumber ||
            bb.userId ||
            bb.currentPlanEndDate ||
            bb.serviceContactNumber
        );

      const updatedGodown = await godownApi.patch(selectedHubId, {
        broadbandDetails: cleanBbs,
      });

      // Update in local state
      setGodowns((prev) =>
        prev.map((g) => (String(g.id) === String(selectedHubId) ? { ...g, ...updatedGodown } : g))
      );
      success('WiFi & broadband connections updated and automatically synced to the Hub section!');
    } catch (err: any) {
      error('Failed to update WiFi details: ' + (err.message || 'Error'));
    } finally {
      setSavingWifi(false);
    }
  };

  // Add broadband line
  const handleAddBroadbandLine = () => {
    setBroadbandList((prev) => [
      ...prev,
      {
        networkProvider: '',
        accountNumber: '',
        registeredMobileNumber: '',
        userId: '',
        currentPlanEndDate: '',
        serviceContactNumber: '',
      },
    ]);
  };

  // Remove broadband line
  const handleRemoveBroadbandLine = (index: number) => {
    setBroadbandList((prev) => prev.filter((_, i) => i !== index));
  };

  // Update broadband line field
  const handleUpdateBroadbandLine = (index: number, field: keyof BroadbandConnection, value: string) => {
    setBroadbandList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
            {activeTab === 'electricity' ? (
              <Zap className="w-6 h-6 text-amber-500" />
            ) : (
              <Wifi className="w-6 h-6 text-cyan-500" />
            )}
            <span>Expenses & Utilities</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage electricity connections and WiFi networks with automatic synchronization to the Hub profile
          </p>
        </div>
      </div>

      {/* Sub-Tabs Bar: Electricity Information / WiFi Information */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] w-fit">
        <button
          type="button"
          onClick={() => handleTabChange('electricity')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all duration-150',
            activeTab === 'electricity'
              ? 'bg-apple-accent text-white shadow-apple-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
          )}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Electricity Information</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('wifi')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all duration-150',
            activeTab === 'wifi'
              ? 'bg-apple-accent text-white shadow-apple-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
          )}
        >
          <Wifi className="w-3.5 h-3.5" />
          <span>WiFi Information</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ELECTRICITY INFORMATION                                            */}
      {/* ========================================================================= */}
      {activeTab === 'electricity' && (
        <div className="space-y-6">
          {/* Hub Selector Banner */}
          <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Electricity Information by Hub
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Select a hub to edit its electricity provider and service connection number. Saved details automatically update the Hub section.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 shrink-0">
                Select Hub:
              </label>
              <Select
                value={selectedHubId}
                onChange={(e) => setSelectedHubId(e.target.value)}
                className="w-full sm:w-64 font-semibold text-xs"
              >
                {godowns.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.erpName || g.name} {g.code ? `(${g.code})` : ''}
                  </option>
                ))}
              </Select>
              {selectedHubId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/hubs/${selectedHubId}`)}
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                  title="View Hub Profile"
                >
                  View Hub
                </Button>
              )}
            </div>
          </Card>

          {/* Electricity Configuration Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                        {selectedGodown ? (selectedGodown.erpName || selectedGodown.name) : 'Hub'} — Electricity Connection
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Live connection parameters recorded on facility records
                      </p>
                    </div>
                  </div>
                  {selectedGodown?.code && (
                    <Badge variant="accent" size="sm">
                      {selectedGodown.code}
                    </Badge>
                  )}
                </div>

                <form onSubmit={handleSaveElectricity} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label="Electricity Service Provider"
                      hint="e.g. TSSPDCL, APCPDCL, BESCOM, Tata Power, Adani Electricity"
                    >
                      <Input
                        placeholder="e.g. TSSPDCL / APCPDCL"
                        value={electricityProvider}
                        onChange={(e) => setElectricityProvider(e.target.value)}
                      />
                    </FormField>

                    <FormField
                      label="Electricity Service / USC Number"
                      hint="Account / Meter / Consumer ID"
                    >
                      <Input
                        placeholder="e.g. 1029384756"
                        value={electricityServiceNumber}
                        onChange={(e) => setElectricityServiceNumber(e.target.value)}
                      />
                    </FormField>
                  </div>

                  <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      Changes will automatically reflect in the Hub overview and facility report.
                    </span>
                    <Button
                      type="submit"
                      loading={savingElectricity}
                      icon={<Save className="w-4 h-4" />}
                      className="rounded-xl shadow-apple-sm"
                    >
                      Save Electricity Details
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            {/* Quick Hub Profile Summary */}
            <div>
              <Card className="p-5 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-apple-accent" />
                  <span>Facility Summary</span>
                </h4>

                {selectedGodown ? (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Hub Name</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                        {selectedGodown.erpName || selectedGodown.name}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-black/[0.04] dark:border-white/[0.04]">
                      <span className="text-gray-400">Current Provider:</span>
                      <span className="font-medium">{selectedGodown.electricityProvider || 'Not Configured'}</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-black/[0.04] dark:border-white/[0.04]">
                      <span className="text-gray-400">Service Number:</span>
                      <span className="font-mono font-medium">{selectedGodown.electricityServiceNumber || 'Not Configured'}</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-black/[0.04] dark:border-white/[0.04]">
                      <span className="text-gray-400">Hub Model:</span>
                      <span className="font-semibold text-apple-accent">{selectedGodown.hubModel || 'LDP'}</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-black/[0.04] dark:border-white/[0.04]">
                      <span className="text-gray-400">Tenant:</span>
                      <span className="font-medium">{selectedGodown.currentTenant || 'N/A'}</span>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center text-xs"
                        onClick={() => navigate(`/hubs/${selectedGodown.id}`)}
                        icon={<ExternalLink className="w-3.5 h-3.5" />}
                      >
                        Open Full Hub Section
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No hub selected.</p>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WIFI / BROADBAND INFORMATION                                       */}
      {/* ========================================================================= */}
      {activeTab === 'wifi' && (
        <div className="space-y-6">
          {/* Hub Selector Banner */}
          <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  WiFi & Broadband Information by Hub
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Configure network providers, accounts, and plan details. Saved connections are automatically synced to the Hub section.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 shrink-0">
                Select Hub:
              </label>
              <Select
                value={selectedHubId}
                onChange={(e) => setSelectedHubId(e.target.value)}
                className="w-full sm:w-64 font-semibold text-xs"
              >
                {godowns.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.erpName || g.name} {g.code ? `(${g.code})` : ''}
                  </option>
                ))}
              </Select>
              {selectedHubId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/hubs/${selectedHubId}`)}
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                  title="View Hub Profile"
                >
                  View Hub
                </Button>
              )}
            </div>
          </Card>

          {/* Broadband Multi-Connection Manager */}
          <form onSubmit={handleSaveWifi} className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4 mb-5">
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-cyan-500" />
                    <span>Broadband Connections ({broadbandList.length})</span>
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Active Internet leased lines, fiber connections, and routers for {selectedGodown?.erpName || selectedGodown?.name}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddBroadbandLine}
                    icon={<PlusCircle className="w-3.5 h-3.5" />}
                  >
                    + Add Broadband Connection
                  </Button>

                  <Button
                    type="submit"
                    loading={savingWifi}
                    icon={<Save className="w-4 h-4" />}
                    className="rounded-xl shadow-apple-sm"
                  >
                    Save WiFi Details
                  </Button>
                </div>
              </div>

              {broadbandList.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-black/[0.08] dark:border-white/[0.08] rounded-2xl">
                  <Radio className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    No WiFi or broadband connections configured for this hub yet.
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 mb-4">
                    Add network provider credentials, account numbers, and plan expiry dates.
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleAddBroadbandLine}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add First Broadband Connection
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {broadbandList.map((bb, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] relative group"
                    >
                      <div className="flex items-center justify-between mb-3 border-b border-black/[0.04] dark:border-white/[0.04] pb-2">
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Connection #{idx + 1}</span>
                          {bb.networkProvider && (
                            <Badge variant="accent" size="sm">
                              {bb.networkProvider}
                            </Badge>
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveBroadbandLine(idx)}
                          className="text-xs text-apple-danger hover:underline font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <FormField label="Network Provider">
                          <Input
                            placeholder="e.g. ACT Fibernet, Airtel, Jio"
                            value={bb.networkProvider}
                            onChange={(e) => handleUpdateBroadbandLine(idx, 'networkProvider', e.target.value)}
                          />
                        </FormField>

                        <FormField label="Account Number / Consumer ID">
                          <Input
                            placeholder="e.g. 104928374"
                            value={bb.accountNumber}
                            onChange={(e) => handleUpdateBroadbandLine(idx, 'accountNumber', e.target.value)}
                          />
                        </FormField>

                        <FormField label="Registered Mobile Number">
                          <Input
                            placeholder="e.g. 9876543210"
                            value={bb.registeredMobileNumber}
                            onChange={(e) => handleUpdateBroadbandLine(idx, 'registeredMobileNumber', e.target.value)}
                          />
                        </FormField>

                        <FormField label="User ID / Login ID">
                          <Input
                            placeholder="e.g. act_kondapalli_01"
                            value={bb.userId}
                            onChange={(e) => handleUpdateBroadbandLine(idx, 'userId', e.target.value)}
                          />
                        </FormField>

                        <FormField label="Current Plan End Date">
                          <Input
                            type="date"
                            value={bb.currentPlanEndDate || ''}
                            onChange={(e) => handleUpdateBroadbandLine(idx, 'currentPlanEndDate', e.target.value)}
                          />
                        </FormField>

                        <FormField label="Service / Support Contact">
                          <Input
                            placeholder="e.g. 1800-XXX-XXXX"
                            value={bb.serviceContactNumber}
                            onChange={(e) => handleUpdateBroadbandLine(idx, 'serviceContactNumber', e.target.value)}
                          />
                        </FormField>
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddBroadbandLine}
                      icon={<PlusCircle className="w-3.5 h-3.5" />}
                    >
                      + Add Another Connection
                    </Button>

                    <Button
                      type="submit"
                      loading={savingWifi}
                      icon={<Save className="w-4 h-4" />}
                      className="rounded-xl shadow-apple-sm"
                    >
                      Save WiFi Details
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </form>
        </div>
      )}
    </div>
  );
};
