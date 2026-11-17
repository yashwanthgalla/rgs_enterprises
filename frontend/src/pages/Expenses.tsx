import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Zap,
  Wifi,
  Save,
  ExternalLink,
  PlusCircle,
  Trash2,
  Plus,
  Radio,
  Info,
  Pencil,
  X,
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
    navigate(`/information/${tab}`);
  };

  // Selected Hub for editing / viewing active details
  const [selectedHubId, setSelectedHubId] = useState<string>('');

  // Electricity State
  const [isElectricityEditing, setIsElectricityEditing] = useState(false);
  const [electricityProvider, setElectricityProvider] = useState('');
  const [electricityServiceNumber, setElectricityServiceNumber] = useState('');
  const [savingElectricity, setSavingElectricity] = useState(false);

  // WiFi State
  const [isWifiEditing, setIsWifiEditing] = useState(false);
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

  const selectedGodown = godowns.find((g) => String(g.id) === String(selectedHubId)) || godowns[0];

  useEffect(() => {
    if (selectedGodown) {
      const provider = selectedGodown.electricityProvider || '';
      const serviceNo = selectedGodown.electricityServiceNumber || '';
      setElectricityProvider(provider);
      setElectricityServiceNumber(serviceNo);

      if (provider || serviceNo) {
        setIsElectricityEditing(false);
      } else {
        setIsElectricityEditing(true);
      }

      // Setup WiFi
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
        setIsWifiEditing(false);
      } else {
        setBroadbandList([]);
        setIsWifiEditing(true);
      }
    }
  }, [selectedHubId, selectedGodown?.id]);

  // Save Electricity Details
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

      setGodowns((prev) =>
        prev.map((g) => (String(g.id) === String(selectedHubId) ? { ...g, ...updatedGodown } : g))
      );
      success('Electricity details saved and updated to the Hub section!');
      setIsElectricityEditing(false);
    } catch (err: any) {
      error('Failed to update electricity details: ' + (err.message || 'Error'));
    } finally {
      setSavingElectricity(false);
    }
  };

  // Save WiFi Details
  const handleSaveWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHubId) {
      error('Please select a hub');
      return;
    }
    setSavingWifi(true);
    try {
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
            bb.serviceContactNumber
        );

      const updatedGodown = await godownApi.patch(selectedHubId, {
        broadbandDetails: cleanBbs,
      });

      setGodowns((prev) =>
        prev.map((g) => (String(g.id) === String(selectedHubId) ? { ...g, ...updatedGodown } : g))
      );
      setBroadbandList(cleanBbs);
      success('WiFi & broadband connections saved and synced to the Hub profile!');
      setIsWifiEditing(false);
    } catch (err: any) {
      error('Failed to update WiFi details: ' + (err.message || 'Error'));
    } finally {
      setSavingWifi(false);
    }
  };

  const handleAddBroadbandLine = () => {
    setIsWifiEditing(true);
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

  const handleRemoveBroadbandLine = (index: number) => {
    setBroadbandList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateBroadbandLine = (
    index: number,
    field: keyof BroadbandConnection,
    value: string
  ) => {
    setBroadbandList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  // Handle "Add New" button on top left
  const handleAddNew = () => {
    if (activeTab === 'electricity') {
      setIsElectricityEditing(true);
    } else {
      handleAddBroadbandLine();
    }
  };

  const hasSavedElectricity = Boolean(selectedGodown?.electricityProvider || selectedGodown?.electricityServiceNumber);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
            <Info className="w-6 h-6 text-apple-accent" />
            <span>Information</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage facility electricity connections and WiFi networks across all hubs
          </p>
        </div>
      </div>

      {/* Top Controls: "Add New" on top left, Subtabs, and Hub selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Add New Button on top left */}
          <Button
            variant="primary"
            onClick={handleAddNew}
            icon={<Plus className="w-4 h-4" />}
            className="rounded-xl shadow-apple-sm text-xs font-semibold px-4 py-2"
          >
            Add New
          </Button>

          {/* Sub-Tabs: Electricity Information / WiFi Information */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => handleTabChange('electricity')}
              className={clsx(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-tight transition-all duration-150',
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
                'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-tight transition-all duration-150',
                activeTab === 'wifi'
                  ? 'bg-apple-accent text-white shadow-apple-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
              )}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>WiFi Information</span>
            </button>
          </div>
        </div>

        {/* Hub Selector on the right */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-semibold shrink-0">Select Hub:</span>
          <Select
            value={selectedHubId}
            onChange={(e) => setSelectedHubId(e.target.value)}
            className="text-xs h-9 font-semibold min-w-[220px]"
          >
            {godowns.map((g) => (
              <option key={g.id} value={g.id}>
                {g.erpName || g.name} {g.code ? `(${g.code})` : ''}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ELECTRICITY INFORMATION                                            */}
      {/* ========================================================================= */}
      {activeTab === 'electricity' && (
        <div className="space-y-6">
          {/* Active Hub Electricity Connection Card */}
          {selectedGodown ? (
            <div>
              {!isElectricityEditing && hasSavedElectricity ? (
                /* SAVED DISPLAY CARD (Matches Reference Image) */
                <Card className="p-6 overflow-hidden relative">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                            {selectedGodown.erpName || selectedGodown.name} — Electricity Connection
                          </h4>
                          {selectedGodown.code && (
                            <Badge variant="accent" size="sm">
                              {selectedGodown.code}
                            </Badge>
                          )}
                          <Badge variant="success" size="sm">
                            Configured
                          </Badge>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Facility Location: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedGodown.city || selectedGodown.location || 'N/A'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/hubs/${selectedGodown.id}`)}
                        icon={<ExternalLink className="w-3.5 h-3.5" />}
                        className="text-xs font-semibold"
                      >
                        View Hub
                      </Button>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setIsElectricityEditing(true)}
                        icon={<Pencil className="w-3.5 h-3.5" />}
                        className="text-xs font-semibold rounded-xl shadow-apple-sm"
                      >
                        Edit Details
                      </Button>
                    </div>
                  </div>

                  {/* Display Values Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Electricity Service Provider
                      </span>
                      <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                        {selectedGodown.electricityProvider || 'Not Configured'}
                      </p>
                      <span className="text-[11px] text-gray-400 mt-1 block">
                        Active Utility DISCOM / Power Company
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                        Electricity Service / USC Number
                      </span>
                      <p className="text-base font-mono font-bold text-gray-900 dark:text-gray-100">
                        {selectedGodown.electricityServiceNumber || 'Not Configured'}
                      </p>
                      <span className="text-[11px] text-gray-400 mt-1 block">
                        Consumer ID / Meter / Service Connection Number
                      </span>
                    </div>
                  </div>
                </Card>
              ) : (
                /* EDIT FORM VIEW */
                <Card className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <span>{selectedGodown.erpName || selectedGodown.name} — Configure Electricity</span>
                          {selectedGodown.code && <Badge variant="accent" size="sm">{selectedGodown.code}</Badge>}
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Configure power provider and consumer identification for this hub facility.
                        </p>
                      </div>
                    </div>

                    {hasSavedElectricity && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsElectricityEditing(false)}
                        icon={<X className="w-3.5 h-3.5" />}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>

                  <form onSubmit={handleSaveElectricity} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        label="Electricity Service Provider"
                        hint="e.g. TSSPDCL, APCPDCL, APSPDCL, BESCOM, Tata Power"
                      >
                        <Input
                          placeholder="e.g. APSPDCL"
                          value={electricityProvider}
                          onChange={(e) => setElectricityProvider(e.target.value)}
                        />
                      </FormField>

                      <FormField
                        label="Electricity Service / USC Number"
                        hint="Account / Meter / Consumer ID"
                      >
                        <Input
                          placeholder="e.g. 2310252123522"
                          value={electricityServiceNumber}
                          onChange={(e) => setElectricityServiceNumber(e.target.value)}
                        />
                      </FormField>
                    </div>

                    <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">
                        Saved electricity details automatically sync to the Hub profile and reports.
                      </span>
                      <div className="flex items-center gap-2">
                        {hasSavedElectricity && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsElectricityEditing(false)}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          type="submit"
                          loading={savingElectricity}
                          icon={<Save className="w-4 h-4" />}
                          className="rounded-xl shadow-apple-sm"
                        >
                          Save Electricity Details
                        </Button>
                      </div>
                    </div>
                  </form>
                </Card>
              )}
            </div>
          ) : (
            <Card className="p-8 text-center text-xs text-gray-400">
              {loading ? 'Loading hub facilities...' : 'No hub facilities found.'}
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WIFI / BROADBAND INFORMATION                                       */}
      {/* ========================================================================= */}
      {activeTab === 'wifi' && (
        <div className="space-y-6">
          {/* Active Hub Broadband Connections Card */}
          {selectedGodown ? (
            <div>
              {!isWifiEditing && broadbandList.length > 0 ? (
                /* SAVED DISPLAY CARD VIEW */
                <Card className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-500">
                        <Wifi className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                            {selectedGodown.erpName || selectedGodown.name} — Broadband Connections
                          </h4>
                          {selectedGodown.code && (
                            <Badge variant="accent" size="sm">
                              {selectedGodown.code}
                            </Badge>
                          )}
                          <Badge variant="neutral" size="sm">
                            {broadbandList.length} {broadbandList.length === 1 ? 'Connection' : 'Connections'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Facility Location: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedGodown.city || selectedGodown.location || 'N/A'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/hubs/${selectedGodown.id}`)}
                        icon={<ExternalLink className="w-3.5 h-3.5" />}
                        className="text-xs font-semibold"
                      >
                        View Hub
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddBroadbandLine}
                        icon={<PlusCircle className="w-3.5 h-3.5" />}
                        className="text-xs font-semibold"
                      >
                        Add Connection
                      </Button>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setIsWifiEditing(true)}
                        icon={<Pencil className="w-3.5 h-3.5" />}
                        className="text-xs font-semibold rounded-xl shadow-apple-sm"
                      >
                        Edit Details
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {broadbandList.map((bb, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-2">
                          <span className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5 text-cyan-500" />
                            {bb.networkProvider || `Connection #${idx + 1}`}
                          </span>
                          <Badge variant="accent" size="sm">Line #{idx + 1}</Badge>
                        </div>

                        <div className="space-y-1.5 pt-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Account No:</span>
                            <span className="font-mono font-medium">{bb.accountNumber || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Registered Mobile:</span>
                            <span className="font-medium">{bb.registeredMobileNumber || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">User ID:</span>
                            <span className="font-mono">{bb.userId || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Plan End Date:</span>
                            <span className="font-medium text-apple-accent">{bb.currentPlanEndDate || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Service Contact:</span>
                            <span className="font-medium">{bb.serviceContactNumber || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                /* EDIT FORM VIEW */
                <form onSubmit={handleSaveWifi} className="space-y-6">
                  <Card className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.08] pb-4 mb-5">
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-cyan-500" />
                          <span>Configure Broadband Connections ({broadbandList.length}) for {selectedGodown.erpName || selectedGodown.name}</span>
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Add and configure ISP credentials, account numbers, and plan expiry dates for this facility.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddBroadbandLine}
                          icon={<PlusCircle className="w-3.5 h-3.5" />}
                        >
                          Add Connection
                        </Button>

                        {broadbandList.length > 0 && selectedGodown.broadbandDetails && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsWifiEditing(false)}
                          >
                            Cancel
                          </Button>
                        )}

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
                            Add Another Connection
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
              )}
            </div>
          ) : (
            <Card className="p-8 text-center text-xs text-gray-400">
              {loading ? 'Loading hub facilities...' : 'No hub facilities found.'}
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
