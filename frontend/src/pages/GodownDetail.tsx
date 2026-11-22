import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import { STALE_TIMES } from '../api/queryClient';
import { PageSkeleton } from '../components/ui/Skeleton';
import {
  ArrowLeft,
  Warehouse,
  MapPin,
  Square,
  IndianRupee,
  ReceiptText,
  Users,
  Wrench,
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
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AdminPasswordModal } from '../components/common/AdminPasswordModal';
import {
  godownApi,
  assetApi,
  employeeApi,
} from '../services/api';
import { Godown, Asset, Staff } from '../types';

export const GodownDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'staff'>('overview');

  // TanStack Query: Independent tab and detail fetching with 5m cache
  const { data: godown, isLoading: isGodownLoading } = useQuery({
    queryKey: queryKeys.hubs.detail(id || ''),
    queryFn: () => godownApi.getById(id!),
    enabled: Boolean(id),
    staleTime: STALE_TIMES.STANDARD,
  });

  const { data: assets = [] } = useQuery({
    queryKey: queryKeys.assets.byHub(id || ''),
    queryFn: async () => {
      const res: any = await assetApi.getByGodown(id!);
      return Array.isArray(res) ? res : res?.content || [];
    },
    enabled: Boolean(id),
    staleTime: STALE_TIMES.STANDARD,
  });

  const { data: staffList = [] } = useQuery({
    queryKey: queryKeys.staff.byHub(id || ''),
    queryFn: async () => {
      const res: any = await employeeApi.getByGodown(id!);
      return Array.isArray(res) ? res : res?.content || [];
    },
    enabled: Boolean(id),
    staleTime: STALE_TIMES.STANDARD,
  });

  const loading = isGodownLoading && !godown;

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [showCctvPassword, setShowCctvPassword] = useState(false);
  const [revealedCctvPassword, setRevealedCctvPassword] = useState<string | null>(null);
  const [verifyingAction, setVerifyingAction] = useState<'view' | 'copy' | null>(null);
  const [copiedCctv, setCopiedCctv] = useState(false);

  const handleCopyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    setCopiedCctv(true);
    success('CCTV password copied to clipboard');
    setTimeout(() => setCopiedCctv(false), 2000);
  };

  const handlePasswordAction = (action: 'view' | 'copy') => {
    if (!isAdmin) {
      error('Access restricted: Only Administrators can view or copy CCTV credentials.');
      return;
    }

    if (revealedCctvPassword !== null) {
      if (action === 'view') {
        setShowCctvPassword((prev) => !prev);
      } else {
        handleCopyPassword(revealedCctvPassword);
      }
      return;
    }

    setVerifyingAction(action);
  };

  const handleAdminVerify = async (adminPassword: string): Promise<boolean> => {
    if (!id) return false;
    try {
      const res: any = await godownApi.revealCctvPassword(id, adminPassword);
      const plainPassword = res?.cctvPassword || '';
      setRevealedCctvPassword(plainPassword);

      if (verifyingAction === 'view') {
        setShowCctvPassword(true);
      } else {
        handleCopyPassword(plainPassword);
      }
      return true;
    } catch (err: any) {
      throw new Error(err.message || 'Incorrect administrator password.');
    }
  };

  if (loading || !godown) {
    return (
      <div className="space-y-6">
        <PageSkeleton />
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
          {godown.code && (
            <Badge variant="accent" size="sm" className="font-mono font-bold tracking-wider">
              {godown.code}
            </Badge>
          )}
          {godown.hubModel && (
            <Badge variant="neutral" size="sm">
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
          { key: 'assets', label: `Equipment (${assets.length})`, icon: Wrench },
          { key: 'staff', label: `Staff (${staffList.length})`, icon: Users },
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
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 block">Password:</span>
                    {!isAdmin && (
                      <span className="text-[9px] px-1.5 py-0.5 font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 rounded">
                        Admin Only
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-1.5 rounded-xl font-mono">
                    <span>
                      {showCctvPassword
                        ? revealedCctvPassword || godown.cctvPassword || 'None'
                        : godown.cctvPassword ? '••••••••••••' : 'None'}
                    </span>
                    {godown.cctvPassword && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handlePasswordAction('view')}
                          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          title={
                            !isAdmin
                              ? 'Protected: Only Administrators can view passwords'
                              : showCctvPassword
                              ? 'Hide password'
                              : 'Verify Admin Password to View'
                          }
                        >
                          {!isAdmin ? (
                            <EyeOff className="w-3.5 h-3.5 opacity-50" />
                          ) : showCctvPassword ? (
                            <EyeOff className="w-3.5 h-3.5 text-[#0071E3]" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePasswordAction('copy')}
                          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          title={
                            !isAdmin
                              ? 'Protected: Only Administrators can copy passwords'
                              : 'Verify Admin Password to Copy'
                          }
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

      {/* Admin Verification Modal for Viewing / Copying CCTV Password */}
      <AdminPasswordModal
        isOpen={Boolean(verifyingAction)}
        onClose={() => setVerifyingAction(null)}
        onConfirm={handleAdminVerify}
        title="Administrator Verification Required"
        description={`Enter your administrator account password to access protected CCTV credentials for ${godown?.erpName || godown?.name || 'this facility'}.`}
        actionLabel={verifyingAction === 'copy' ? 'Verify & Copy' : 'Verify & Reveal'}
      />
    </div>
  );
};
