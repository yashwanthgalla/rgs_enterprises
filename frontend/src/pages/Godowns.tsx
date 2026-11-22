import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryClient, STALE_TIMES } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import {
  Warehouse,
  Plus,
  Search,
  Filter,
  MapPin,
  Square,
  Users,
  IndianRupee,
  ExternalLink,
  Edit,
  Trash2,
  Wifi,
  Video,
  FileCheck,
  Calendar,
  Zap,
  Phone,
  ShieldCheck,
  Building,
  Clock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  FileText,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Input, Select, Textarea } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { godownApi, financeApi } from '../services/api';
import { Godown, BroadbandConnection } from '../types';

const HUB_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
  { value: 'YET_TO_LIVE', label: 'Yet to Live' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'TERMINATED', label: 'Terminated' },
];

const HUB_MODEL_OPTIONS = [
  { value: 'LDP', label: 'LDP' },
  { value: 'OSH', label: 'OSH' },
  { value: 'ISH', label: 'ISH' },
];

const INDIAN_STATES = [
  'Telangana',
  'Andhra Pradesh',
  'Karnataka',
  'Tamil Nadu',
  'Maharashtra',
  'Kerala',
  'Gujarat',
  'Delhi',
  'Uttar Pradesh',
  'West Bengal',
  'Rajasthan',
  'Madhya Pradesh',
  'Bihar',
  'Punjab',
  'Haryana',
  'Odisha',
  'Assam',
  'Jharkhand',
  'Chhattisgarh',
  'Uttarakhand',
  'Himachal Pradesh',
  'Goa',
  'Tripura',
  'Meghalaya',
  'Manipur',
  'Nagaland',
  'Mizoram',
  'Sikkim',
  'Arunachal Pradesh',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
  'Chandigarh',
] as const;

const STATE_CODE_PREFIXES: Record<string, string> = {
  telangana: 'TS',
  telengana: 'TS',
  'andhra pradesh': 'AP',
  karnataka: 'KA',
  'tamil nadu': 'TN',
  maharashtra: 'MH',
  kerala: 'KL',
  gujarat: 'GJ',
  delhi: 'DL',
  'uttar pradesh': 'UP',
  'west bengal': 'WB',
  rajasthan: 'RJ',
  'madhya pradesh': 'MP',
  bihar: 'BR',
  punjab: 'PB',
  haryana: 'HR',
  odisha: 'OD',
  orissa: 'OD',
  assam: 'AS',
  jharkhand: 'JH',
  chhattisgarh: 'CG',
  uttarakhand: 'UK',
  'himachal pradesh': 'HP',
  goa: 'GA',
  tripura: 'TR',
  meghalaya: 'ML',
  manipur: 'MN',
  nagaland: 'NL',
  mizoram: 'MZ',
  sikkim: 'SK',
  'arunachal pradesh': 'AR',
  'jammu and kashmir': 'JK',
  ladakh: 'LA',
  puducherry: 'PY',
  chandigarh: 'CH',
};

const getStatePrefix = (stateName: string): string => {
  if (!stateName) return 'TS';
  const clean = stateName.trim().toLowerCase();
  if (STATE_CODE_PREFIXES[clean]) return STATE_CODE_PREFIXES[clean];
  if (clean.includes('telen') || clean.includes('telan')) return 'TS';
  if (clean.includes('andhra')) return 'AP';
  const letters = stateName.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return letters.slice(0, 2) || 'TS';
};

const computeNextHubCode = (
  stateName: string,
  existingGodowns: Array<{ id?: number | string; code?: string; state?: string }>,
  excludeId?: number | string
): string => {
  const prefix = getStatePrefix(stateName) + '#';
  const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
  const usedNumbers = new Set<number>();

  for (const g of existingGodowns) {
    if (excludeId && String(g.id) === String(excludeId)) continue;
    const code = (g.code || '').trim();
    if (!code) continue;
    const match = code.match(regex);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n)) {
        usedNumbers.add(n);
      }
    } else if (g.state && g.state.trim().toLowerCase() === stateName.trim().toLowerCase()) {
      const m2 = code.match(/(\d+)$/);
      if (m2) {
        const n = parseInt(m2[1], 10);
        if (!isNaN(n)) {
          usedNumbers.add(n);
        }
      }
    }
  }

  let candidate = 1;
  while (usedNumbers.has(candidate)) {
    candidate++;
  }
  return `${prefix}${String(candidate).padStart(2, '0')}`;
};

const calculateMonths = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;

  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  const days = end.getDate() - start.getDate();
  let total = years * 12 + months;
  if (days >= 15) {
    total += 1;
  }
  return Math.max(0, total);
};

const generateGoogleMapsUrl = (address: string): string => {
  const clean = address.trim();
  if (!clean) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
};

export const Godowns: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';
  const { formatCurrency } = useSettings();
  const { success, error } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGodown, setEditingGodown] = useState<Godown | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCustomGoogleLocation, setIsCustomGoogleLocation] = useState(false);

  // Add / Edit Form State matching all 10 sections
  const [formData, setFormData] = useState({
    // 1. Hub Information
    name: '', // ERP Name (required)
    code: '', // Sequential Hub Code e.g. TS#01
    state: 'Telangana', // Required Indian State
    city: 'Hyderabad', // Required accurate location city
    hubPocName: '', // Required
    hubPocContact: '', // Phone (10 digits, required)
    capacitySqFt: '', // Total Capacity (optional)
    currentTenant: '', // Mandatory
    status: 'ACTIVE', // Hub Status (required)
    hubModel: 'LDP', // Hub Model (required)
    googleLocation: '', // URL (required)
    location: '', // Location Address (required)

    // 2. Lease Information
    leaseStartDate: '',
    leaseEndDate: '',
    leaseDurationMonths: 0,

    // 3. Operations Information
    operationsPocName: '', // Required
    operationsPocMobile: '', // 10 digits

    // 4. CCTV Details
    cctvUsername: '',
    cctvPassword: '',
    cctvAccessUrl: '',

    // 5. Labour Licence
    hasLabourLicence: false,
    labourLicenceStartDate: '',
    labourLicenceExpiryDate: '',

    // 6. Trade Licence
    hasTradeLicence: false,
    tradeLicenceStartDate: '',
    tradeLicenceExpiryDate: '',

    // 7. Financial Information (non-negative, 2 decimals)
    totalSetupCost: '',
    securityAdvance: '', // Refundable Advance Amount
    monthlyRent: '',

    // 8. Lease Contact and Owner Information
    leaseContactName: '',
    leaseContactMobile: '',
    ownerAddress: '',

    // Additional remarks
    notes: '',
  });

  const [showDeleted, setShowDeleted] = useState(false);

  const hubsQuery = useQuery({
    queryKey: queryKeys.hubs.list({ page: 0, size: 100, showDeleted }),
    queryFn: async () => {
      const res: any = await godownApi.getAll(0, 100, true, { show_deleted: showDeleted ? 'true' : 'false' });
      return Array.isArray(res) ? res : res?.content || [];
    },
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });

  const godowns: Godown[] = Array.isArray(hubsQuery.data)
    ? hubsQuery.data
    : (hubsQuery.data as any)?.content || [];
  const isHubsLoading = hubsQuery.isLoading;
  const refetchGodowns = hubsQuery.refetch;
  const loading = isHubsLoading && godowns.length === 0;

  const openCreateModal = () => {
    setEditingGodown(null);
    setShowPassword(false);
    setIsCustomGoogleLocation(false);
    const initialCode = computeNextHubCode('Telangana', godowns);
    setFormData({
      name: '',
      code: initialCode,
      state: 'Telangana',
      city: 'Hyderabad',
      hubPocName: '',
      hubPocContact: '',
      capacitySqFt: '',
      currentTenant: '',
      status: 'ACTIVE',
      hubModel: 'LDP',
      googleLocation: '',
      location: '',
      leaseStartDate: '',
      leaseEndDate: '',
      leaseDurationMonths: 0,
      operationsPocName: '',
      operationsPocMobile: '',
      cctvUsername: '',
      cctvPassword: '',
      cctvAccessUrl: '',
      hasLabourLicence: false,
      labourLicenceStartDate: '',
      labourLicenceExpiryDate: '',
      hasTradeLicence: false,
      tradeLicenceStartDate: '',
      tradeLicenceExpiryDate: '',
      totalSetupCost: '',
      securityAdvance: '',
      monthlyRent: '',
      leaseContactName: '',
      leaseContactMobile: '',
      ownerAddress: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleStateChange = (selectedState: string) => {
    const nextCode = computeNextHubCode(selectedState, godowns, editingGodown?.id);
    setFormData((prev) => ({
      ...prev,
      state: selectedState,
      code: nextCode,
    }));
  };

  const openEditModal = (g: Godown, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGodown(g);
    setShowPassword(false);
    const existingLoc = g.address || g.locationAddress || g.location || '';
    const autoGen = generateGoogleMapsUrl(existingLoc);
    setIsCustomGoogleLocation(Boolean(g.googleLocation && g.googleLocation !== autoGen));
    const duration = g.leaseDurationMonths || calculateMonths(g.leaseStartDate || '', g.leaseEndDate || '');
    setFormData({
      name: g.erpName || g.name || '',
      code: g.code || computeNextHubCode(g.state || 'Telangana', godowns, g.id),
      state: g.state || 'Telangana',
      city: g.city || '',
      hubPocName: g.hubPocName || '',
      hubPocContact: g.hubPocContact || '',
      capacitySqFt: g.capacitySqFt ? String(g.capacitySqFt) : (g.totalCapacity ? String(g.totalCapacity) : ''),
      currentTenant: g.currentTenant || '',
      status: g.status || 'ACTIVE',
      hubModel: g.hubModel || 'LDP',
      googleLocation: g.googleLocation || '',
      location: g.address || g.locationAddress || g.location || '',
      leaseStartDate: g.leaseStartDate || '',
      leaseEndDate: g.leaseEndDate || '',
      leaseDurationMonths: duration,
      operationsPocName: g.operationsPocName || g.opsPocName || '',
      operationsPocMobile: g.operationsPocMobile || g.opsPocMobile || '',
      cctvUsername: g.cctvUsername || '',
      cctvPassword: g.cctvPassword || '',
      cctvAccessUrl: g.cctvAccessUrl || '',
      hasLabourLicence: Boolean(g.hasLabourLicence),
      labourLicenceStartDate: g.labourLicenceStartDate || '',
      labourLicenceExpiryDate: g.labourLicenceExpiryDate || '',
      hasTradeLicence: Boolean(g.hasTradeLicence),
      tradeLicenceStartDate: g.tradeLicenceStartDate || '',
      tradeLicenceExpiryDate: g.tradeLicenceExpiryDate || '',
      totalSetupCost: g.totalSetupCost ? String(g.totalSetupCost) : '',
      securityAdvance: g.securityAdvance ? String(g.securityAdvance) : (g.refundableAdvance ? String(g.refundableAdvance) : ''),
      monthlyRent: g.monthlyRent ? String(g.monthlyRent) : '',
      leaseContactName: g.leaseContactName || '',
      leaseContactMobile: g.leaseContactMobile || '',
      ownerAddress: g.ownerAddress || '',
      notes: g.notes || '',
    });
    setIsModalOpen(true);
  };

  // Decommission Hub Safety Confirmation Modal States
  const [hubToDelete, setHubToDelete] = useState<{ id: number; code: string; name: string } | null>(null);
  const [checkingFinance, setCheckingFinance] = useState(false);
  const [financeStats, setFinanceStats] = useState<{ revenueCount: number; rentCount: number } | null>(null);
  const [confirmDeleteOverall, setConfirmDeleteOverall] = useState(false);
  const [deletingHub, setDeletingHub] = useState(false);

  const openDeleteModal = async (g: Godown, e: React.MouseEvent) => {
    e.stopPropagation();
    setHubToDelete({
      id: g.id,
      code: g.code || '',
      name: g.erpName || g.name,
    });
    setConfirmDeleteOverall(false);
    setCheckingFinance(true);
    setFinanceStats(null);
    try {
      const [revs, rents] = await Promise.all([
        financeApi.getTotalRevenues({ hubId: g.id }),
        financeApi.getRents({ hubId: g.id }),
      ]);
      const revList = Array.isArray(revs) ? revs : (revs as any)?.content || [];
      const rentList = Array.isArray(rents) ? rents : (rents as any)?.content || [];
      setFinanceStats({
        revenueCount: revList.length,
        rentCount: rentList.length,
      });
    } catch {
      setFinanceStats({ revenueCount: 0, rentCount: 0 });
    } finally {
      setCheckingFinance(false);
    }
  };

  const confirmDeleteHub = async () => {
    if (!hubToDelete) return;
    setDeletingHub(true);
    try {
      const res: any = await godownApi.delete(hubToDelete.id);
      const releasedCode = res?.releasedCode || hubToDelete.code;
      success(`Hub ${hubToDelete.name} and all related overall information (finance, rent, assets, staff, and operations) deleted successfully. Hub ID ${releasedCode} released.`);
      setHubToDelete(null);
      setConfirmDeleteOverall(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.hubs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
      refetchGodowns();
    } catch (err: any) {
      error(err.message || 'Failed to delete hub and related information');
    } finally {
      setDeletingHub(false);
    }
  };

  // Date Change Handlers that calculate duration automatically
  const handleStartDateChange = (val: string) => {
    const duration = calculateMonths(val, formData.leaseEndDate);
    setFormData((prev) => ({
      ...prev,
      leaseStartDate: val,
      leaseDurationMonths: duration,
    }));
  };

  const handleEndDateChange = (val: string) => {
    const duration = calculateMonths(formData.leaseStartDate, val);
    setFormData((prev) => ({
      ...prev,
      leaseEndDate: val,
      leaseDurationMonths: duration,
    }));
  };

  // Labour Licence Handler (hide and clear values when No is selected)
  const handleLabourLicenceToggle = (available: boolean) => {
    setFormData((prev) => ({
      ...prev,
      hasLabourLicence: available,
      labourLicenceStartDate: available ? prev.labourLicenceStartDate : '',
      labourLicenceExpiryDate: available ? prev.labourLicenceExpiryDate : '',
    }));
  };

  // Trade Licence Handler (hide and clear values when No is selected)
  const handleTradeLicenceToggle = (available: boolean) => {
    setFormData((prev) => ({
      ...prev,
      hasTradeLicence: available,
      tradeLicenceStartDate: available ? prev.tradeLicenceStartDate : '',
      tradeLicenceExpiryDate: available ? prev.tradeLicenceExpiryDate : '',
    }));
  };

  // Location Address & Google Location Autogeneration Handlers
  const handleLocationChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      location: val,
      googleLocation: isCustomGoogleLocation
        ? prev.googleLocation
        : generateGoogleMapsUrl(val),
    }));
  };

  const handleGoogleLocationChange = (val: string) => {
    setIsCustomGoogleLocation(true);
    setFormData((prev) => ({ ...prev, googleLocation: val }));
  };

  const handleRegenerateGoogleLocation = () => {
    setIsCustomGoogleLocation(false);
    setFormData((prev) => ({
      ...prev,
      googleLocation: generateGoogleMapsUrl(prev.location),
    }));
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // optional unless required
    const cleaned = phone.replace(/[^0-9]/g, '');
    return cleaned.length === 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Mandatory Validations
    if (!formData.name.trim()) {
      error('ERP Name is required. Please enter Hub ERP Name.');
      return;
    }
    if (!formData.hubPocName.trim()) {
      error('Hub POC Name is required.');
      return;
    }
    if (!formData.hubPocContact.trim()) {
      error('Hub POC Contact number is required.');
      return;
    }
    if (!validatePhone(formData.hubPocContact)) {
      error('Hub POC Contact must be a valid 10-digit phone number.');
      return;
    }
    if (!formData.currentTenant.trim()) {
      error('Current Tenant is mandatory.');
      return;
    }
    if (!formData.location.trim()) {
      error('Location Address is required.');
      return;
    }
    const finalGoogleLocation =
      formData.googleLocation.trim() || generateGoogleMapsUrl(formData.location.trim());
    if (!finalGoogleLocation) {
      error('Google Location (Google Maps link) is required.');
      return;
    }
    if (formData.operationsPocMobile && !validatePhone(formData.operationsPocMobile)) {
      error('Operations POC Mobile must be a valid 10-digit phone number.');
      return;
    }
    if (formData.leaseContactMobile && !validatePhone(formData.leaseContactMobile)) {
      error('Lease Contact Mobile must be a valid 10-digit phone number.');
      return;
    }

    // 2. Date Validations
    if (formData.leaseStartDate && formData.leaseEndDate) {
      if (new Date(formData.leaseEndDate) <= new Date(formData.leaseStartDate)) {
        error('Lease End Date must be after Lease Start Date.');
        return;
      }
    }
    if (formData.hasLabourLicence && formData.labourLicenceStartDate && formData.labourLicenceExpiryDate) {
      if (new Date(formData.labourLicenceExpiryDate) <= new Date(formData.labourLicenceStartDate)) {
        error('Labour Licence Expiry Date must be after Start Date.');
        return;
      }
    }
    if (formData.hasTradeLicence && formData.tradeLicenceStartDate && formData.tradeLicenceExpiryDate) {
      if (new Date(formData.tradeLicenceExpiryDate) <= new Date(formData.tradeLicenceStartDate)) {
        error('Trade Licence Expiry Date must be after Start Date.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        erpName: formData.name.trim(),
        code: formData.code.trim() || undefined,
        state: formData.state.trim() || 'Telangana',
        city: formData.city.trim(),
        location: formData.location.trim(),
        locationAddress: formData.location.trim(),
        address: formData.location.trim(),
        capacitySqFt: formData.capacitySqFt ? Number(parseFloat(formData.capacitySqFt).toFixed(2)) : null,
        totalCapacity: formData.capacitySqFt ? Number(parseFloat(formData.capacitySqFt).toFixed(2)) : null,
        currentTenant: formData.currentTenant.trim(),
        status: formData.status,
        hubStatus: formData.status,
        hubModel: formData.hubModel,
        hubPocName: formData.hubPocName.trim(),
        hubPocContact: formData.hubPocContact.trim(),
        googleLocation: finalGoogleLocation,

        // 2. Lease Information
        leaseStartDate: formData.leaseStartDate || null,
        leaseEndDate: formData.leaseEndDate || null,
        leaseDurationMonths: formData.leaseDurationMonths,

        // 3. Operations Information
        operationsPocName: formData.operationsPocName.trim() || null,
        operationsPocMobile: formData.operationsPocMobile.trim() || null,

        // 4. CCTV Details
        cctvUsername: formData.cctvUsername.trim() || null,
        cctvPassword: formData.cctvPassword.trim() || null,
        cctvAccessUrl: formData.cctvAccessUrl.trim() || null,

        // 5. Labour Licence
        hasLabourLicence: formData.hasLabourLicence,
        labourLicenceStartDate: formData.hasLabourLicence ? (formData.labourLicenceStartDate || null) : null,
        labourLicenceExpiryDate: formData.hasLabourLicence ? (formData.labourLicenceExpiryDate || null) : null,

        // 6. Trade Licence
        hasTradeLicence: formData.hasTradeLicence,
        tradeLicenceStartDate: formData.hasTradeLicence ? (formData.tradeLicenceStartDate || null) : null,
        tradeLicenceExpiryDate: formData.hasTradeLicence ? (formData.tradeLicenceExpiryDate || null) : null,

        // 7. Financial Information (non-negative, 2 decimals)
        totalSetupCost: Number(parseFloat(formData.totalSetupCost || '0').toFixed(2)),
        securityAdvance: Number(parseFloat(formData.securityAdvance || '0').toFixed(2)),
        refundableAdvance: Number(parseFloat(formData.securityAdvance || '0').toFixed(2)),
        monthlyRent: Number(parseFloat(formData.monthlyRent || '0').toFixed(2)),

        // 8. Lease Contact & Owner Information
        leaseContactName: formData.leaseContactName.trim() || null,
        leaseContactMobile: formData.leaseContactMobile.trim() || null,
        ownerAddress: formData.ownerAddress.trim() || null,

        // Broadband and electricity configured in Expenses & Bills
        broadbandDetails: [],
        electricityProvider: null,
        electricityServiceNumber: null,

        notes: formData.notes.trim() || null,
      };

      if (editingGodown) {
        await godownApi.update(editingGodown.id, payload);
        success('Hub updated successfully');
      } else {
        await godownApi.create(payload);
        success('Hub added successfully');
      }

      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.hubs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      refetchGodowns();
    } catch (err: any) {
      error('Operation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'UNDER_MAINTENANCE':
        return <Badge variant="warning">Under Maintenance</Badge>;
      case 'YET_TO_LIVE':
        return <Badge variant="accent">Yet to Live</Badge>;
      case 'CLOSED':
        return <Badge variant="neutral">Closed</Badge>;
      case 'TERMINATED':
        return <Badge variant="danger">Terminated</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const filteredGodowns = godowns.filter((g) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      (g.name && g.name.toLowerCase().includes(term)) ||
      (g.erpName && g.erpName.toLowerCase().includes(term)) ||
      (g.code && g.code.toLowerCase().includes(term)) ||
      (g.city && g.city.toLowerCase().includes(term)) ||
      (g.state && g.state.toLowerCase().includes(term)) ||
      (g.location && g.location.toLowerCase().includes(term)) ||
      (g.currentTenant && g.currentTenant.toLowerCase().includes(term)) ||
      (g.hubPocName && g.hubPocName.toLowerCase().includes(term));
    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter || g.hubStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>HUBS</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-apple-accent/10 text-apple-accent">
              {godowns.length} Facilities
            </span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage physical hubs, tenancy contracts, infrastructure, licenses, and operations
          </p>
        </div>

        {!isViewer && (
          <Button
            onClick={openCreateModal}
            icon={<Plus className="w-4 h-4" />}
            className="rounded-xl shadow-apple-sm"
          >
            Add Hub
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Input
            placeholder="Search by ERP name, location, tenant, or POC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="ALL">All Statuses</option>
            {HUB_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          {user?.role === 'ADMIN' && (
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer select-none whitespace-nowrap bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="rounded text-[#0071E3] focus:ring-[#0071E3]"
              />
              Show Deleted
            </label>
          )}
        </div>
      </div>

      {/* Grid of Hub Cards */}
      {loading ? (
        <div className="py-20 text-center text-xs text-gray-400">
          <div className="w-6 h-6 border-2 border-apple-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading hub facilities...
        </div>
      ) : filteredGodowns.length === 0 ? (
        <Card className="p-12 text-center text-xs text-gray-400">
          <Warehouse className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
            No hubs found
          </p>
          <p className="mt-1">
            {searchQuery
              ? 'Try modifying your search filter.'
              : 'Add your first hub property to get started.'}
          </p>
          <Button
            onClick={openCreateModal}
            icon={<Plus className="w-4 h-4" />}
            size="sm"
            className="mt-4"
          >
            Add Hub
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGodowns.map((g) => {
            const hasBroadband = Array.isArray(g.broadbandDetails) && g.broadbandDetails.length > 0;
            return (
              <Card
                key={g.id}
                hoverable
                onClick={() => navigate(`/hubs/${g.id}`)}
                className="p-5 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 group-hover:text-apple-accent transition-colors truncate">
                          {g.erpName || g.name}
                        </h3>
                        {g.hubModel && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40 shrink-0">
                            {g.hubModel}
                          </span>
                        )}
                        {g.code && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-apple-accent/10 text-apple-accent dark:bg-apple-accent/20 font-bold tracking-wide border border-apple-accent/20 shrink-0">
                            {g.code}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-2 min-w-0 overflow-hidden">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-apple-accent" />
                        <span className="font-semibold text-gray-800 dark:text-gray-200 shrink-0 whitespace-nowrap">
                          {g.city ? `${g.city}` : ''}{g.state ? `, ${g.state}` : ''}
                        </span>
                        {(g.address || g.locationAddress || g.location) && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600 shrink-0">•</span>
                            <span className="truncate text-gray-500 dark:text-gray-400">
                              {g.address || g.locationAddress || g.location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {getStatusBadge(g.status || g.hubStatus || 'ACTIVE')}
                      <button
                        onClick={(e) => openEditModal(g, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/5 dark:hover:text-gray-200 dark:hover:bg-white/10 transition-colors"
                        title="Edit Hub"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => openDeleteModal(g, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-apple-danger hover:bg-apple-danger/10 transition-colors"
                        title="Decommission Hub"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Key Metrics / Attributes */}
                  <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase tracking-wider">Current Tenant</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block">
                        {g.currentTenant || <span className="italic text-gray-400">Not Assigned</span>}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase tracking-wider">Total Capacity</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {g.capacitySqFt || g.totalCapacity ? `${(g.capacitySqFt || g.totalCapacity)!.toLocaleString('en-IN')} sq.ft` : 'Optional / N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Highlights Bar: POC, Broadband, CCTV, Licence */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px] text-gray-500 dark:text-gray-400">
                    {g.hubPocName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/[0.03] dark:bg-white/[0.05]">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span>POC: {g.hubPocName}</span>
                      </span>
                    )}
                    {hasBroadband && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <Wifi className="w-3 h-3" />
                        <span>{g.broadbandDetails!.length} Broadband</span>
                      </span>
                    )}
                    {g.cctvAccessUrl && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400">
                        <Video className="w-3 h-3" />
                        <span>CCTV Configured</span>
                      </span>
                    )}
                    {g.hasLabourLicence && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Labour Lic.</span>
                      </span>
                    )}
                    {g.hasTradeLicence && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                        <FileCheck className="w-3 h-3" />
                        <span>Trade Lic.</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Rent & Action */}
                <div className="mt-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                      Monthly Rent
                    </span>
                    <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(g.monthlyRent)}
                    </span>
                  </div>

                  <span className="text-xs text-apple-accent font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Manage Hub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Comprehensive Add / Edit Hub Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGodown ? `Edit Hub: ${editingGodown.erpName || editingGodown.name}` : 'Add New Hub'}
        description="Capture complete hub information, lease timeline, operations, connectivity, CCTV credentials, and licensing details."
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 pr-3">

          {/* SECTION 1: HUB INFORMATION */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="w-6 h-6 rounded-lg bg-apple-accent/10 text-apple-accent flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                1. Hub Information
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="ERP Name" required>
                <Input
                  placeholder="e.g. Hub-01 IDA Cherlapally"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Current Tenant" required>
                <Input
                  placeholder="e.g. Reliance Retail Logistics"
                  value={formData.currentTenant}
                  onChange={(e) => setFormData({ ...formData, currentTenant: e.target.value })}
                  required
                />
              </FormField>
            </div>

            {/* State & Accurate City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="State"
                required
              >
                <Select
                  value={formData.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  required
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st} ({getStatePrefix(st)})
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="City / District"
                required
              >
                <Input
                  placeholder="e.g. Hyderabad, Warangal, Bengaluru..."
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Hub POC Name" required>
                <Input
                  placeholder="e.g. Ramesh Sharma"
                  value={formData.hubPocName}
                  onChange={(e) => setFormData({ ...formData, hubPocName: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Hub POC Contact (10 Digits)" required>
                <Input
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  value={formData.hubPocContact}
                  onChange={(e) => setFormData({ ...formData, hubPocContact: e.target.value })}
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Total Capacity (Number, Optional)">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 25000"
                  value={formData.capacitySqFt}
                  onChange={(e) => setFormData({ ...formData, capacitySqFt: e.target.value })}
                />
              </FormField>

              <FormField label="Hub Status" required>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  {HUB_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Hub Model" required>
                <Select
                  value={formData.hubModel}
                  onChange={(e) => setFormData({ ...formData, hubModel: e.target.value })}
                  required
                >
                  {HUB_MODEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <FormField
              label="Location Address"
              required
              hint="Enter the facility address, area, or landmark (used to autogenerate Google Location)"
            >
              <Textarea
                placeholder="Complete address including Plot / Survey No, Landmark, City, State..."
                rows={2}
                value={formData.location}
                onChange={(e) => handleLocationChange(e.target.value)}
                required
              />
            </FormField>

            <FormField
              label="Google Location (Google Maps Link)"
              required
              hint={
                isCustomGoogleLocation
                  ? 'Custom Google Maps link. Click Auto-generate to re-link with the address above.'
                  : 'Automatically generated from Location Address.'
              }
            >
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="https://www.google.com/maps/search/?api=1&query=..."
                    value={formData.googleLocation}
                    onChange={(e) => handleGoogleLocationChange(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRegenerateGoogleLocation}
                  disabled={!formData.location.trim()}
                  title="Re-generate Google Maps link from Location Address"
                  className="shrink-0 text-xs font-semibold h-11 px-3"
                >
                  Auto-generate
                </Button>
                {formData.googleLocation && (
                  <a
                    href={formData.googleLocation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-11 w-11 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[#0071E3] shrink-0 flex items-center justify-center transition-colors"
                    title="Open Google Location preview in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </FormField>
          </div>

          {/* SECTION 2: LEASE INFORMATION */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="w-6 h-6 rounded-lg bg-apple-accent/10 text-apple-accent flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                2. Lease Information
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Lease Start Date">
                <Input
                  type="date"
                  value={formData.leaseStartDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
              </FormField>

              <FormField label="Lease End Date (Must be after Start Date)">
                <Input
                  type="date"
                  min={formData.leaseStartDate || undefined}
                  value={formData.leaseEndDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                />
              </FormField>

              <FormField label="Total Lease Duration">
                <div className="min-h-[42px] px-3.5 py-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <span className="flex items-center gap-1.5 text-apple-accent">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formData.leaseDurationMonths} Months</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    Auto-calculated
                  </span>
                </div>
              </FormField>
            </div>
          </div>

          {/* SECTION 3: OPERATIONS INFORMATION */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="w-6 h-6 rounded-lg bg-apple-accent/10 text-apple-accent flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                3. Operations Information
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Operations POC Name" required>
                <Input
                  placeholder="e.g. Suresh Kumar"
                  value={formData.operationsPocName}
                  onChange={(e) => setFormData({ ...formData, operationsPocName: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Operations POC Mobile (10 Digits)">
                <Input
                  placeholder="e.g. 9988776655"
                  maxLength={10}
                  value={formData.operationsPocMobile}
                  onChange={(e) => setFormData({ ...formData, operationsPocMobile: e.target.value })}
                />
              </FormField>
            </div>
          </div>

          {/* SECTION 4: CCTV DETAILS */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="w-6 h-6 rounded-lg bg-apple-accent/10 text-apple-accent flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-apple-accent" />
                <span>4. CCTV Details</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="CCTV Username">
                <Input
                  placeholder="e.g. admin"
                  value={formData.cctvUsername}
                  onChange={(e) => setFormData({ ...formData, cctvUsername: e.target.value })}
                />
              </FormField>

              <FormField label="CCTV Password (Encrypted)">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.cctvPassword}
                    onChange={(e) => setFormData({ ...formData, cctvPassword: e.target.value })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FormField>

              <FormField label="CCTV Access URL / IP">
                <Input
                  placeholder="e.g. http://192.168.1.100:8000"
                  value={formData.cctvAccessUrl}
                  onChange={(e) => setFormData({ ...formData, cctvAccessUrl: e.target.value })}
                />
              </FormField>
            </div>
          </div>

          {/* SECTION 5: LABOUR LICENCE */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-apple-accent/10 text-apple-accent flex items-center justify-center font-bold text-xs">
                  5
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-apple-accent" />
                  <span>5. Labour Licence</span>
                </h4>
              </div>

              {/* Yes / No Radio Toggle */}
              <div className="flex items-center gap-1 bg-black/[0.05] dark:bg-white/[0.08] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleLabourLicenceToggle(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    formData.hasLabourLicence
                      ? 'bg-apple-accent text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleLabourLicenceToggle(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    !formData.hasLabourLicence
                      ? 'bg-gray-700 text-white shadow-sm dark:bg-gray-600'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {formData.hasLabourLicence ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-fadeIn">
                <FormField label="Licence Start Date" required>
                  <Input
                    type="date"
                    value={formData.labourLicenceStartDate}
                    onChange={(e) => setFormData({ ...formData, labourLicenceStartDate: e.target.value })}
                    required
                  />
                </FormField>

                <FormField label="Licence Expiry Date (Must be after Start Date)" required>
                  <Input
                    type="date"
                    min={formData.labourLicenceStartDate || undefined}
                    value={formData.labourLicenceExpiryDate}
                    onChange={(e) => setFormData({ ...formData, labourLicenceExpiryDate: e.target.value })}
                    required
                  />
                </FormField>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Labour Licence not available for this Hub.
              </p>
            )}
          </div>

          {/* SECTION 6: TRADE LICENCE */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-apple-accent/10 text-apple-accent flex items-center justify-center font-bold text-xs">
                  6
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-apple-accent" />
                  <span>6. Trade Licence</span>
                </h4>
              </div>

              {/* Yes / No Radio Toggle */}
              <div className="flex items-center gap-1 bg-black/[0.05] dark:bg-white/[0.08] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleTradeLicenceToggle(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    formData.hasTradeLicence
                      ? 'bg-apple-accent text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleTradeLicenceToggle(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    !formData.hasTradeLicence
                      ? 'bg-gray-700 text-white shadow-sm dark:bg-gray-600'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {formData.hasTradeLicence ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-fadeIn">
                <FormField label="Licence Start Date" required>
                  <Input
                    type="date"
                    value={formData.tradeLicenceStartDate}
                    onChange={(e) => setFormData({ ...formData, tradeLicenceStartDate: e.target.value })}
                    required
                  />
                </FormField>

                <FormField label="Licence Expiry Date (Must be after Start Date)" required>
                  <Input
                    type="date"
                    min={formData.tradeLicenceStartDate || undefined}
                    value={formData.tradeLicenceExpiryDate}
                    onChange={(e) => setFormData({ ...formData, tradeLicenceExpiryDate: e.target.value })}
                    required
                  />
                </FormField>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Trade Licence not available for this Hub.
              </p>
            )}
          </div>

          {/* SECTION 7: FINANCIAL INFORMATION */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="w-6 h-6 rounded-lg bg-apple-accent/10 text-apple-accent flex items-center justify-center font-bold text-xs">
                7
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-apple-accent" />
                <span>7. Financial Information (Numeric, Non-negative, 2 Decimals)</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Total Setup Cost (₹)">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.totalSetupCost}
                  onChange={(e) => setFormData({ ...formData, totalSetupCost: e.target.value })}
                />
              </FormField>

              <FormField label="Refundable Advance Amount (₹)">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.securityAdvance}
                  onChange={(e) => setFormData({ ...formData, securityAdvance: e.target.value })}
                />
              </FormField>

              <FormField label="Monthly Rent (₹)">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.monthlyRent}
                  onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                />
              </FormField>
            </div>
          </div>

          {/* SECTION 8: LEASE CONTACT AND OWNER INFORMATION */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="w-6 h-6 rounded-lg bg-apple-accent/10 text-apple-accent flex items-center justify-center font-bold text-xs">
                8
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-apple-accent" />
                <span>8. Lease Contact and Owner Information</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Lease Contact Name">
                <Input
                  placeholder="e.g. Rajesh Reddy (Owner / Agent)"
                  value={formData.leaseContactName}
                  onChange={(e) => setFormData({ ...formData, leaseContactName: e.target.value })}
                />
              </FormField>

              <FormField label="Lease Contact Mobile Number (10 Digits)">
                <Input
                  placeholder="e.g. 9440011223"
                  maxLength={10}
                  value={formData.leaseContactMobile}
                  onChange={(e) => setFormData({ ...formData, leaseContactMobile: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Owner Address">
              <Textarea
                placeholder="Permanent residential or business address of the owner..."
                rows={2}
                value={formData.ownerAddress}
                onChange={(e) => setFormData({ ...formData, ownerAddress: e.target.value })}
              />
            </FormField>
          </div>

          {/* Additional Notes */}
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08]">
            <FormField label="Internal Notes & Specifications">
              <Textarea
                placeholder="Any special remarks, dock specifications, maintenance terms..."
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </FormField>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] sticky bottom-0 bg-apple-cardLight/95 dark:bg-apple-cardDark/95 backdrop-blur-md py-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
            >
              {editingGodown ? 'Update Hub' : 'Add Hub'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Decommission Hub Safety Confirmation Modal */}
      <Modal
        isOpen={Boolean(hubToDelete)}
        onClose={() => {
          if (!deletingHub) setHubToDelete(null);
        }}
        title={`Delete Hub & Overall Related Information: ${hubToDelete?.name || ''} (${hubToDelete?.code || ''})`}
        description="All financial, operational, asset, and personnel data linked to this hub will be permanently removed."
        maxWidth="xl"
      >
        <div className="space-y-5">
          {/* Section 1: Associated Data Deletion Notice */}
          <div className="p-4 rounded-2xl bg-apple-danger/10 border border-apple-danger/25 text-xs space-y-3">
            <div className="flex items-center gap-2 text-apple-danger font-bold text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Overall Information Removal Warning</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
              Deleting this Hub facility will permanently remove all overall information and linked records across the entire application:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-700 dark:text-gray-300">
              <div className="p-2.5 rounded-xl bg-white/60 dark:bg-black/20 border border-apple-danger/15 space-y-1">
                <span className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-apple-danger" />
                  Financial Records
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  {checkingFinance
                    ? 'Checking finance records...'
                    : `${financeStats?.revenueCount || 0} Annual Revenue & ${financeStats?.rentCount || 0} Monthly Rent statements`}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/60 dark:bg-black/20 border border-apple-danger/15 space-y-1">
                <span className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-apple-danger" />
                  Personnel & Payroll
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  Assigned staff profiles and all monthly salary payment histories
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/60 dark:bg-black/20 border border-apple-danger/15 space-y-1">
                <span className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-apple-danger" />
                  Assets & Infrastructure
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  CCTV configurations, hardware equipment, and broadband lines
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/60 dark:bg-black/20 border border-apple-danger/15 space-y-1">
                <span className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-apple-danger" />
                  Operations & Ledgers
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  Rent ledger invoices, utility bill records, and petty cash entries
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Confirmation Checkbox */}
          <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.1] text-xs">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmDeleteOverall}
                onChange={(e) => setConfirmDeleteOverall(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-apple-danger focus:ring-apple-danger/20 cursor-pointer"
              />
              <span className="text-gray-800 dark:text-gray-200 leading-snug">
                I understand this action is irreversible. Please delete <strong>{hubToDelete?.name} ({hubToDelete?.code})</strong> and <strong>permanently purge all overall related information</strong> across Finance, Staff, Assets, and Operations.
              </span>
            </label>
          </div>

          {/* Modal Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button
              type="button"
              variant="outline"
              disabled={deletingHub}
              onClick={() => setHubToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deletingHub || !confirmDeleteOverall}
              loading={deletingHub}
              icon={<Trash2 className="w-4 h-4" />}
              onClick={confirmDeleteHub}
            >
              Permanently Delete Hub & All Info
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
