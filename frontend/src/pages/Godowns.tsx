import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Input, Select, Textarea } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { godownApi } from '../services/api';
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

export const generateGoogleMapsUrl = (address: string): string => {
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

  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
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
    code: '',
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

  const fetchGodowns = async () => {
    setLoading(true);
    try {
      const res: any = await godownApi.getAll(0, 100);
      const data = Array.isArray(res) ? res : res?.content || [];
      setGodowns(data);
    } catch (err: any) {
      error('Failed to load hubs: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGodowns();
  }, []);

  const openCreateModal = () => {
    setEditingGodown(null);
    setShowPassword(false);
    setIsCustomGoogleLocation(false);
    setFormData({
      name: '',
      code: '',
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
      code: g.code || '',
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

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this hub? This will delete associated records.')) {
      return;
    }
    try {
      await godownApi.delete(id);
      success('Hub deleted successfully');
      setGodowns((prev) => prev.filter((g) => g.id !== id));
    } catch (err: any) {
      error('Failed to delete hub: ' + (err.message || 'Unknown error'));
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
      fetchGodowns();
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

        <div className="flex items-center gap-2 w-full sm:w-auto">
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
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 group-hover:text-apple-accent transition-colors">
                          {g.erpName || g.name}
                        </h3>
                        {g.hubModel && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                            {g.hubModel}
                          </span>
                        )}
                        {g.code && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-gray-500">
                            {g.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1.5 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{g.address || g.locationAddress || g.location}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {getStatusBadge(g.status || g.hubStatus || 'ACTIVE')}
                      <button
                        onClick={(e) => openEditModal(g, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/5 dark:hover:text-gray-200 dark:hover:bg-white/10 transition-colors"
                        title="Edit Hub"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(g.id, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-apple-danger hover:bg-apple-danger/10 transition-colors"
                        title="Delete Hub"
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
                  size="sm"
                  onClick={handleRegenerateGoogleLocation}
                  disabled={!formData.location.trim()}
                  title="Re-generate Google Maps link from Location Address"
                  className="shrink-0 text-xs font-semibold"
                >
                  Auto-generate
                </Button>
                {formData.googleLocation && (
                  <a
                    href={formData.googleLocation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[#0071E3] shrink-0 flex items-center justify-center transition-colors"
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

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Total Lease Duration (Months)
                </label>
                <div className="h-10 px-3.5 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <span className="flex items-center gap-1.5 text-apple-accent">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formData.leaseDurationMonths} Months</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    Auto-calculated
                  </span>
                </div>
              </div>
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

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  CCTV Password (Encrypted)
                </label>
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
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

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
    </div>
  );
};
