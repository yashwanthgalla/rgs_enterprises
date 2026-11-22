import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryClient, STALE_TIMES } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import {
  Landmark,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Building,
  Calculator,
  IndianRupee,
  Layers,
  ArrowRight,
  TrendingUp,
  Receipt,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { godownApi, financeApi } from '../services/api';
import { Godown, FinanceTotalRevenue, FinanceRent } from '../types';

const FINANCIAL_YEARS = [
  '2023-2024',
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028',
  '2028-2029',
];

export const Finance: React.FC = () => {
  const { formatCurrency } = useSettings();
  const { success, error } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Determine initial tab from route or query params
  const getInitialTab = (): 'REVENUE' | 'RENT' => {
    if (location.pathname.includes('/rent') || searchParams.get('tab') === 'rent') {
      return 'RENT';
    }
    return 'REVENUE';
  };

  const [activeTab, setActiveTab] = useState<'REVENUE' | 'RENT'>(getInitialTab);

  // Keep activeTab in sync with route changes; redirect /finance to /finance/revenue
  useEffect(() => {
    if (location.pathname === '/finance') {
      navigate('/finance/revenue', { replace: true });
    } else if (location.pathname.includes('/rent') || searchParams.get('tab') === 'rent') {
      setActiveTab('RENT');
    } else if (location.pathname.includes('/revenue') || searchParams.get('tab') === 'revenue') {
      setActiveTab('REVENUE');
    }
  }, [location.pathname, searchParams, navigate]);

  const [selectedHubId, setSelectedHubId] = useState<string>('ALL');

  // Load Hubs with session-long cache
  const hubsQuery = useQuery({
    queryKey: queryKeys.hubs.compact(),
    queryFn: async () => {
      const res: any = await godownApi.getAllList();
      return Array.isArray(res) ? res : res?.content || [];
    },
    staleTime: STALE_TIMES.LONG_LIVED,
  });
  const hubs: Godown[] = hubsQuery.data || [];

  // Query Total Revenues with keepPreviousData to prevent flashing on hub filter change
  const revenuesQuery = useQuery({
    queryKey: queryKeys.finance.revenues(selectedHubId !== 'ALL' ? { hubId: selectedHubId } : undefined),
    queryFn: async () => {
      const params: any = {};
      if (selectedHubId !== 'ALL') params.hubId = selectedHubId;
      const res: any = await financeApi.getTotalRevenues(params);
      return Array.isArray(res) ? res : res?.content || [];
    },
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });

  // Query Rents with keepPreviousData
  const rentsQuery = useQuery({
    queryKey: queryKeys.finance.rents(selectedHubId !== 'ALL' ? { hubId: selectedHubId } : undefined),
    queryFn: async () => {
      const params: any = {};
      if (selectedHubId !== 'ALL') params.hubId = selectedHubId;
      const res: any = await financeApi.getRents(params);
      return Array.isArray(res) ? res : res?.content || [];
    },
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });

  const revenueList: FinanceTotalRevenue[] = revenuesQuery.data || [];
  const rentList: FinanceRent[] = rentsQuery.data || [];
  const loading = activeTab === 'REVENUE' ? (revenuesQuery.isLoading && !revenuesQuery.data) : (rentsQuery.isLoading && !rentsQuery.data);

  // Tab 1: Total Revenue State
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<FinanceTotalRevenue | null>(null);
  const [revenueForm, setRevenueForm] = useState({
    hubId: '',
    financialYear: '2025-2026',
    rent: '',
    setupCostPerMonth: '',
    electricity: '',
    wifi: '',
    manpower: '',
    housekeeping: '',
    wmRefreshmentPettyCash: '',
    totalRevenue: '',
  });

  // Tab 2: Rent State
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [editingRent, setEditingRent] = useState<FinanceRent | null>(null);
  const [rentForm, setRentForm] = useState({
    hubId: '',
    period: new Date().toISOString().substring(0, 7), // YYYY-MM
    rent: '',
    applyTds: false,
    applyGst: false,
    electricityBill: '',
    wifiBill: '',
    sorterPayments: '',
    pettyCash: '',
    total: '',
  });

  const [submitting, setSubmitting] = useState(false);

  // Total Revenue Live Auto Calculation
  const calcTotalRevenue = (form: typeof revenueForm): number => {
    const rent = parseFloat(form.rent) || 0;
    const setup = parseFloat(form.setupCostPerMonth) || 0;
    const elec = parseFloat(form.electricity) || 0;
    const wifi = parseFloat(form.wifi) || 0;
    const manpower = parseFloat(form.manpower) || 0;
    const house = parseFloat(form.housekeeping) || 0;
    const wm = parseFloat(form.wmRefreshmentPettyCash) || 0;
    return Number((rent + setup + elec + wifi + manpower + house + wm).toFixed(2));
  };

  // Rent Live Auto Calculations with Gated TDS & GST:
  // TDS Amount = applyTds ? (Rent * 10%) : 0
  // Total Rent After TDS = Rent - TDS Amount
  // GST Amount = applyGst ? (Rent * 18%) : 0
  // Total Rent Including GST = Total Rent After TDS + GST Amount
  // Total = Total Rent Including GST + Electricity Bill + WiFi Bill + Sorter Payments + Petty Cash
  const calcRentMath = (form: typeof rentForm) => {
    const rent = parseFloat(form.rent) || 0;
    const tdsAmount = form.applyTds ? Number((rent * 0.10).toFixed(2)) : 0;
    const totalRentAfterTds = Number((rent - tdsAmount).toFixed(2));
    const gstAmount = form.applyGst ? Number((rent * 0.18).toFixed(2)) : 0;
    const totalRentIncludingGst = Number((totalRentAfterTds + gstAmount).toFixed(2));
    const elec = parseFloat(form.electricityBill) || 0;
    const wifi = parseFloat(form.wifiBill) || 0;
    const sorter = parseFloat(form.sorterPayments) || 0;
    const petty = parseFloat(form.pettyCash) || 0;
    const total = Number((totalRentIncludingGst + elec + wifi + sorter + petty).toFixed(2));

    return {
      rent,
      tdsAmount,
      totalRentAfterTds,
      gstAmount,
      totalRentIncludingGst,
      elec,
      wifi,
      sorter,
      petty,
      total,
    };
  };

  // Revenue Modal Open
  const openCreateRevenueModal = () => {
    setEditingRevenue(null);
    setRevenueForm({
      hubId: selectedHubId !== 'ALL' ? selectedHubId : (hubs[0]?.id ? String(hubs[0].id) : ''),
      financialYear: '2025-2026',
      rent: '',
      setupCostPerMonth: '',
      electricity: '',
      wifi: '',
      manpower: '',
      housekeeping: '',
      wmRefreshmentPettyCash: '',
      totalRevenue: '',
    });
    setIsRevenueModalOpen(true);
  };

  const openEditRevenueModal = (item: FinanceTotalRevenue) => {
    setEditingRevenue(item);
    setRevenueForm({
      hubId: String(item.hubId),
      financialYear: item.financialYear,
      rent: String(item.rent || ''),
      setupCostPerMonth: String(item.setupCostPerMonth || ''),
      electricity: String(item.electricity || ''),
      wifi: String(item.wifi || ''),
      manpower: String(item.manpower || ''),
      housekeeping: String(item.housekeeping || ''),
      wmRefreshmentPettyCash: String(item.wmRefreshmentPettyCash || ''),
      totalRevenue: String(item.totalRevenue ?? ''),
    });
    setIsRevenueModalOpen(true);
  };

  const handleRevenueFieldChange = (field: string, val: string) => {
    const updated = { ...revenueForm, [field]: val };
    const liveSum = calcTotalRevenue(updated);
    updated.totalRevenue = liveSum > 0 ? String(liveSum) : '';
    setRevenueForm(updated);
  };

  const handleRevenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenueForm.hubId) {
      error('Please select a Hub.');
      return;
    }
    setSubmitting(true);
    try {
      const calculatedSum = calcTotalRevenue(revenueForm);
      const parsedUserTotal = parseFloat(revenueForm.totalRevenue);
      const finalTotal =
        !isNaN(parsedUserTotal) && revenueForm.totalRevenue.trim() !== ''
          ? Number(parsedUserTotal.toFixed(2))
          : calculatedSum;

      const payload = {
        hubId: Number(revenueForm.hubId),
        financialYear: revenueForm.financialYear,
        rent: Number(parseFloat(revenueForm.rent || '0').toFixed(2)),
        setupCostPerMonth: Number(parseFloat(revenueForm.setupCostPerMonth || '0').toFixed(2)),
        electricity: Number(parseFloat(revenueForm.electricity || '0').toFixed(2)),
        wifi: Number(parseFloat(revenueForm.wifi || '0').toFixed(2)),
        manpower: Number(parseFloat(revenueForm.manpower || '0').toFixed(2)),
        housekeeping: Number(parseFloat(revenueForm.housekeeping || '0').toFixed(2)),
        wmRefreshmentPettyCash: Number(parseFloat(revenueForm.wmRefreshmentPettyCash || '0').toFixed(2)),
        totalRevenue: finalTotal,
      };

      if (editingRevenue) {
        await financeApi.updateTotalRevenue(editingRevenue.id, payload);
        success('Total Revenue record updated successfully');
      } else {
        await financeApi.createTotalRevenue(payload);
        success('Total Revenue record saved successfully');
      }
      setIsRevenueModalOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.revenues() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    } catch (err: any) {
      error('Failed to save record: ' + (err.message || 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRevenue = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this yearly revenue record?')) return;
    try {
      await financeApi.deleteTotalRevenue(id);
      success('Record deleted successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.revenues() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    } catch (err: any) {
      error('Failed to delete: ' + (err.message || 'Error'));
    }
  };

  // Rent Modal Open
  const openCreateRentModal = () => {
    setEditingRent(null);
    setRentForm({
      hubId: selectedHubId !== 'ALL' ? selectedHubId : (hubs[0]?.id ? String(hubs[0].id) : ''),
      period: new Date().toISOString().substring(0, 7),
      rent: '',
      applyTds: false,
      applyGst: false,
      electricityBill: '',
      wifiBill: '',
      sorterPayments: '',
      pettyCash: '',
      total: '',
    });
    setIsRentModalOpen(true);
  };

  const openEditRentModal = (item: FinanceRent) => {
    setEditingRent(item);
    const applyTds =
      item.tdsApplied !== undefined
        ? Boolean(item.tdsApplied)
        : Number(item.tdsAmount || 0) > 0;
    const applyGst =
      item.gstApplied !== undefined
        ? Boolean(item.gstApplied)
        : Number(item.gstAmount || 0) > 0;

    setRentForm({
      hubId: String(item.hubId),
      period: item.period,
      rent: String(item.rent || ''),
      applyTds,
      applyGst,
      electricityBill: String(item.electricityBill || ''),
      wifiBill: String(item.wifiBill || ''),
      sorterPayments: String(item.sorterPayments || ''),
      pettyCash: String(item.pettyCash || ''),
      total: String(item.total ?? ''),
    });
    setIsRentModalOpen(true);
  };

  const handleRentFieldChange = (field: string, val: string) => {
    const updated = { ...rentForm, [field]: val };
    const math = calcRentMath(updated);
    updated.total = math.total > 0 ? String(math.total) : '';
    setRentForm(updated);
  };

  const handleToggleTds = (checked: boolean) => {
    const updated = { ...rentForm, applyTds: checked };
    const math = calcRentMath(updated);
    updated.total = math.total > 0 ? String(math.total) : '';
    setRentForm(updated);
  };

  const handleToggleGst = (checked: boolean) => {
    const updated = { ...rentForm, applyGst: checked };
    const math = calcRentMath(updated);
    updated.total = math.total > 0 ? String(math.total) : '';
    setRentForm(updated);
  };

  const handleRentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentForm.hubId) {
      error('Please select a Hub.');
      return;
    }
    setSubmitting(true);
    try {
      const math = calcRentMath(rentForm);
      const parsedUserTotal = parseFloat(rentForm.total);
      const finalTotal =
        !isNaN(parsedUserTotal) && rentForm.total.trim() !== ''
          ? Number(parsedUserTotal.toFixed(2))
          : math.total;

      const payload = {
        hubId: Number(rentForm.hubId),
        period: rentForm.period,
        rent: math.rent,
        tdsApplied: rentForm.applyTds,
        tdsPercent: 10,
        tdsAmount: math.tdsAmount,
        totalRentAfterTds: math.totalRentAfterTds,
        gstApplied: rentForm.applyGst,
        gstPercent: 18,
        gstAmount: math.gstAmount,
        totalRentIncludingGst: math.totalRentIncludingGst,
        electricityBill: math.elec,
        wifiBill: math.wifi,
        sorterPayments: math.sorter,
        pettyCash: math.petty,
        total: finalTotal,
      };

      if (editingRent) {
        await financeApi.updateRent(editingRent.id, payload);
        success('Monthly Rent record updated successfully');
      } else {
        await financeApi.createRent(payload);
        success('Monthly Rent record saved successfully');
      }
      setIsRentModalOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.rents() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    } catch (err: any) {
      error('Failed to save record: ' + (err.message || 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRent = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this monthly rent record?')) return;
    try {
      await financeApi.deleteRent(id);
      success('Record deleted successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.rents() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    } catch (err: any) {
      error('Failed to delete: ' + (err.message || 'Error'));
    }
  };

  const rentMathLive = calcRentMath(rentForm);
  const revenueTotalLive = calcTotalRevenue(revenueForm);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header & Hub Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-apple-accent" />
            <span>{activeTab === 'REVENUE' ? 'Total Revenue' : 'Rent'}</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {activeTab === 'REVENUE'
              ? 'Manage annual Total Revenue statements and financial projections by Hub'
              : 'Manage monthly Rent ledgers with auto-calculated TDS (10%) and GST (18%)'}
          </p>
        </div>

        {/* Hub Selector Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/[0.04] dark:bg-white/[0.06] p-1.5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08]">
            <Building className="w-4 h-4 text-gray-400 ml-2" />
            <select
              value={selectedHubId}
              onChange={(e) => setSelectedHubId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none pr-3 cursor-pointer"
            >
              <option value="ALL">All Hubs / Portfolio</option>
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.erpName || h.name}{h.city ? ` - ${h.city}` : ''}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={activeTab === 'REVENUE' ? openCreateRevenueModal : openCreateRentModal}
            icon={<Plus className="w-4 h-4" />}
            className="rounded-xl shadow-apple-sm"
          >
            {activeTab === 'REVENUE' ? 'Add Total Revenue' : 'Add Rent'}
          </Button>
        </div>
      </div>

      {/* TAB 1: TOTAL REVENUE VIEW */}
      {activeTab === 'REVENUE' && (
        <div className="space-y-4 animate-fadeIn">
          {loading ? (
            <div className="py-20 text-center text-xs text-gray-400">
              <div className="w-6 h-6 border-2 border-apple-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading revenue records...
            </div>
          ) : revenueList.length === 0 ? (
            <Card className="p-12 text-center text-xs text-gray-400">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                No Total Revenue records found
              </p>
              <p className="mt-1">
                Enter your first annual financial statement for the selected Hub.
              </p>
              <Button
                onClick={openCreateRevenueModal}
                icon={<Plus className="w-4 h-4" />}
                size="sm"
                className="mt-4"
              >
                Add Total Revenue
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-apple-cardDark shadow-apple-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/[0.06] dark:border-white/[0.08] text-gray-500 font-semibold">
                      <th className="p-3.5">Hub Name</th>
                      <th className="p-3.5">Financial Year</th>
                      <th className="p-3.5 text-right">Rent</th>
                      <th className="p-3.5 text-right">Setup Cost / Mo</th>
                      <th className="p-3.5 text-right">Electricity</th>
                      <th className="p-3.5 text-right">WiFi</th>
                      <th className="p-3.5 text-right">Manpower</th>
                      <th className="p-3.5 text-right">Housekeeping</th>
                      <th className="p-3.5 text-right">WM & Petty Cash</th>
                      <th className="p-3.5 text-right font-bold text-apple-accent">Total Revenue</th>
                      <th className="p-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                    {revenueList.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="p-3.5 font-bold text-gray-900 dark:text-gray-100">
                          {item.hubName || `Hub #${item.hubId}`}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
                            {item.financialYear}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">{formatCurrency(item.rent)}</td>
                        <td className="p-3.5 text-right">{formatCurrency(item.setupCostPerMonth)}</td>
                        <td className="p-3.5 text-right">{formatCurrency(item.electricity)}</td>
                        <td className="p-3.5 text-right">{formatCurrency(item.wifi)}</td>
                        <td className="p-3.5 text-right">{formatCurrency(item.manpower)}</td>
                        <td className="p-3.5 text-right">{formatCurrency(item.housekeeping)}</td>
                        <td className="p-3.5 text-right">{formatCurrency(item.wmRefreshmentPettyCash)}</td>
                        <td className="p-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(item.totalRevenue)}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditRevenueModal(item)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRevenue(item.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-apple-danger hover:bg-apple-danger/10"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RENT VIEW */}
      {activeTab === 'RENT' && (
        <div className="space-y-4 animate-fadeIn">
          {loading ? (
            <div className="py-20 text-center text-xs text-gray-400">
              <div className="w-6 h-6 border-2 border-apple-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading rent ledgers...
            </div>
          ) : rentList.length === 0 ? (
            <Card className="p-12 text-center text-xs text-gray-400">
              <Receipt className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                No monthly Rent records found
              </p>
              <p className="mt-1">
                Enter your monthly rent breakdown with live TDS and GST computations.
              </p>
              <Button
                onClick={openCreateRentModal}
                icon={<Plus className="w-4 h-4" />}
                size="sm"
                className="mt-4"
              >
                Add Monthly Rent
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-apple-cardDark shadow-apple-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/[0.06] dark:border-white/[0.08] text-gray-500 font-semibold">
                      <th className="p-3">Hub</th>
                      <th className="p-3">Period</th>
                      <th className="p-3 text-right">Rent</th>
                      <th className="p-3 text-right">TDS (10%)</th>
                      <th className="p-3 text-right font-medium">After TDS</th>
                      <th className="p-3 text-right">GST (18%)</th>
                      <th className="p-3 text-right font-medium">Inc. GST</th>
                      <th className="p-3 text-right">Electricity</th>
                      <th className="p-3 text-right">WiFi</th>
                      <th className="p-3 text-right">Sorter</th>
                      <th className="p-3 text-right">Petty Cash</th>
                      <th className="p-3 text-right font-bold text-apple-accent">Total</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                    {rentList.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="p-3 font-bold text-gray-900 dark:text-gray-100">
                          {item.hubName || `Hub #${item.hubId}`}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                            {item.period}
                          </span>
                        </td>
                        <td className="p-3 text-right">{formatCurrency(item.rent)}</td>
                        <td className="p-3 text-right text-apple-danger font-mono">
                          {Number(item.tdsAmount) > 0 ? (
                            `-${formatCurrency(item.tdsAmount)}`
                          ) : (
                            <span className="text-gray-400 font-normal">₹0</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-medium text-gray-800 dark:text-gray-200">
                          {formatCurrency(item.totalRentAfterTds)}
                        </td>
                        <td className="p-3 text-right text-indigo-600 dark:text-indigo-400 font-mono">
                          {Number(item.gstAmount) > 0 ? (
                            `+${formatCurrency(item.gstAmount)}`
                          ) : (
                            <span className="text-gray-400 font-normal">₹0</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-medium text-gray-800 dark:text-gray-200">
                          {formatCurrency(item.totalRentIncludingGst)}
                        </td>
                        <td className="p-3 text-right">{formatCurrency(item.electricityBill)}</td>
                        <td className="p-3 text-right">{formatCurrency(item.wifiBill)}</td>
                        <td className="p-3 text-right">{formatCurrency(item.sorterPayments)}</td>
                        <td className="p-3 text-right">{formatCurrency(item.pettyCash)}</td>
                        <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditRentModal(item)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRent(item.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-apple-danger hover:bg-apple-danger/10"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOTAL REVENUE MODAL */}
      <Modal
        isOpen={isRevenueModalOpen}
        onClose={() => setIsRevenueModalOpen(false)}
        title={editingRevenue ? 'Edit Total Revenue' : 'Add Total Revenue (Yearly)'}
        description="Entered once per financial year per hub. Total Revenue is auto-calculated as the sum of all components."
        maxWidth="2xl"
      >
        <form onSubmit={handleRevenueSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Hub Facility" required>
              <Select
                value={revenueForm.hubId}
                onChange={(e) => setRevenueForm({ ...revenueForm, hubId: e.target.value })}
                required
              >
                <option value="">Select a Hub</option>
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.erpName || h.name}{h.city ? ` - ${h.city}` : ''}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Financial Year" required>
              <Select
                value={revenueForm.financialYear}
                onChange={(e) => setRevenueForm({ ...revenueForm, financialYear: e.target.value })}
                required
              >
                {FINANCIAL_YEARS.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Rent (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={revenueForm.rent}
                onChange={(e) => handleRevenueFieldChange('rent', e.target.value)}
              />
            </FormField>

            <FormField label="Setup Cost / Month (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={revenueForm.setupCostPerMonth}
                onChange={(e) => handleRevenueFieldChange('setupCostPerMonth', e.target.value)}
              />
            </FormField>

            <FormField label="Electricity (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={revenueForm.electricity}
                onChange={(e) => handleRevenueFieldChange('electricity', e.target.value)}
              />
            </FormField>

            <FormField label="WiFi (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={revenueForm.wifi}
                onChange={(e) => handleRevenueFieldChange('wifi', e.target.value)}
              />
            </FormField>

            <FormField label="Manpower (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={revenueForm.manpower}
                onChange={(e) => handleRevenueFieldChange('manpower', e.target.value)}
              />
            </FormField>

            <FormField label="Housekeeping (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={revenueForm.housekeeping}
                onChange={(e) => handleRevenueFieldChange('housekeeping', e.target.value)}
              />
            </FormField>

            <FormField label="WM Refreshment / Petty Cash (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={revenueForm.wmRefreshmentPettyCash}
                onChange={(e) => handleRevenueFieldChange('wmRefreshmentPettyCash', e.target.value)}
              />
            </FormField>
          </div>

          {/* Total Revenue Editable Field & Auto-Sum Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                    Total Revenue (₹)
                  </span>
                  <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                    Auto-calculated sum: {formatCurrency(revenueTotalLive)}. You can edit or enter any custom total directly below.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const liveSum = calcTotalRevenue(revenueForm);
                  setRevenueForm({ ...revenueForm, totalRevenue: String(liveSum) });
                }}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 transition-colors"
                title="Reset to calculated sum"
              >
                Reset to Sum
              </button>
            </div>

            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={revenueForm.totalRevenue}
              onChange={(e) => setRevenueForm({ ...revenueForm, totalRevenue: e.target.value })}
              className="font-extrabold text-emerald-700 dark:text-emerald-300 text-lg bg-white dark:bg-apple-cardDark border-emerald-300 dark:border-emerald-700"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRevenueModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
            >
              {editingRevenue ? 'Update Record' : 'Save Total Revenue'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* RENT MODAL */}
      <Modal
        isOpen={isRentModalOpen}
        onClose={() => setIsRentModalOpen(false)}
        title={editingRent ? 'Edit Monthly Rent' : 'Add Monthly Rent'}
        description="Enter monthly figures. TDS 10%, GST 18%, and Totals are computed live."
        maxWidth="2xl"
      >
        <form onSubmit={handleRentSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Hub Facility" required>
              <Select
                value={rentForm.hubId}
                onChange={(e) => setRentForm({ ...rentForm, hubId: e.target.value })}
                required
              >
                <option value="">Select a Hub</option>
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.erpName || h.name}{h.city ? ` - ${h.city}` : ''}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Month / Period (YYYY-MM)" required>
              <Input
                type="month"
                value={rentForm.period}
                onChange={(e) => setRentForm({ ...rentForm, period: e.target.value })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Base Rent (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 75000"
                value={rentForm.rent}
                onChange={(e) => handleRentFieldChange('rent', e.target.value)}
              />
            </FormField>

            <FormField label="Electricity Bill (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 12000"
                value={rentForm.electricityBill}
                onChange={(e) => handleRentFieldChange('electricityBill', e.target.value)}
              />
            </FormField>

            <FormField label="WiFi Bill (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 1500"
                value={rentForm.wifiBill}
                onChange={(e) => handleRentFieldChange('wifiBill', e.target.value)}
              />
            </FormField>

            <FormField label="Sorter Payments (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 5000"
                value={rentForm.sorterPayments}
                onChange={(e) => handleRentFieldChange('sorterPayments', e.target.value)}
              />
            </FormField>

            <FormField label="Petty Cash (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 2500"
                value={rentForm.pettyCash}
                onChange={(e) => handleRentFieldChange('pettyCash', e.target.value)}
              />
            </FormField>
          </div>

          {/* Gated Tax Toggles: TDS & GST */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08]">
            <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-apple-cardDark border border-black/[0.05] dark:border-white/[0.06] cursor-pointer hover:border-black/10 dark:hover:border-white/10 transition-all select-none">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <span>Apply TDS (10%)</span>
                  {rentForm.applyTds && (
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded">
                      Active
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-gray-400 block">Deduct 10% TDS from Base Rent</span>
              </div>
              <input
                type="checkbox"
                checked={rentForm.applyTds}
                onChange={(e) => handleToggleTds(e.target.checked)}
                className="w-4 h-4 rounded text-apple-accent focus:ring-apple-accent border-gray-300 dark:border-gray-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-apple-cardDark border border-black/[0.05] dark:border-white/[0.06] cursor-pointer hover:border-black/10 dark:hover:border-white/10 transition-all select-none">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <span>Apply GST (18%)</span>
                  {rentForm.applyGst && (
                    <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded">
                      Active
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-gray-400 block">Add 18% GST to Base Rent</span>
              </div>
              <input
                type="checkbox"
                checked={rentForm.applyGst}
                onChange={(e) => handleToggleGst(e.target.checked)}
                className="w-4 h-4 rounded text-apple-accent focus:ring-apple-accent border-gray-300 dark:border-gray-600 cursor-pointer"
              />
            </label>
          </div>

          {/* Live Auto Calculations Breakdown & Editable Total */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block border-b border-black/[0.06] dark:border-white/[0.08] pb-1.5 flex items-center justify-between">
              <span>Automatic Computations Breakdown</span>
              <span className="text-[10px] text-gray-400 font-normal">Formula Engine</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-apple-cardDark border border-black/[0.04] dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 block">TDS (10%)</span>
                  {!rentForm.applyTds && (
                    <span className="text-[9px] font-medium text-gray-400 bg-black/[0.04] dark:bg-white/[0.06] px-1.5 py-0.5 rounded">
                      Not applied
                    </span>
                  )}
                </div>
                <span className={`font-semibold font-mono ${rentForm.applyTds ? 'text-apple-danger' : 'text-gray-400 dark:text-gray-500'}`}>
                  {rentForm.applyTds ? formatCurrency(rentMathLive.tdsAmount) : '₹0'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-apple-cardDark border border-black/[0.04] dark:border-white/[0.06]">
                <span className="text-[10px] text-gray-400 block">Rent After TDS</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatCurrency(rentMathLive.totalRentAfterTds)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-apple-cardDark border border-black/[0.04] dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 block">GST (18%)</span>
                  {!rentForm.applyGst && (
                    <span className="text-[9px] font-medium text-gray-400 bg-black/[0.04] dark:border-white/[0.06] px-1.5 py-0.5 rounded">
                      Not applied
                    </span>
                  )}
                </div>
                <span className={`font-semibold font-mono ${rentForm.applyGst ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {rentForm.applyGst ? formatCurrency(rentMathLive.gstAmount) : '₹0'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-apple-cardDark border border-black/[0.04] dark:border-white/[0.06]">
                <span className="text-[10px] text-gray-400 block">Rent Inc. GST</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {formatCurrency(rentMathLive.totalRentIncludingGst)}
                </span>
              </div>
            </div>

            {/* Editable Rent Total / Grand Total */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                    Rent Total / Grand Total Payable (₹)
                  </span>
                  <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                    Formula Total: {formatCurrency(rentMathLive.total)}. You can edit or enter any custom total directly below.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const math = calcRentMath(rentForm);
                    setRentForm({ ...rentForm, total: String(math.total) });
                  }}
                  className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 transition-colors"
                  title="Reset to formula calculation"
                >
                  Reset to Formula
                </button>
              </div>

              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={rentForm.total}
                onChange={(e) => setRentForm({ ...rentForm, total: e.target.value })}
                className="font-extrabold text-emerald-700 dark:text-emerald-300 text-lg bg-white dark:bg-apple-cardDark border-emerald-300 dark:border-emerald-700"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
            >
              {editingRent ? 'Update Rent' : 'Save Monthly Rent'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
