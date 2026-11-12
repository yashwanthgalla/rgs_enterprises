import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Receipt,
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  Building,
  User,
  Trash2,
  Zap,
  Wifi,
  Save,
  ExternalLink,
  PlusCircle,
  Phone,
  Calendar,
  Globe,
  Radio,
  FileText,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { expenseApi, godownApi } from '../services/api';
import { Expense, Godown, BroadbandConnection } from '../types';
import { clsx } from 'clsx';

export const Expenses: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const { success, error } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [payerFilter, setPayerFilter] = useState('ALL');

  // Active Tab: 'bills' | 'electricity' | 'wifi'
  const activeTab: 'bills' | 'electricity' | 'wifi' = location.pathname.includes('/electricity')
    ? 'electricity'
    : location.pathname.includes('/wifi')
    ? 'wifi'
    : 'bills';

  const handleTabChange = (tab: 'bills' | 'electricity' | 'wifi') => {
    if (tab === 'bills') {
      navigate('/expenses/bills');
    } else {
      navigate(`/expenses/${tab}`);
    }
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

  // Add Bill Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    godownId: '',
    category: 'ELECTRICITY',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    billResponsibility: 'COMPANY',
    status: 'PENDING',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchExpensesAndGodowns = async () => {
    setLoading(true);
    try {
      const [eRes, gRes] = await Promise.all([
        expenseApi.getAll({ size: 100 }),
        godownApi.getAllList().catch(() => godownApi.getAll(0, 100)),
      ]);

      const expList = Array.isArray(eRes) ? eRes : (eRes as any)?.content || [];
      const gList = Array.isArray(gRes) ? gRes : (gRes as any)?.content || [];

      setExpenses(expList);
      setGodowns(gList);

      if (gList.length > 0 && !selectedHubId) {
        setSelectedHubId(String(gList[0].id));
      }
    } catch (err: any) {
      error('Failed to load expenses data: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensesAndGodowns();
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

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) {
      error('Please fill required fields (Title and Amount)');
      return;
    }

    const targetGodownId = formData.godownId
      ? Number(formData.godownId)
      : godowns[0]
      ? godowns[0].id
      : null;
    if (!targetGodownId) {
      error('Please register a Hub property before adding operating bills.');
      return;
    }

    setSubmitting(true);
    try {
      await expenseApi.create({
        title: formData.title,
        godownId: targetGodownId,
        category: formData.category,
        amount: Number(formData.amount),
        expenseDate: formData.expenseDate,
        dueDate: formData.dueDate || null,
        billResponsibility: formData.billResponsibility,
        status: formData.status,
      });

      success('Bill recorded successfully');
      setIsModalOpen(false);
      fetchExpensesAndGodowns();
    } catch (err: any) {
      error('Failed to save bill: ' + (err.message || 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayExpense = async (id: number) => {
    try {
      await expenseApi.recordPayment(id, { paidBy: 'Admin' });
      success('Bill marked as paid');
      fetchExpensesAndGodowns();
    } catch (err: any) {
      error('Failed to mark as paid: ' + err.message);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      await expenseApi.delete(id);
      success('Expense deleted');
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      error('Failed to delete: ' + err.message);
    }
  };

  const totalExpense = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const companyExpense = expenses
    .filter((e) => e.billResponsibility === 'COMPANY')
    .reduce((acc, e) => acc + (e.amount || 0), 0);
  const tenantExpense = expenses
    .filter((e) => e.billResponsibility === 'TENANT')
    .reduce((acc, e) => acc + (e.amount || 0), 0);

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.godownName && e.godownName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
    const matchesPayer = payerFilter === 'ALL' || e.billResponsibility === payerFilter;
    return matchesSearch && matchesCategory && matchesPayer;
  });

  // Electricity bills for the selected hub
  const hubElectricityBills = expenses.filter(
    (e) =>
      e.category === 'ELECTRICITY' &&
      selectedHubId &&
      String(e.godownId) === String(selectedHubId)
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-apple-accent" />
            <span>Expenses & Utilities</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage bills, electricity service numbers, and WiFi connections with automatic synchronization to Hubs
          </p>
        </div>

        {activeTab === 'bills' && (
          <Button
            onClick={() => {
              setFormData({
                title: '',
                godownId: selectedHubId || (godowns[0] ? String(godowns[0].id) : ''),
                category: 'ELECTRICITY',
                amount: '',
                expenseDate: new Date().toISOString().slice(0, 10),
                dueDate: '',
                billResponsibility: 'COMPANY',
                status: 'PENDING',
              });
              setIsModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
            className="rounded-xl shadow-apple-sm"
          >
            Add New Bill
          </Button>
        )}
      </div>

      {/* Sub-Tabs Bar: All Bills / Electricity Information / WiFi Information */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] w-fit">
        <button
          type="button"
          onClick={() => handleTabChange('bills')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all duration-150',
            activeTab === 'bills'
              ? 'bg-apple-accent text-white shadow-apple-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
          )}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>All Bills & Expenses</span>
        </button>

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
      {/* TAB 1: ALL BILLS & EXPENSES                                               */}
      {/* ========================================================================= */}
      {activeTab === 'bills' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Outflow</span>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(totalExpense)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-apple-accent/10 text-apple-accent">
                <Receipt className="w-5 h-5" />
              </div>
            </Card>

            <Card className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Company Borne</span>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(companyExpense)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-apple-purple/10 text-[#5856D6]">
                <Building className="w-5 h-5" />
              </div>
            </Card>

            <Card className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tenant Reimbursable</span>
                <p className="text-xl font-bold text-apple-success mt-0.5">{formatCurrency(tenantExpense)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-apple-success/10 text-apple-success">
                <User className="w-5 h-5" />
              </div>
            </Card>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Input
                placeholder="Search by bill title or hub..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>

            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              <option value="ALL">All Categories</option>
              <option value="ELECTRICITY">Electricity</option>
              <option value="WATER">Water</option>
              <option value="PROPERTY_TAX">Property Tax</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="SALARY">Salary</option>
              <option value="SECURITY">Security</option>
              <option value="INSURANCE">Insurance</option>
              <option value="OTHER">Other</option>
            </Select>

            <Select
              value={payerFilter}
              onChange={(e) => setPayerFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              <option value="ALL">All Payers</option>
              <option value="COMPANY">Company Borne</option>
              <option value="TENANT">Tenant Reimbursable</option>
            </Select>
          </div>

          {/* Expenses Table */}
          <Card className="p-5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-3">Title / Hub</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Billed To</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        Loading expenses...
                      </td>
                    </tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        No expense records found.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                        <td className="py-3.5 px-3">
                          <p className="font-bold text-gray-900 dark:text-gray-100">{exp.title}</p>
                          <p className="text-[11px] text-gray-400">
                            {exp.godownName || (exp.godownId ? `Hub #${exp.godownId}` : 'General Portfolio')}
                          </p>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-gray-700 dark:text-gray-300">
                          {exp.category}
                        </td>
                        <td className="py-3.5 px-3 text-gray-500">
                          {exp.expenseDate}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="py-3.5 px-3">
                          <Badge variant={exp.billResponsibility === 'TENANT' ? 'accent' : 'neutral'} size="sm">
                            {exp.billResponsibility}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-3">
                          <Badge
                            variant={
                              exp.status === 'PAID'
                                ? 'success'
                                : exp.status === 'OVERDUE'
                                ? 'danger'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {exp.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-3 text-right space-x-2">
                          {exp.status !== 'PAID' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePayExpense(exp.id)}
                              icon={<CheckCircle className="w-3.5 h-3.5" />}
                            >
                              Mark Paid
                            </Button>
                          )}
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-apple-danger hover:bg-apple-danger/10 transition-colors"
                            title="Delete bill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ELECTRICITY INFORMATION                                            */}
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

              {/* Electricity Bills for this Hub */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-500" />
                      <span>Electricity Bills History ({hubElectricityBills.length})</span>
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Utility power vouchers recorded for {selectedGodown?.erpName || selectedGodown?.name}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        title: `${selectedGodown?.erpName || selectedGodown?.name || 'Hub'} Electricity Bill`,
                        godownId: selectedHubId,
                        category: 'ELECTRICITY',
                        amount: '',
                        expenseDate: new Date().toISOString().slice(0, 10),
                        dueDate: '',
                        billResponsibility: 'COMPANY',
                        status: 'PENDING',
                      });
                      setIsModalOpen(true);
                    }}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    + Log Electricity Bill
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 px-3">Title</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Billed To</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                      {hubElectricityBills.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                            No electricity bills logged yet for this hub.
                          </td>
                        </tr>
                      ) : (
                        hubElectricityBills.map((b) => (
                          <tr key={b.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                            <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-gray-200">
                              {b.title}
                            </td>
                            <td className="py-2.5 px-3 text-gray-500">{b.expenseDate}</td>
                            <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(b.amount)}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant={b.billResponsibility === 'TENANT' ? 'accent' : 'neutral'} size="sm">
                                {b.billResponsibility}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant={
                                  b.status === 'PAID'
                                    ? 'success'
                                    : b.status === 'OVERDUE'
                                    ? 'danger'
                                    : 'warning'
                                }
                                size="sm"
                              >
                                {b.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
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
      {/* TAB 3: WIFI / BROADBAND INFORMATION                                       */}
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

      {/* ========================================================================= */}
      {/* ADD BILL MODAL                                                            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Operating Expense / Bill"
        description="Record a new utility, electricity, maintenance, or operating cost."
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <FormField label="Bill Title / Description" required>
            <Input
              placeholder="e.g. TSSPDCL Substation Power - Nov 2026"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Hub Facility" hint={godowns.length === 0 ? "Add your first hub in HUBS tab" : undefined}>
            <Select
              value={formData.godownId}
              onChange={(e) => setFormData({ ...formData, godownId: e.target.value })}
            >
              <option value="">General (All Hubs)</option>
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.erpName || g.name} - {g.location || g.city || 'Hub'}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              >
                <option value="ELECTRICITY">Electricity</option>
                <option value="WATER">Water</option>
                <option value="PROPERTY_TAX">Property Tax</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="SECURITY">Security</option>
                <option value="SALARY">Salary</option>
                <option value="INSURANCE">Insurance</option>
                <option value="OTHER">Other</option>
              </Select>
            </FormField>

            <FormField label="Amount (₹)" required>
              <Input
                type="number"
                placeholder="e.g. 12500"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Expense Date" required>
              <Input
                type="date"
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Due Date">
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Responsibility">
              <Select
                value={formData.billResponsibility}
                onChange={(e) => setFormData({ ...formData, billResponsibility: e.target.value as any })}
              >
                <option value="COMPANY">Company Borne</option>
                <option value="TENANT">Tenant Reimbursable</option>
              </Select>
            </FormField>

            <FormField label="Status">
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="OVERDUE">OVERDUE</option>
              </Select>
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
