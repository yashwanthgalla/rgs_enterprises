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
  Info,
  Pencil,
  X,
  CheckCircle,
  Search,
  Filter,
  RotateCcw,
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

  // Electricity Search & Filter State
  const [elecSearchQuery, setElecSearchQuery] = useState('');
  const [elecStatusFilter, setElecStatusFilter] = useState<'ALL' | 'CONFIGURED' | 'PENDING'>('ALL');

  // WiFi State
  const [isWifiEditing, setIsWifiEditing] = useState(false);
  const [broadbandList, setBroadbandList] = useState<BroadbandConnection[]>([]);
  const [savingWifi, setSavingWifi] = useState(false);

  // WiFi Search & Filter State
  const [wifiSearchQuery, setWifiSearchQuery] = useState('');
  const [wifiStatusFilter, setWifiStatusFilter] = useState<'ALL' | 'CONFIGURED' | 'PENDING'>('ALL');

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

  // Filtered Hubs for Electricity
  const filteredElecHubs = godowns.filter((g) => {
    const isConfigured = Boolean((g.electricityProvider || '').trim() || (g.electricityServiceNumber || '').trim());
    if (elecStatusFilter === 'CONFIGURED' && !isConfigured) return false;
    if (elecStatusFilter === 'PENDING' && isConfigured) return false;

    if (elecSearchQuery.trim()) {
      const q = elecSearchQuery.toLowerCase().trim();
      const matchName = (g.erpName || g.name || '').toLowerCase().includes(q);
      const matchCode = (g.code || '').toLowerCase().includes(q);
      const matchCity = (g.city || g.location || '').toLowerCase().includes(q);
      const matchProvider = (g.electricityProvider || '').toLowerCase().includes(q);
      const matchService = (g.electricityServiceNumber || '').toLowerCase().includes(q);
      return matchName || matchCode || matchCity || matchProvider || matchService;
    }
    return true;
  });

  const configuredElecCount = godowns.filter((g) =>
    Boolean((g.electricityProvider || '').trim() || (g.electricityServiceNumber || '').trim())
  ).length;

  // Filtered Hubs for WiFi
  const filteredWifiHubs = godowns.filter((g) => {
    const bbs = Array.isArray(g.broadbandDetails) ? g.broadbandDetails : [];
    const hasLines = bbs.length > 0;
    if (wifiStatusFilter === 'CONFIGURED' && !hasLines) return false;
    if (wifiStatusFilter === 'PENDING' && hasLines) return false;

    if (wifiSearchQuery.trim()) {
      const q = wifiSearchQuery.toLowerCase().trim();
      const matchName = (g.erpName || g.name || '').toLowerCase().includes(q);
      const matchCode = (g.code || '').toLowerCase().includes(q);
      const matchCity = (g.city || g.location || '').toLowerCase().includes(q);
      const matchLines = bbs.some((b) =>
        (b.networkProvider || '').toLowerCase().includes(q) ||
        (b.accountNumber || '').toLowerCase().includes(q) ||
        (b.userId || '').toLowerCase().includes(q) ||
        (b.registeredMobileNumber || b.registeredMobile || '').toLowerCase().includes(q)
      );
      return matchName || matchCode || matchCity || matchLines;
    }
    return true;
  });

  const configuredWifiCount = godowns.filter(
    (g) => Array.isArray(g.broadbandDetails) && g.broadbandDetails.length > 0
  ).length;

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
            Search, filter, and configure facility electricity connections and WiFi networks across all hubs
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
          {/* Search and Filter Toolbar for Electricity */}
          <Card className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span>Search & Filter Electricity Hubs</span>
                    <Badge variant="neutral" size="sm">
                      {filteredElecHubs.length} of {godowns.length} Hubs
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Search and filter facilities by name, code, power provider, or service / USC connection number.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {configuredElecCount} Configured
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Info className="w-3.5 h-3.5" />
                  {godowns.length - configuredElecCount} Pending
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
              {/* Search text input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  placeholder="Search by hub name, code, city, provider, service number..."
                  value={elecSearchQuery}
                  onChange={(e) => setElecSearchQuery(e.target.value)}
                  className="pl-9 pr-8 text-xs h-9"
                />
                {elecSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setElecSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <Select
                  value={elecStatusFilter}
                  onChange={(e) => setElecStatusFilter(e.target.value as any)}
                  className="text-xs h-9 font-semibold min-w-[170px]"
                >
                  <option value="ALL">All Statuses ({godowns.length})</option>
                  <option value="CONFIGURED">Configured ({configuredElecCount})</option>
                  <option value="PENDING">Pending Setup ({godowns.length - configuredElecCount})</option>
                </Select>
              </div>

              {/* Hub Dropdown Selector */}
              <div className="flex items-center gap-2">
                <Select
                  value={selectedHubId}
                  onChange={(e) => setSelectedHubId(e.target.value)}
                  className="text-xs h-9 font-semibold min-w-[210px]"
                >
                  {filteredElecHubs.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.erpName || g.name} {g.code ? `(${g.code})` : ''}
                    </option>
                  ))}
                  {filteredElecHubs.length === 0 && (
                    <option value="" disabled>
                      No matching hubs
                    </option>
                  )}
                </Select>
              </div>

              {/* Reset Filter Button */}
              {(elecSearchQuery || elecStatusFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setElecSearchQuery('');
                    setElecStatusFilter('ALL');
                  }}
                  icon={<RotateCcw className="w-3 h-3" />}
                  className="h-9 px-2 text-xs text-gray-500 hover:text-gray-800 shrink-0"
                  title="Reset Filters"
                >
                  Reset
                </Button>
              )}
            </div>
          </Card>

          {/* Active Hub Electricity Connection Card */}
          {selectedGodown ? (
            <div>
              {!isElectricityEditing && hasSavedElectricity ? (
                /* SAVED DISPLAY CARD */
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
          ) : null}

          {/* All Hubs Electricity Overview Table */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span>Facilities Electricity Overview</span>
                    <Badge variant="neutral" size="sm">
                      {filteredElecHubs.length} {filteredElecHubs.length === 1 ? 'Hub' : 'Hubs'}
                    </Badge>
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Click any facility to view or edit its electricity configuration.
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading facilities...</div>
            ) : filteredElecHubs.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-black/[0.06] dark:border-white/[0.08] rounded-xl text-xs text-gray-400 space-y-2">
                <p>No facilities match your search query &quot;{elecSearchQuery}&quot;.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setElecSearchQuery('');
                    setElecStatusFilter('ALL');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                      <th className="py-2.5 px-3">Hub Facility</th>
                      <th className="py-2.5 px-3">City / Location</th>
                      <th className="py-2.5 px-3">Electricity Provider</th>
                      <th className="py-2.5 px-3">Service / USC Number</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                    {filteredElecHubs.map((g) => {
                      const isConfig = Boolean((g.electricityProvider || '').trim() || (g.electricityServiceNumber || '').trim());
                      const isSelected = String(g.id) === String(selectedHubId);
                      return (
                        <tr
                          key={g.id}
                          className={clsx(
                            'transition-colors cursor-pointer',
                            isSelected
                              ? 'bg-amber-500/5 dark:bg-amber-500/10'
                              : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                          )}
                          onClick={() => setSelectedHubId(String(g.id))}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-gray-100">
                                {g.erpName || g.name}
                              </span>
                              {g.code && <Badge variant="accent" size="sm">{g.code}</Badge>}
                              {isSelected && (
                                <Badge variant="neutral" size="sm">Active</Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-gray-600 dark:text-gray-400">
                            {g.city || g.location || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-gray-200">
                            {g.electricityProvider || <span className="text-gray-400 font-normal italic">Not set</span>}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-gray-700 dark:text-gray-300">
                            {g.electricityServiceNumber || <span className="text-gray-400 font-normal italic">—</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant={isConfig ? 'success' : 'warning'} size="sm">
                              {isConfig ? 'Configured' : 'Pending'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant={isSelected ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => {
                                setSelectedHubId(String(g.id));
                                setIsElectricityEditing(true);
                              }}
                              icon={<Pencil className="w-3 h-3" />}
                              className="text-[11px] h-7 px-2.5"
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WIFI / BROADBAND INFORMATION                                       */}
      {/* ========================================================================= */}
      {activeTab === 'wifi' && (
        <div className="space-y-6">
          {/* Search and Filter Toolbar for WiFi */}
          <Card className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span>Search & Filter WiFi & Broadband Hubs</span>
                    <Badge variant="neutral" size="sm">
                      {filteredWifiHubs.length} of {godowns.length} Hubs
                    </Badge>
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Search and filter facilities by name, code, ISP network provider, account number, or user ID.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {configuredWifiCount} With WiFi
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Info className="w-3.5 h-3.5" />
                  {godowns.length - configuredWifiCount} No Connections
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
              {/* Search text input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  placeholder="Search by hub name, code, provider (Airtel, ACT, Jio), account no..."
                  value={wifiSearchQuery}
                  onChange={(e) => setWifiSearchQuery(e.target.value)}
                  className="pl-9 pr-8 text-xs h-9"
                />
                {wifiSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setWifiSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <Select
                  value={wifiStatusFilter}
                  onChange={(e) => setWifiStatusFilter(e.target.value as any)}
                  className="text-xs h-9 font-semibold min-w-[170px]"
                >
                  <option value="ALL">All Statuses ({godowns.length})</option>
                  <option value="CONFIGURED">With WiFi ({configuredWifiCount})</option>
                  <option value="PENDING">No Connections ({godowns.length - configuredWifiCount})</option>
                </Select>
              </div>

              {/* Hub Dropdown Selector */}
              <div className="flex items-center gap-2">
                <Select
                  value={selectedHubId}
                  onChange={(e) => setSelectedHubId(e.target.value)}
                  className="text-xs h-9 font-semibold min-w-[210px]"
                >
                  {filteredWifiHubs.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.erpName || g.name} {g.code ? `(${g.code})` : ''}
                    </option>
                  ))}
                  {filteredWifiHubs.length === 0 && (
                    <option value="" disabled>
                      No matching hubs
                    </option>
                  )}
                </Select>
              </div>

              {/* Reset Filter Button */}
              {(wifiSearchQuery || wifiStatusFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setWifiSearchQuery('');
                    setWifiStatusFilter('ALL');
                  }}
                  icon={<RotateCcw className="w-3 h-3" />}
                  className="h-9 px-2 text-xs text-gray-500 hover:text-gray-800 shrink-0"
                  title="Reset Filters"
                >
                  Reset
                </Button>
              )}
            </div>
          </Card>

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
                          icon={<Save className="w-3.5 h-3.5" />}
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
          ) : null}

          {/* All Hubs WiFi Overview Table */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span>Facilities WiFi & Broadband Overview</span>
                    <Badge variant="neutral" size="sm">
                      {filteredWifiHubs.length} {filteredWifiHubs.length === 1 ? 'Hub' : 'Hubs'}
                    </Badge>
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Click any facility to view or configure its broadband network connections.
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading facilities...</div>
            ) : filteredWifiHubs.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-black/[0.06] dark:border-white/[0.08] rounded-xl text-xs text-gray-400 space-y-2">
                <p>No facilities match your search query &quot;{wifiSearchQuery}&quot;.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWifiSearchQuery('');
                    setWifiStatusFilter('ALL');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                      <th className="py-2.5 px-3">Hub Facility</th>
                      <th className="py-2.5 px-3">City / Location</th>
                      <th className="py-2.5 px-3">Broadband Lines</th>
                      <th className="py-2.5 px-3">Active Providers</th>
                      <th className="py-2.5 px-3">Account / Consumer IDs</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                    {filteredWifiHubs.map((g) => {
                      const bbs = Array.isArray(g.broadbandDetails) ? g.broadbandDetails : [];
                      const hasLines = bbs.length > 0;
                      const providers = Array.from(new Set(bbs.map((b) => b.networkProvider).filter(Boolean))).join(', ');
                      const accountNos = bbs.map((b) => b.accountNumber).filter(Boolean).join(', ');
                      const isSelected = String(g.id) === String(selectedHubId);

                      return (
                        <tr
                          key={g.id}
                          className={clsx(
                            'transition-colors cursor-pointer',
                            isSelected
                              ? 'bg-cyan-500/5 dark:bg-cyan-500/10'
                              : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                          )}
                          onClick={() => setSelectedHubId(String(g.id))}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-gray-100">
                                {g.erpName || g.name}
                              </span>
                              {g.code && <Badge variant="accent" size="sm">{g.code}</Badge>}
                              {isSelected && (
                                <Badge variant="neutral" size="sm">Active</Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-gray-600 dark:text-gray-400">
                            {g.city || g.location || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant={hasLines ? 'accent' : 'neutral'} size="sm">
                              {bbs.length} {bbs.length === 1 ? 'Line' : 'Lines'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-gray-200">
                            {providers || <span className="text-gray-400 font-normal italic">None</span>}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-gray-700 dark:text-gray-300">
                            {accountNos || <span className="text-gray-400 font-normal italic">—</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant={hasLines ? 'success' : 'warning'} size="sm">
                              {hasLines ? 'Active Lines' : 'No Lines'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant={isSelected ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => {
                                setSelectedHubId(String(g.id));
                                setIsWifiEditing(true);
                              }}
                              icon={<Pencil className="w-3 h-3" />}
                              className="text-[11px] h-7 px-2.5"
                            >
                              Configure
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
