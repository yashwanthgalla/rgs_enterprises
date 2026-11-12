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
  Receipt,
  X,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/Input';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { godownApi, expenseApi } from '../services/api';
import { Godown, BroadbandConnection, Expense } from '../types';
import { clsx } from 'clsx';

export const Expenses: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { formatCurrency } = useSettings();

  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'electricity' | 'wifi'
  const activeTab: 'electricity' | 'wifi' = location.pathname.includes('/wifi')
    ? 'wifi'
    : 'electricity';

  const handleTabChange = (tab: 'electricity' | 'wifi') => {
    navigate(`/information/${tab}`);
  };

  // Selected Hub for Electricity and WiFi sub-tabs
  const [selectedHubId, setSelectedHubId] = useState<string>('');

  // Electricity Edit / View State
  const [isElectricityEditing, setIsElectricityEditing] = useState(false);
  const [electricityProvider, setElectricityProvider] = useState('');
  const [electricityServiceNumber, setElectricityServiceNumber] = useState('');
  const [savingElectricity, setSavingElectricity] = useState(false);

  // Bills for selected Hub (for information only)
  const [billCategory, setBillCategory] = useState<'ELECTRICITY' | 'WIFI'>('ELECTRICITY');
  const [electricityBills, setElectricityBills] = useState<Expense[]>([]);
  const [wifiBills, setWifiBills] = useState<Expense[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [loadingWifiBills, setLoadingWifiBills] = useState(false);

  // Add Bill Modal State
  const [isAddBillModalOpen, setIsAddBillModalOpen] = useState(false);
  const [submittingBill, setSubmittingBill] = useState(false);
  const [billFormData, setBillFormData] = useState({
    amount: '',
    billDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    title: '',
    status: 'PAID',
    notes: '',
  });

  // WiFi Edit / View State
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

  // Fetch electricity bills for this hub
  const fetchHubElectricityBills = async (hubId: string | number) => {
    if (!hubId) return;
    setLoadingBills(true);
    try {
      const res = await expenseApi.getByGodown(hubId).catch(() => []);
      const allExpenses: Expense[] = Array.isArray(res) ? res : (res as any)?.content || [];
      const elecOnly = allExpenses.filter((e) => e.category === 'ELECTRICITY');
      setElectricityBills(elecOnly);
    } catch {
      setElectricityBills([]);
    } finally {
      setLoadingBills(false);
    }
  };

  // Fetch wifi bills for this hub
  const fetchHubWifiBills = async (hubId: string | number) => {
    if (!hubId) return;
    setLoadingWifiBills(true);
    try {
      const res = await expenseApi.getByGodown(hubId).catch(() => []);
      const allExpenses: Expense[] = Array.isArray(res) ? res : (res as any)?.content || [];
      const wifiOnly = allExpenses.filter(
        (e) => e.category === 'WIFI' || e.category === 'INTERNET' || e.category === 'BROADBAND'
      );
      setWifiBills(wifiOnly);
    } catch {
      setWifiBills([]);
    } finally {
      setLoadingWifiBills(false);
    }
  };

  useEffect(() => {
    if (selectedGodown) {
      const provider = selectedGodown.electricityProvider || '';
      const serviceNo = selectedGodown.electricityServiceNumber || '';
      setElectricityProvider(provider);
      setElectricityServiceNumber(serviceNo);

      // If details are already saved, default to display card mode
      if (provider || serviceNo) {
        setIsElectricityEditing(false);
      } else {
        setIsElectricityEditing(true);
      }

      // Fetch electricity and wifi bills for information
      fetchHubElectricityBills(selectedGodown.id);
      fetchHubWifiBills(selectedGodown.id);

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

  // Save Electricity Details -> auto-updates Hub section and switches to Card view
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

      // Update local state
      setGodowns((prev) =>
        prev.map((g) => (String(g.id) === String(selectedHubId) ? { ...g, ...updatedGodown } : g))
      );
      success('Electricity details saved and updated to the Hub section!');
      setIsElectricityEditing(false); // Switch to display card view
    } catch (err: any) {
      error('Failed to update electricity details: ' + (err.message || 'Error'));
    } finally {
      setSavingElectricity(false);
    }
  };

  // Add Bill for Electricity (information only)
  const handleOpenAddBillModal = () => {
    setBillCategory('ELECTRICITY');
    const defaultTitle = `${selectedGodown?.electricityProvider || 'Power'} Bill - ${new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}`;
    setBillFormData({
      amount: '',
      billDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      title: defaultTitle,
      status: 'PAID',
      notes: selectedGodown?.electricityServiceNumber ? `USC: ${selectedGodown.electricityServiceNumber}` : '',
    });
    setIsAddBillModalOpen(true);
  };

  // Add Bill for WiFi / Broadband (information only)
  const handleOpenAddWifiBillModal = (specificLine?: BroadbandConnection) => {
    setBillCategory('WIFI');
    const targetLine = specificLine || broadbandList[0];
    const provider = targetLine?.networkProvider || 'Broadband / WiFi';
    const defaultTitle = `${provider} Bill - ${new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}`;
    const lineNotes = targetLine?.accountNumber ? `Account No: ${targetLine.accountNumber}` : '';
    setBillFormData({
      amount: '',
      billDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      title: defaultTitle,
      status: 'PAID',
      notes: lineNotes,
    });
    setIsAddBillModalOpen(true);
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billFormData.amount) {
      error('Please enter the bill amount');
      return;
    }

    setSubmittingBill(true);
    try {
      await expenseApi.create({
        godownId: Number(selectedHubId),
        category: billCategory,
        title: billFormData.title || (billCategory === 'WIFI' ? 'WiFi Bill' : 'Electricity Bill'),
        amount: Number(billFormData.amount),
        billDate: billFormData.billDate,
        dueDate: billFormData.dueDate || null,
        status: billFormData.status,
        notes: billFormData.notes || null,
      });

      success(`${billCategory === 'WIFI' ? 'WiFi' : 'Electricity'} bill saved for information.`);
      setIsAddBillModalOpen(false);
      if (billCategory === 'WIFI') {
        fetchHubWifiBills(selectedHubId);
      } else {
        fetchHubElectricityBills(selectedHubId);
      }
    } catch (err: any) {
      error('Failed to save bill: ' + (err.message || 'Error'));
    } finally {
      setSubmittingBill(false);
    }
  };

  const handleDeleteBill = async (billId: number) => {
    if (!window.confirm('Delete this bill record?')) return;
    try {
      await expenseApi.delete(billId);
      setElectricityBills((prev) => prev.filter((b) => b.id !== billId));
      success('Bill record removed.');
    } catch (err: any) {
      error('Failed to delete: ' + err.message);
    }
  };

  const handleDeleteWifiBill = async (billId: number) => {
    if (!window.confirm('Delete this WiFi bill record?')) return;
    try {
      await expenseApi.delete(billId);
      setWifiBills((prev) => prev.filter((b) => b.id !== billId));
      success('WiFi bill record removed.');
    } catch (err: any) {
      error('Failed to delete: ' + err.message);
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
            bb.currentPlanEndDate ||
            bb.serviceContactNumber
        );

      const updatedGodown = await godownApi.patch(selectedHubId, {
        broadbandDetails: cleanBbs,
      });

      setGodowns((prev) =>
        prev.map((g) => (String(g.id) === String(selectedHubId) ? { ...g, ...updatedGodown } : g))
      );
      success('WiFi & broadband connections saved and updated to the Hub section!');
      setIsWifiEditing(false); // Switch to display card view
    } catch (err: any) {
      error('Failed to update WiFi details: ' + (err.message || 'Error'));
    } finally {
      setSavingWifi(false);
    }
  };

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

  const handleRemoveBroadbandLine = (index: number) => {
    setBroadbandList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateBroadbandLine = (index: number, field: keyof BroadbandConnection, value: string) => {
    setBroadbandList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
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
            Manage facility electricity connections and WiFi networks with automatic synchronization to the Hub profile
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
                  Select a hub to view or edit electricity details. Once saved, details display cleanly as a card.
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

          {/* Electricity Card View OR Edit Form */}
          {!isElectricityEditing && hasSavedElectricity ? (
            /* SAVED DISPLAY CARD WITH SMALL + ADD BILL BUTTON */
            <div className="space-y-6">
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
                          {selectedGodown ? (selectedGodown.erpName || selectedGodown.name) : 'Hub'} — Electricity Connection
                        </h4>
                        {selectedGodown?.code && (
                          <Badge variant="accent" size="sm">
                            {selectedGodown.code}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Live connection parameters recorded on facility records
                      </p>
                    </div>
                  </div>

                  {/* Actions on Card: Small Add Bill button & Edit button */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleOpenAddBillModal}
                      icon={<Plus className="w-3.5 h-3.5" />}
                      className="rounded-xl shadow-apple-sm text-xs font-semibold px-3 py-1.5"
                    >
                      + Add Bill
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsElectricityEditing(true)}
                      icon={<Pencil className="w-3.5 h-3.5" />}
                      className="text-xs font-semibold"
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
                      {selectedGodown?.electricityProvider || 'Not Configured'}
                    </p>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Active Utility DISCOM / Provider
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Electricity Service / USC Number
                    </span>
                    <p className="text-base font-mono font-bold text-gray-900 dark:text-gray-100">
                      {selectedGodown?.electricityServiceNumber || 'Not Configured'}
                    </p>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Consumer ID / Service Connection Number
                    </span>
                  </div>
                </div>

                {/* Logged Bills for Information */}
                <div className="mt-6 pt-5 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-amber-500" />
                      <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                        Saved Electricity Bills ({electricityBills.length})
                      </h5>
                      <span className="text-[10px] text-gray-400">(Saved for information only)</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddBillModal}
                      className="text-xs text-apple-accent hover:underline font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Bill</span>
                    </button>
                  </div>

                  {loadingBills ? (
                    <div className="py-6 text-center text-xs text-gray-400">Loading bill records...</div>
                  ) : electricityBills.length === 0 ? (
                    <div className="py-6 text-center border-2 border-dashed border-black/[0.06] dark:border-white/[0.08] rounded-xl text-xs text-gray-400">
                      No bills recorded yet. Click &quot;+ Add Bill&quot; on the card to save a bill for information.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Title / Ref</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                          {electricityBills.map((bill) => (
                            <tr key={bill.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                              <td className="py-2.5 px-3 font-medium text-gray-600 dark:text-gray-400">
                                {bill.expenseDate}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-gray-900 dark:text-gray-100">{bill.title}</span>
                                {bill.notes && <p className="text-[10px] text-gray-400 truncate max-w-xs">{bill.notes}</p>}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-gray-100">
                                {formatCurrency(bill.amount)}
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge variant={bill.status === 'PAID' ? 'success' : 'warning'} size="sm">
                                  {bill.status}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBill(bill.id)}
                                  className="p-1 rounded-lg text-gray-400 hover:text-apple-danger hover:bg-apple-danger/10 transition-colors"
                                  title="Delete bill record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            /* EDIT FORM VIEW */
            <Card className="p-6">
              <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                      {selectedGodown ? (selectedGodown.erpName || selectedGodown.name) : 'Hub'} — Electricity Connection
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Enter connection parameters. Once saved, details will display as a card with an Add Bill button.
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
                    Changes will automatically reflect in the Hub overview and display as a summary card.
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
          {!isWifiEditing && broadbandList.length > 0 ? (
            /* SAVED DISPLAY CARD VIEW */
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-500">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                      {selectedGodown ? (selectedGodown.erpName || selectedGodown.name) : 'Hub'} — Broadband Connections ({broadbandList.length})
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Active Internet leased lines and fiber networks synced with facility profile
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleOpenAddWifiBillModal()}
                    icon={<Plus className="w-3.5 h-3.5" />}
                    className="rounded-xl shadow-apple-sm text-xs font-semibold px-3 py-1.5"
                  >
                    + Add Bill
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsWifiEditing(true)}
                    icon={<Pencil className="w-3.5 h-3.5" />}
                    className="text-xs font-semibold"
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
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenAddWifiBillModal(bb)}
                          className="text-[11px] font-semibold text-apple-accent hover:underline flex items-center gap-0.5"
                          title="Add bill for this connection"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Bill</span>
                        </button>
                        <Badge variant="accent" size="sm">Line #{idx + 1}</Badge>
                      </div>
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

              {/* Logged WiFi Bills for Information */}
              <div className="mt-6 pt-5 border-t border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-cyan-500" />
                    <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                      Saved WiFi Bills ({wifiBills.length})
                    </h5>
                    <span className="text-[10px] text-gray-400">(Saved for information only)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAddWifiBillModal()}
                    className="text-xs text-apple-accent hover:underline font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Bill</span>
                  </button>
                </div>

                {loadingWifiBills ? (
                  <div className="py-6 text-center text-xs text-gray-400">Loading bill records...</div>
                ) : wifiBills.length === 0 ? (
                  <div className="py-6 text-center border-2 border-dashed border-black/[0.06] dark:border-white/[0.08] rounded-xl text-xs text-gray-400">
                    No WiFi bills recorded yet. Click &quot;+ Add Bill&quot; on the card to save a bill for information.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Title / Provider</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                        {wifiBills.map((bill) => (
                          <tr key={bill.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                            <td className="py-2.5 px-3 font-medium text-gray-600 dark:text-gray-400">
                              {bill.expenseDate}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-gray-900 dark:text-gray-100">{bill.title}</span>
                              {bill.notes && <p className="text-[10px] text-gray-400 truncate max-w-xs">{bill.notes}</p>}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(bill.amount)}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant={bill.status === 'PAID' ? 'success' : 'warning'} size="sm">
                                {bill.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteWifiBill(bill.id)}
                                className="p-1 rounded-md text-gray-400 hover:text-apple-danger hover:bg-apple-danger/10 transition-colors"
                                title="Delete Bill Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            /* EDIT FORM VIEW */
            <form onSubmit={handleSaveWifi} className="space-y-6">
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4 mb-5">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-cyan-500" />
                      <span>Configure Broadband Connections ({broadbandList.length})</span>
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Add and configure lines for {selectedGodown?.erpName || selectedGodown?.name}
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
                      Add Connection
                    </Button>

                    {broadbandList.length > 0 && selectedGodown?.broadbandDetails && (
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
      )}

      {/* ========================================================================= */}
      {/* ADD BILL MODAL (FOR INFORMATION ONLY)                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddBillModalOpen}
        onClose={() => setIsAddBillModalOpen(false)}
        title={`Add ${billCategory === 'WIFI' ? 'WiFi / Broadband' : 'Electricity'} Bill (Information Only)`}
        description={`Record a bill for ${selectedGodown?.erpName || selectedGodown?.name || 'this Hub'}. Stored solely for your information.`}
      >
        <form onSubmit={handleSaveBill} className="space-y-4">
          <FormField label="Bill Title / Description" required>
            <Input
              placeholder={
                billCategory === 'WIFI'
                  ? 'e.g. Airtel Fibernet Bill - Nov 2026'
                  : 'e.g. APSPDCL Power Bill - Nov 2026'
              }
              value={billFormData.title}
              onChange={(e) => setBillFormData({ ...billFormData, title: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount (₹)" required>
              <Input
                type="number"
                placeholder="e.g. 1500"
                value={billFormData.amount}
                onChange={(e) => setBillFormData({ ...billFormData, amount: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Status">
              <Select
                value={billFormData.status}
                onChange={(e) => setBillFormData({ ...billFormData, status: e.target.value })}
              >
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Bill Date" required>
              <Input
                type="date"
                value={billFormData.billDate}
                onChange={(e) => setBillFormData({ ...billFormData, billDate: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Due Date">
              <Input
                type="date"
                value={billFormData.dueDate}
                onChange={(e) => setBillFormData({ ...billFormData, dueDate: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Notes / Reference Details">
            <Input
              placeholder={
                billCategory === 'WIFI'
                  ? 'e.g. Account No: 10429482, paid online'
                  : 'e.g. Meter reading: 4520 units, paid online'
              }
              value={billFormData.notes}
              onChange={(e) => setBillFormData({ ...billFormData, notes: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button type="button" variant="outline" onClick={() => setIsAddBillModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submittingBill}>
              Save Bill Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
