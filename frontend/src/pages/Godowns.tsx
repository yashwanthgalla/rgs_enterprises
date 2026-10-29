import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse,
  Plus,
  MapPin,
  Maximize2,
  Calendar,
  User,
  Trash2,
  Edit,
  ArrowRight,
  Shield,
  Search,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { Godown, GodownStatus, ApiResponse, PagedResponse } from '../types';
import { formatINR, formatSqft, formatDate } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { FormField } from '../components/ui/FormField';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useToast } from '../components/ui/Toast';

export const Godowns: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingGodown, setEditingGodown] = useState<Godown | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city: 'Hyderabad',
    state: 'Telangana',
    address: '',
    pincode: '',
    sizeSqft: 20000,
    status: 'ACTIVE' as GodownStatus,
    currentTenant: '',
    tenantPhone: '',
    tenantEmail: '',
    leaseStartDate: '',
    leaseEndDate: '',
    monthlyRent: 200000,
    securityAdvance: 800000,
    notes: '',
  });

  // Fetch Cities
  const { data: citiesData } = useQuery({
    queryKey: ['godownCities'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<string[]>>('/godowns/cities');
      return res.data.data;
    },
  });

  // Fetch Godowns
  const { data: godownsData, isLoading } = useQuery({
    queryKey: ['godowns', selectedCity, selectedStatus, searchQuery],
    queryFn: async () => {
      const params: Record<string, string | number> = { size: 50 };
      if (selectedCity !== 'ALL') params.city = selectedCity;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (searchQuery) params.query = searchQuery;

      const res = await apiClient.get<ApiResponse<PagedResponse<Godown>>>('/godowns', { params });
      return res.data.data.content;
    },
  });

  // Create/Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const sanitized = {
        ...payload,
        leaseStartDate: payload.leaseStartDate ? payload.leaseStartDate : null,
        leaseEndDate: payload.leaseEndDate ? payload.leaseEndDate : null,
        currentTenant: payload.currentTenant ? payload.currentTenant : null,
        tenantPhone: payload.tenantPhone ? payload.tenantPhone : null,
        tenantEmail: payload.tenantEmail ? payload.tenantEmail : null,
        pincode: payload.pincode ? payload.pincode : null,
        notes: payload.notes ? payload.notes : null,
      };
      if (editingGodown) {
        return apiClient.put(`/godowns/${editingGodown.id}`, sanitized);
      } else {
        return apiClient.post('/godowns', sanitized);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess(editingGodown ? 'Godown updated successfully' : 'Godown created successfully');
      setIsSheetOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to save godown record');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/godowns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('Godown deleted successfully');
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Cannot delete godown: child records exist.');
    },
  });

  const resetForm = () => {
    setEditingGodown(null);
    setFormData({
      name: '',
      code: '',
      city: 'Hyderabad',
      state: 'Telangana',
      address: '',
      pincode: '',
      sizeSqft: 20000,
      status: 'ACTIVE',
      currentTenant: '',
      tenantPhone: '',
      tenantEmail: '',
      leaseStartDate: '',
      leaseEndDate: '',
      monthlyRent: 200000,
      securityAdvance: 800000,
      notes: '',
    });
  };

  const handleOpenEdit = (godown: Godown, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGodown(godown);
    setFormData({
      name: godown.name,
      code: godown.code,
      city: godown.city,
      state: godown.state,
      address: godown.address,
      pincode: godown.pincode || '',
      sizeSqft: godown.sizeSqft,
      status: godown.status,
      currentTenant: godown.currentTenant || '',
      tenantPhone: godown.tenantPhone || '',
      tenantEmail: godown.tenantEmail || '',
      leaseStartDate: godown.leaseStartDate || '',
      leaseEndDate: godown.leaseEndDate || '',
      monthlyRent: godown.monthlyRent,
      securityAdvance: godown.securityAdvance,
      notes: godown.notes || '',
    });
    setIsSheetOpen(true);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this godown? It will be blocked if child records exist.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const cities = ['ALL', ...(citiesData || ['Hyderabad', 'Vijayawada', 'Visakhapatnam', 'Guntur', 'Warangal', 'Tirupati'])];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-text dark:text-apple-darkText">
            Godown Locations
          </h1>
          <p className="text-sm text-apple-secondary dark:text-apple-darkSecondary mt-1">
            Browse, inspect, and configure warehouse facilities across all regions.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            resetForm();
            setIsSheetOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Add New Godown
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Segmented Control */}
        <SegmentedControl
          value={selectedStatus}
          onChange={setSelectedStatus}
          options={[
            { value: 'ALL', label: 'All Units' },
            { value: 'ACTIVE', label: 'Active Leased' },
            { value: 'VACANT', label: 'Vacant' },
            { value: 'UNDER_MAINTENANCE', label: 'Maintenance' },
          ]}
        />

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-apple-secondary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, code, tenant..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-full border border-apple-border dark:border-apple-darkBorder bg-white/80 dark:bg-apple-darkSurface text-apple-text dark:text-apple-darkText placeholder:text-apple-secondary/60 focus:outline-none focus:ring-2 focus:ring-apple-accent/20 focus:border-apple-accent transition-all"
          />
        </div>
      </div>

      {/* City Pills Horizontal Scroll */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-apple-secondary dark:text-apple-darkSecondary font-semibold uppercase tracking-wider shrink-0 mr-1">
          City:
        </span>
        {cities.map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => setSelectedCity(city)}
            className={`px-3 py-1.5 rounded-full font-medium transition-all shrink-0 ${
              selectedCity === city
                ? 'bg-apple-text text-white dark:bg-white dark:text-apple-text shadow-sm'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-apple-secondary dark:text-apple-darkSecondary hover:text-apple-text dark:hover:text-apple-darkText'
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      {/* Godowns Fleet Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-apple-lg bg-black/5 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (godownsData || []).length === 0 ? (
        <Card className="text-center py-16">
          <Warehouse className="w-12 h-12 text-apple-secondary opacity-40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-apple-text dark:text-apple-darkText">
            No godowns found
          </h3>
          <p className="text-xs text-apple-secondary dark:text-apple-darkSecondary max-w-sm mx-auto mt-1 mb-6">
            No warehouses matched your search or selected city filter.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setSelectedCity('ALL');
              setSelectedStatus('ALL');
              setSearchQuery('');
            }}
          >
            Clear Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(godownsData || []).map((g) => (
            <Card
              key={g.id}
              onClick={() => navigate(`/godowns/${g.id}`)}
              className="cursor-pointer hover:shadow-apple-card hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header: Name, Code & Status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-base text-apple-text dark:text-apple-darkText group-hover:text-apple-accent transition-colors">
                      {g.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-apple-secondary dark:text-apple-darkSecondary mt-0.5">
                      <span className="font-mono">{g.code}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {g.city}, {g.state}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      g.status === 'ACTIVE'
                        ? 'success'
                        : g.status === 'VACANT'
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    {g.status}
                  </Badge>
                </div>

                {/* Tenant / Lessee Information */}
                <div className="my-3.5 p-3 rounded-xl bg-apple-bg dark:bg-white/[0.03] border border-black/[0.03] dark:border-white/[0.05] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-apple-secondary dark:text-apple-darkSecondary flex items-center gap-1">
                      <User className="w-3 h-3" /> Tenant:
                    </span>
                    <span className="font-medium text-apple-text dark:text-apple-darkText truncate max-w-[150px]">
                      {g.currentTenant || 'Vacant / Available'}
                    </span>
                  </div>
                  {g.leaseEndDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-apple-secondary dark:text-apple-darkSecondary flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Lease Expiry:
                      </span>
                      <span className="font-medium text-apple-text dark:text-apple-darkText">
                        {formatDate(g.leaseEndDate)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
                  <div>
                    <span className="text-apple-secondary dark:text-apple-darkSecondary block text-[10px] uppercase font-semibold">
                      Floor Area
                    </span>
                    <span className="font-medium text-apple-text dark:text-apple-darkText">
                      {formatSqft(g.sizeSqft)}
                    </span>
                  </div>
                  <div>
                    <span className="text-apple-secondary dark:text-apple-darkSecondary block text-[10px] uppercase font-semibold">
                      Monthly Rent
                    </span>
                    <span className="font-semibold text-apple-accent">
                      {formatINR(g.monthlyRent)}/mo
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-black/[0.04] dark:border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(g, e)}
                    className="p-1.5 rounded-lg text-apple-secondary hover:text-apple-text hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
                    title="Edit Facility"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(g.id, e)}
                    className="p-1.5 rounded-lg text-apple-secondary hover:text-apple-danger hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
                    title="Delete Facility"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] text-apple-secondary dark:text-apple-darkSecondary ml-1">
                    Edited by: <strong className="font-semibold text-apple-text dark:text-apple-darkText">{g.lastEditedBy || 'admin'}</strong>
                  </span>
                </div>

                <span className="text-xs font-semibold text-apple-accent group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Facility Hub <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Godown Sheet Drawer */}
      <Sheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={editingGodown ? 'Edit Godown Location' : 'New Godown Facility'}
        description="Configure warehouse specifications, tenant lease terms, and financial targets."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Godown Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Patancheru Central Hub"
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Facility Code"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g. GDN-HYD-07"
            />
            <FormField
              label="Status"
              as="select"
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as GodownStatus })}
              options={[
                { value: 'ACTIVE', label: 'Active Leased' },
                { value: 'VACANT', label: 'Vacant / Ready' },
                { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="City"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g. Hyderabad"
            />
            <FormField
              label="State"
              required
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="Telangana / Andhra Pradesh"
            />
          </div>

          <FormField
            label="Address"
            as="textarea"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Full physical plot / survey number & road address"
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Pincode"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              placeholder="e.g. 500032"
            />
            <FormField
              label="Size (sq ft)"
              type="number"
              required
              value={formData.sizeSqft}
              onChange={(e) => setFormData({ ...formData, sizeSqft: Number(e.target.value) })}
            />
          </div>

          <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
            <h4 className="text-xs font-semibold uppercase text-apple-secondary dark:text-apple-darkSecondary mb-3">
              Lease & Tenant Details
            </h4>
            <FormField
              label="Current Tenant / Lessee"
              value={formData.currentTenant}
              onChange={(e) => setFormData({ ...formData, currentTenant: e.target.value })}
              placeholder="e.g. Flipkart India Pvt Ltd"
            />

            <div className="grid grid-cols-2 gap-3 mt-3">
              <FormField
                label="Tenant Phone"
                value={formData.tenantPhone}
                onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                placeholder="+91 98490 12345"
              />
              <FormField
                label="Tenant Email"
                value={formData.tenantEmail}
                onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                placeholder="logistics@tenant.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <FormField
                label="Lease Start Date"
                type="date"
                value={formData.leaseStartDate}
                onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
              />
              <FormField
                label="Lease End Date"
                type="date"
                value={formData.leaseEndDate}
                onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <FormField
                label="Monthly Rent (INR)"
                type="number"
                required
                value={formData.monthlyRent}
                onChange={(e) => setFormData({ ...formData, monthlyRent: Number(e.target.value) })}
              />
              <FormField
                label="Security Advance (INR)"
                type="number"
                required
                value={formData.securityAdvance}
                onChange={(e) => setFormData({ ...formData, securityAdvance: Number(e.target.value) })}
                hint="Tracked separately from expenses"
              />
            </div>
          </div>

          <FormField
            label="Internal Notes"
            as="textarea"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Loading bays, clear height, floor strength, sub-station details..."
          />

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsSheetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saveMutation.isPending}>
              {editingGodown ? 'Save Changes' : 'Create Godown'}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
};

