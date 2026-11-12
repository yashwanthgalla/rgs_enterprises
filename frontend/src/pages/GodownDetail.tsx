import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Warehouse,
  MapPin,
  Square,
  IndianRupee,
  ReceiptText,
  Receipt,
  Users,
  Wrench,
  FolderLock,
  Plus,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  ExternalLink,
  Wifi,
  Video,
  FileCheck2,
  Zap,
  UserCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Input, Select } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import {
  godownApi,
  rentApi,
  expenseApi,
  assetApi,
  employeeApi,
  documentApi,
} from '../services/api';
import { Godown, RentEntry, Expense, Asset, Staff, DocumentItem } from '../types';

export const GodownDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const { success, error } = useToast();

  const [godown, setGodown] = useState<Godown | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rent' | 'expenses' | 'assets' | 'staff' | 'documents'>('overview');
  const [loading, setLoading] = useState(true);

  // Tab Data States
  const [rents, setRents] = useState<RentEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);

  // Modals
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [rentFormData, setRentFormData] = useState({
    amountDue: '',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    dueDate: new Date().toISOString().slice(0, 10),
    tenantName: '',
  });

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    title: '',
    category: 'ELECTRICITY',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    billResponsibility: 'COMPANY',
    status: 'PENDING',
  });

  const [submitting, setSubmitting] = useState(false);
  const [showCctvPassword, setShowCctvPassword] = useState(false);
  const [copiedCctv, setCopiedCctv] = useState(false);

  const handleCopyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    setCopiedCctv(true);
    success('CCTV password copied to clipboard');
    setTimeout(() => setCopiedCctv(false), 2000);
  };

  useEffect(() => {
    if (!id) return;

    const loadAllDetails = async () => {
      setLoading(true);
      try {
        const [gRes, rRes, eRes, aRes, sRes, dRes] = await Promise.allSettled([
          godownApi.getById(id),
          rentApi.getByGodown(id),
          expenseApi.getByGodown(id),
          assetApi.getByGodown(id),
          employeeApi.getByGodown(id),
          documentApi.getByGodown(id),
        ]);

        if (gRes.status === 'fulfilled') setGodown(gRes.value as any);
        if (rRes.status === 'fulfilled') setRents(Array.isArray(rRes.value) ? rRes.value : (rRes.value as any)?.content || []);
        if (eRes.status === 'fulfilled') setExpenses(Array.isArray(eRes.value) ? eRes.value : (eRes.value as any)?.content || []);
        if (aRes.status === 'fulfilled') setAssets(Array.isArray(aRes.value) ? aRes.value : (aRes.value as any)?.content || []);
        if (sRes.status === 'fulfilled') setStaffList(Array.isArray(sRes.value) ? sRes.value : (sRes.value as any)?.content || []);
        if (dRes.status === 'fulfilled') setDocs(Array.isArray(dRes.value) ? dRes.value : (dRes.value as any)?.content || []);
      } catch (err: any) {
        error('Failed to load facility data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAllDetails();
  }, [id]);

  const handleCreateRent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !godown) return;

    setSubmitting(true);
    try {
      const year = parseInt(rentFormData.month.split('-')[0], 10);
      await rentApi.create({
        godownId: Number(id),
        tenantName: rentFormData.tenantName || godown.currentTenant || 'Tenant',
        month: rentFormData.month,
        year: year,
        amountDue: Number(rentFormData.amountDue),
        dueDate: rentFormData.dueDate,
        status: 'DUE',
      });
      success('Rent invoice generated');
      setIsRentModalOpen(false);
      const updated = await rentApi.getByGodown(id);
      setRents(Array.isArray(updated) ? updated : (updated as any)?.content || []);
    } catch (err: any) {
      error(err.message || 'Failed to generate rent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSubmitting(true);
    try {
      await expenseApi.create({
        godownId: Number(id),
        title: expenseFormData.title,
        category: expenseFormData.category,
        amount: Number(expenseFormData.amount),
        expenseDate: expenseFormData.expenseDate,
        billResponsibility: expenseFormData.billResponsibility,
        status: expenseFormData.status,
      });
      success('Bill recorded');
      setIsExpenseModalOpen(false);
      const updated = await expenseApi.getByGodown(id);
      setExpenses(Array.isArray(updated) ? updated : (updated as any)?.content || []);
    } catch (err: any) {
      error(err.message || 'Failed to record bill');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !godown) {
    return (
      <div className="py-24 text-center text-xs text-gray-400">
        <div className="w-8 h-8 border-2 border-apple-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading facility details...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/hubs')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            All Hubs
          </Button>
          <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {godown.erpName || godown.name}
          </h1>
          {godown.hubModel && (
            <Badge variant="accent" size="sm">
              Model: {godown.hubModel}
            </Badge>
          )}
          <Badge
            variant={
              godown.hubStatus === 'ACTIVE' || godown.status === 'ACTIVE'
                ? 'success'
                : godown.hubStatus === 'UNDER_MAINTENANCE' || godown.status === 'MAINTENANCE'
                ? 'warning'
                : 'neutral'
            }
            size="sm"
          >
            {godown.hubStatus || godown.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/rent')}
            icon={<IndianRupee className="w-3.5 h-3.5" />}
          >
            Finance Rent
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsExpenseModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Bill
          </Button>
        </div>
      </div>

      {/* Facility Header Card */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Hub Facility</span>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-1 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-apple-accent shrink-0" />
              <span className="truncate">{godown.erpName || godown.name}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1 truncate">
              {godown.locationAddress || godown.address || godown.location}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Total Capacity</span>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
              {(godown.totalCapacity || godown.capacitySqFt || 0).toLocaleString('en-IN')}
              <span className="text-xs font-normal text-gray-400 ml-1">sq.ft</span>
            </p>
            {godown.hubModel && (
              <span className="inline-block mt-1 text-[11px] font-semibold text-apple-accent bg-apple-accent/10 px-2 py-0.5 rounded-md">
                Model: {godown.hubModel}
              </span>
            )}
          </div>

          <div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Current Tenant</span>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-1">
              {godown.currentTenant || <span className="italic text-gray-400 font-normal">Vacant</span>}
            </p>
            {godown.hubPocName && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 truncate">
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span>POC: {godown.hubPocName} {godown.hubPocContact ? `(${godown.hubPocContact})` : ''}</span>
              </p>
            )}
          </div>

          <div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Monthly Rent</span>
            <p className="text-xl font-extrabold text-gray-900 dark:text-gray-100 mt-1">
              {formatCurrency(godown.monthlyRent || 0)}
              <span className="text-xs font-normal text-gray-400"> / mo</span>
            </p>
            {godown.googleLocation && (
              <a
                href={godown.googleLocation}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-apple-accent hover:underline mt-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Open Google Location</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex border-b border-black/[0.08] dark:border-white/[0.08] gap-6 text-sm font-medium overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview', icon: Warehouse },
          { key: 'rent', label: `Rent Roll (${rents.length})`, icon: ReceiptText },
          { key: 'expenses', label: `Operating Bills (${expenses.length})`, icon: Receipt },
          { key: 'assets', label: `Equipment (${assets.length})`, icon: Wrench },
          { key: 'staff', label: `Staff (${staffList.length})`, icon: Users },
          { key: 'documents', label: `Vault (${docs.length})`, icon: FolderLock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 flex items-center gap-2 border-b-2 font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'border-apple-accent text-apple-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Panes */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Row 1: Hub Info, Lease & Operations, Financial Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Section 1: Hub Information */}
            <Card className="p-6">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Building className="w-4 h-4 text-apple-accent" />
                <span>Hub Information</span>
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-gray-400">ERP Name:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{godown.erpName || godown.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-gray-400">Hub Model:</span>
                  <span className="font-medium">{godown.hubModel || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-gray-400">Hub Status:</span>
                  <Badge variant={godown.hubStatus === 'ACTIVE' || godown.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                    {godown.hubStatus || godown.status}
                  </Badge>
                </div>
                <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-gray-400">Total Capacity:</span>
                  <span className="font-medium">{(godown.totalCapacity || godown.capacitySqFt || 0).toLocaleString('en-IN')} sq.ft</span>
                </div>
                <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-gray-400">Current Tenant:</span>
                  <span className="font-semibold text-apple-accent">{godown.currentTenant || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-gray-400">Hub POC Name:</span>
                  <span className="font-medium">{godown.hubPocName || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-gray-400">Hub POC Contact:</span>
                  <span className="font-medium">{godown.hubPocContact || 'N/A'}</span>
                </div>
                {godown.googleLocation && (
                  <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                    <span className="text-gray-400">Google Location:</span>
                    <a
                      href={godown.googleLocation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-apple-accent hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>View Map</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                <div className="pt-1">
                  <span className="text-gray-400 block mb-1">Location Address:</span>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-black/[0.02] dark:bg-white/[0.02] p-2 rounded-xl">
                    {godown.locationAddress || godown.address || 'N/A'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Section 2 & 3: Lease & Operations Information */}
            <div className="space-y-6">
              {/* Lease Information */}
              <Card className="p-6">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>Lease Information</span>
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                    <span className="text-gray-400">Lease Start Date:</span>
                    <span className="font-medium">{godown.leaseStartDate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                    <span className="text-gray-400">Lease End Date:</span>
                    <span className="font-medium">{godown.leaseEndDate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                    <span className="text-gray-400">Total Duration:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {godown.leaseDurationMonths ? `${godown.leaseDurationMonths} Months` : 'N/A'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Operations Information */}
              <Card className="p-6">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  <span>Operations Information</span>
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                    <span className="text-gray-400">Operations POC:</span>
                    <span className="font-medium">{godown.operationsPocName || godown.opsPocName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                    <span className="text-gray-400">POC Mobile:</span>
                    <span className="font-medium">{godown.operationsPocMobile || godown.opsPocMobile || 'N/A'}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Section 8: Financial Information */}
            <Card className="p-6">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <span>Financial Information</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06]">
                  <span className="text-gray-400 block text-[11px]">Monthly Rent</span>
                  <span className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
                    {formatCurrency(godown.monthlyRent || 0)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06]">
                  <span className="text-gray-400 block text-[11px]">Total Setup Cost</span>
                  <span className="text-base font-bold text-gray-800 dark:text-gray-200">
                    {formatCurrency(godown.totalSetupCost || 0)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06]">
                  <span className="text-gray-400 block text-[11px]">Refundable Advance (Deposit)</span>
                  <span className="text-base font-bold text-gray-800 dark:text-gray-200">
                    {formatCurrency(godown.refundableAdvance || godown.securityAdvance || 0)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Row 2: CCTV Credentials, Licences, Electricity & Lease Contact */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Section 5: CCTV Details */}
            <Card className="p-6">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Video className="w-4 h-4 text-blue-500" />
                <span>CCTV Access Details</span>
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-gray-400">Username:</span>
                  <span className="font-mono font-semibold">{godown.cctvUsername || 'N/A'}</span>
                </div>
                <div className="py-1 border-b border-black/[0.04] dark:border-white/[0.04] space-y-1">
                  <span className="text-gray-400 block">Password:</span>
                  <div className="flex items-center justify-between bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-1.5 rounded-xl font-mono">
                    <span>
                      {showCctvPassword
                        ? godown.cctvPassword || 'None'
                        : godown.cctvPassword ? '••••••••••••' : 'None'}
                    </span>
                    {godown.cctvPassword && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowCctvPassword(!showCctvPassword)}
                          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          title={showCctvPassword ? 'Hide password' : 'Show password'}
                        >
                          {showCctvPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(godown.cctvPassword || '')}
                          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          title="Copy password"
                        >
                          {copiedCctv ? <Check className="w-3.5 h-3.5 text-apple-success" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="py-1">
                  <span className="text-gray-400 block mb-1">Access URL / IP:</span>
                  {godown.cctvAccessUrl ? (
                    <a
                      href={godown.cctvAccessUrl.startsWith('http') ? godown.cctvAccessUrl : `http://${godown.cctvAccessUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-apple-accent hover:underline flex items-center gap-1 break-all font-mono text-[11px]"
                    >
                      <span className="truncate">{godown.cctvAccessUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">N/A</span>
                  )}
                </div>
              </div>
            </Card>

            {/* Section 6 & 7: Licences & Compliance */}
            <Card className="p-6">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <FileCheck2 className="w-4 h-4 text-purple-500" />
                <span>Licences & Compliance</span>
              </h3>
              <div className="space-y-4 text-xs">
                {/* Labour Licence */}
                <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Labour Licence</span>
                    <Badge variant={godown.hasLabourLicence ? 'success' : 'neutral'} size="sm">
                      {godown.hasLabourLicence ? 'Available' : 'Not Available'}
                    </Badge>
                  </div>
                  {godown.hasLabourLicence && (
                    <div className="text-[11px] text-gray-500 pt-1 flex justify-between border-t border-black/[0.04] dark:border-white/[0.04]">
                      <span>Valid: {godown.labourLicenceStartDate || 'N/A'}</span>
                      <span className="font-medium text-apple-accent">Exp: {godown.labourLicenceExpiryDate || 'N/A'}</span>
                    </div>
                  )}
                </div>

                {/* Trade Licence */}
                <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Trade Licence</span>
                    <Badge variant={godown.hasTradeLicence ? 'success' : 'neutral'} size="sm">
                      {godown.hasTradeLicence ? 'Available' : 'Not Available'}
                    </Badge>
                  </div>
                  {godown.hasTradeLicence && (
                    <div className="text-[11px] text-gray-500 pt-1 flex justify-between border-t border-black/[0.04] dark:border-white/[0.04]">
                      <span>Valid: {godown.tradeLicenceStartDate || 'N/A'}</span>
                      <span className="font-medium text-apple-accent">Exp: {godown.tradeLicenceExpiryDate || 'N/A'}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Section 9 & 10: Electricity & Lease Contact */}
            <div className="space-y-6">
              {/* Electricity */}
              <Card className="p-6">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Electricity Information</span>
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                    <span className="text-gray-400">Provider:</span>
                    <span className="font-medium">{godown.electricityProvider || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                    <span className="text-gray-400">Service Number:</span>
                    <span className="font-mono font-medium">{godown.electricityServiceNumber || 'N/A'}</span>
                  </div>
                </div>
              </Card>

              {/* Lease Contact & Owner */}
              <Card className="p-6">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Phone className="w-4 h-4 text-rose-500" />
                  <span>Lease Contact & Owner</span>
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                    <span className="text-gray-400">Contact Person:</span>
                    <span className="font-medium">{godown.leaseContactName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                    <span className="text-gray-400">Contact Mobile:</span>
                    <span className="font-medium">{godown.leaseContactMobile || 'N/A'}</span>
                  </div>
                  <div className="pt-1">
                    <span className="text-gray-400 block mb-1">Owner Address:</span>
                    <p className="text-gray-700 dark:text-gray-300 bg-black/[0.02] dark:bg-white/[0.02] p-2 rounded-xl">
                      {godown.ownerAddress || 'N/A'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Row 3: Broadband Details (Dynamic Connections) */}
          <Card className="p-6">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Wifi className="w-4 h-4 text-cyan-500" />
              <span>Broadband Connections ({Array.isArray(godown.broadbandDetails) ? godown.broadbandDetails.length : 0})</span>
            </h3>

            {!Array.isArray(godown.broadbandDetails) || godown.broadbandDetails.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                No broadband connections configured for this facility.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {godown.broadbandDetails.map((bb, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-2">
                      <span className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5 text-cyan-500" />
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
                        <span className="font-medium">{bb.registeredMobileNumber || bb.registeredMobile || 'N/A'}</span>
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
            )}
          </Card>
        </div>
      )}

      {activeTab === 'rent' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Rent Records</h3>
            <Button
              size="sm"
              onClick={() => setIsRentModalOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Generate Rent Due
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase font-semibold">
                  <th className="py-2.5 px-2">Month</th>
                  <th className="py-2.5 px-2">Tenant</th>
                  <th className="py-2.5 px-2">Due Date</th>
                  <th className="py-2.5 px-2">Amount Due</th>
                  <th className="py-2.5 px-2">Amount Paid</th>
                  <th className="py-2.5 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                {rents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No rent records logged for this godown yet.
                    </td>
                  </tr>
                ) : (
                  rents.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 px-2 font-semibold">{r.month}</td>
                      <td className="py-2.5 px-2">{r.tenantName}</td>
                      <td className="py-2.5 px-2 text-gray-500">{r.dueDate}</td>
                      <td className="py-2.5 px-2 font-medium">{formatCurrency(r.amountDue)}</td>
                      <td className="py-2.5 px-2 text-apple-success font-medium">{formatCurrency(r.amountPaid)}</td>
                      <td className="py-2.5 px-2">
                        <Badge
                          variant={r.status === 'PAID' ? 'success' : r.status === 'OVERDUE' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'expenses' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Operating Expenses & Utility Bills</h3>
            <Button
              size="sm"
              onClick={() => setIsExpenseModalOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Bill
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase font-semibold">
                  <th className="py-2.5 px-2">Title</th>
                  <th className="py-2.5 px-2">Category</th>
                  <th className="py-2.5 px-2">Date</th>
                  <th className="py-2.5 px-2">Amount</th>
                  <th className="py-2.5 px-2">Payer</th>
                  <th className="py-2.5 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No operating bills logged for this godown.
                    </td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2.5 px-2 font-semibold">{e.title}</td>
                      <td className="py-2.5 px-2 text-gray-500">{e.category}</td>
                      <td className="py-2.5 px-2">{e.expenseDate}</td>
                      <td className="py-2.5 px-2 font-medium">{formatCurrency(e.amount)}</td>
                      <td className="py-2.5 px-2">
                        <Badge variant={e.billResponsibility === 'TENANT' ? 'accent' : 'neutral'} size="sm">
                          {e.billResponsibility}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2">
                        <Badge variant={e.status === 'PAID' ? 'success' : 'warning'} size="sm">
                          {e.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'assets' && (
        <Card className="p-6">
          <h3 className="font-semibold text-sm mb-4">Equipment & Assets Registered</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-gray-400">
                No equipment registered for this godown.
              </div>
            ) : (
              assets.map((a) => (
                <div key={a.id} className="p-4 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{a.name}</span>
                    <Badge variant={a.status === 'OPERATIONAL' ? 'success' : 'warning'} size="sm">
                      {a.status}
                    </Badge>
                  </div>
                  <p className="text-gray-400 mt-1">Category: {a.category}</p>
                  {a.serialNumber && <p className="text-gray-400">S/N: {a.serialNumber}</p>}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {activeTab === 'staff' && (
        <Card className="p-6">
          <h3 className="font-semibold text-sm mb-4">Assigned Personnel</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffList.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-gray-400">
                No staff members currently assigned to this godown.
              </div>
            ) : (
              staffList.map((s) => (
                <div key={s.id} className="p-4 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{s.fullName}</span>
                    <Badge variant={s.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                      {s.status}
                    </Badge>
                  </div>
                  <p className="text-gray-400 mt-1">Designation: {s.role}</p>
                  <p className="text-gray-400">Phone: {s.phoneNumber}</p>
                  <p className="font-medium mt-1">Salary: {formatCurrency(s.monthlySalary)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card className="p-6">
          <h3 className="font-semibold text-sm mb-4">Facility Documents & Vault</h3>
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.06] text-xs">
            {docs.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                No documents uploaded for this godown yet.
              </div>
            ) : (
              docs.map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{d.title}</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">{d.documentType} • {d.fileName}</p>
                  </div>
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-apple-accent hover:underline font-semibold"
                  >
                    Download
                  </a>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Add Rent Due Modal */}
      <Modal
        isOpen={isRentModalOpen}
        onClose={() => setIsRentModalOpen(false)}
        title="Generate Rent Invoice"
        description="Schedule a monthly rental invoice for this godown's tenant."
      >
        <form onSubmit={handleCreateRent} className="space-y-4">
          <FormField label="Tenant Name" required>
            <Input
              value={rentFormData.tenantName}
              onChange={(e) => setRentFormData({ ...rentFormData, tenantName: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Billing Month" required>
              <Input
                type="month"
                value={rentFormData.month}
                onChange={(e) => setRentFormData({ ...rentFormData, month: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Due Date" required>
              <Input
                type="date"
                value={rentFormData.dueDate}
                onChange={(e) => setRentFormData({ ...rentFormData, dueDate: e.target.value })}
                required
              />
            </FormField>
          </div>

          <FormField label="Amount Due (₹)" required>
            <Input
              type="number"
              value={rentFormData.amountDue}
              onChange={(e) => setRentFormData({ ...rentFormData, amountDue: e.target.value })}
              required
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button type="button" variant="outline" onClick={() => setIsRentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Generate Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Bill Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Record Operating Bill"
        description="Log an electricity, tax, or maintenance expense for this facility."
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <FormField label="Bill Title" required>
            <Input
              placeholder="e.g. TSSPDCL Commercial Electricity - Oct 2026"
              value={expenseFormData.title}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, title: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <Select
                value={expenseFormData.category}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
              >
                <option value="ELECTRICITY">Electricity</option>
                <option value="WATER">Water</option>
                <option value="PROPERTY_TAX">Property Tax</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="SECURITY">Security</option>
                <option value="OTHER">Other</option>
              </Select>
            </FormField>

            <FormField label="Amount (₹)" required>
              <Input
                type="number"
                value={expenseFormData.amount}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Expense Date" required>
              <Input
                type="date"
                value={expenseFormData.expenseDate}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, expenseDate: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Billed To">
              <Select
                value={expenseFormData.billResponsibility}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, billResponsibility: e.target.value })}
              >
                <option value="COMPANY">Company (Owner)</option>
                <option value="TENANT">Tenant Reimbursement</option>
              </Select>
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Bill
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
