import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Search,
  Trash2,
  Edit,
  Tag,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { Asset, AssetCondition, Godown, ApiResponse, PagedResponse } from '../types';
import { formatINR, formatDate } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, Column } from '../components/ui/DataTable';
import { Sheet } from '../components/ui/Sheet';
import { FormField } from '../components/ui/FormField';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useToast } from '../components/ui/Toast';

export const Assets: React.FC = () => {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [selectedCondition, setSelectedCondition] = useState<string>('ALL');
  const [selectedGodownId, setSelectedGodownId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    godownId: '' as number | '',
    name: '',
    category: 'Material Handling',
    serialNumber: '',
    quantity: 1,
    cost: 150000,
    condition: 'GOOD' as AssetCondition,
    purchaseDate: new Date().toISOString().split('T')[0],
    warrantyExpiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    notes: '',
  });

  // Fetch Godowns
  const { data: godowns } = useQuery({
    queryKey: ['activeGodownsDropdown'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Godown[]>>('/godowns/all');
      return res.data.data;
    },
  });

  // Fetch Assets
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['assets', selectedCondition, selectedGodownId, searchQuery, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        size: 15,
      };
      if (selectedCondition !== 'ALL') params.condition = selectedCondition;
      if (selectedGodownId !== 'ALL') params.godownId = selectedGodownId;
      if (searchQuery) params.query = searchQuery;

      const res = await apiClient.get<ApiResponse<PagedResponse<Asset>>>('/assets', { params });
      return res.data.data;
    },
  });

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingAsset) {
        return apiClient.put(`/assets/${editingAsset.id}`, payload);
      } else {
        return apiClient.post('/assets', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess(editingAsset ? 'Equipment updated' : 'Asset registered successfully');
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to save asset');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toastSuccess('Asset deleted');
    },
  });

  const resetForm = () => {
    setEditingAsset(null);
    setFormData({
      godownId: '',
      name: '',
      category: 'Material Handling',
      serialNumber: '',
      quantity: 1,
      cost: 150000,
      condition: 'GOOD',
      purchaseDate: new Date().toISOString().split('T')[0],
      warrantyExpiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      notes: '',
    });
  };

  const handleOpenEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      godownId: asset.godownId,
      name: asset.name,
      category: asset.category,
      serialNumber: asset.serialNumber || '',
      quantity: asset.quantity,
      cost: asset.cost,
      condition: asset.condition,
      purchaseDate: asset.purchaseDate || '',
      warrantyExpiryDate: asset.warrantyExpiryDate || '',
      notes: asset.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.godownId) {
      toastError('Please select a godown facility');
      return;
    }
    saveMutation.mutate({
      ...formData,
      godownId: Number(formData.godownId),
    });
  };

  const columns: Column<Asset>[] = [
    {
      key: 'name',
      header: 'Equipment Name & S/N',
      render: (item) => (
        <div>
          <span className="font-semibold text-apple-text dark:text-apple-darkText block">
            {item.name}
          </span>
          <span className="text-xs text-apple-secondary dark:text-apple-darkSecondary font-mono">
            {item.serialNumber ? `S/N: ${item.serialNumber}` : 'No Serial #'}
          </span>
        </div>
      ),
    },
    {
      key: 'godown',
      header: 'Location',
      render: (item) => (
        <div>
          <span className="font-medium text-apple-text dark:text-apple-darkText block">
            {item.godownName}
          </span>
          <span className="text-xs text-apple-secondary dark:text-apple-darkSecondary font-mono">
            {item.godownCode}
          </span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => <Badge variant="neutral">{item.category}</Badge>,
    },
    {
      key: 'quantity',
      header: 'Qty',
      render: (item) => <span className="font-semibold">{item.quantity}</span>,
    },
    {
      key: 'cost',
      header: 'Unit Cost',
      render: (item) => <span className="font-bold">{formatINR(item.cost)}</span>,
    },
    {
      key: 'condition',
      header: 'Condition',
      render: (item) => (
        <Badge
          variant={
            item.condition === 'EXCELLENT' || item.condition === 'GOOD'
              ? 'success'
              : item.condition === 'FAIR'
              ? 'warning'
              : 'danger'
          }
        >
          {item.condition}
        </Badge>
      ),
    },
    {
      key: 'warranty',
      header: 'Warranty Status',
      render: (item) => {
        if (!item.warrantyExpiryDate) return <span className="text-apple-secondary text-xs">—</span>;
        const isExpired = new Date(item.warrantyExpiryDate) < new Date();
        return (
          <span
            className={`text-xs flex items-center gap-1 font-medium ${
              isExpired
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-apple-secondary dark:text-apple-darkSecondary'
            }`}
          >
            {isExpired ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
            {formatDate(item.warrantyExpiryDate)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenEdit(item)}
            className="p-1 rounded-md text-apple-secondary hover:text-apple-text"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Delete this asset?')) deleteMutation.mutate(item.id);
            }}
            className="p-1 rounded-md text-apple-secondary hover:text-apple-danger"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-text dark:text-apple-darkText">
            Equipment & Asset Register
          </h1>
          <p className="text-sm text-apple-secondary dark:text-apple-darkSecondary mt-1">
            Track forklifts, diesel generators, CCTV, weighbridges, and fire safety systems per godown.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Register New Asset
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SegmentedControl
          value={selectedCondition}
          onChange={(val) => {
            setSelectedCondition(val);
            setPage(0);
          }}
          options={[
            { value: 'ALL', label: 'All Equipment' },
            { value: 'EXCELLENT', label: 'Excellent' },
            { value: 'GOOD', label: 'Good' },
            { value: 'FAIR', label: 'Fair' },
            { value: 'POOR', label: 'Poor / Damaged' },
          ]}
        />

        <div className="flex items-center gap-2">
          <select
            value={selectedGodownId}
            onChange={(e) => {
              setSelectedGodownId(e.target.value);
              setPage(0);
            }}
            className="px-3.5 py-1.5 rounded-full border border-apple-border dark:border-apple-darkBorder bg-white/80 dark:bg-apple-darkSurface text-xs text-apple-text dark:text-apple-darkText focus:outline-none focus:ring-2 focus:ring-apple-accent/20"
          >
            <option value="ALL">All Warehouses</option>
            {(godowns || []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={assetsData?.content || []}
        isLoading={isLoading}
        searchPlaceholder="Search equipment by name or serial number..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        page={page}
        totalPages={assetsData?.totalPages || 1}
        totalElements={assetsData?.totalElements}
        onPageChange={setPage}
        emptyTitle="No equipment registered"
        emptyDescription="There are no assets recorded matching the selected filter."
      />

      {/* Add / Edit Sheet */}
      <Sheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAsset ? 'Edit Equipment Unit' : 'Register New Asset'}
        description="Record machinery, generators, weighbridges, and warranties."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Warehouse Facility"
            as="select"
            required
            value={formData.godownId}
            onChange={(e) => setFormData({ ...formData, godownId: Number(e.target.value) })}
          >
            <option value="">Select Facility...</option>
            {(godowns || []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.code})
              </option>
            ))}
          </FormField>

          <FormField
            label="Equipment / Asset Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Kirloskar 125 kVA Silent Generator"
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Category"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g. Power Backup / Material Handling"
            />
            <FormField
              label="Serial Number / Tag"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              placeholder="e.g. KIR-GEN-9421"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField
              label="Quantity"
              type="number"
              required
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
            />
            <FormField
              label="Unit Cost (INR)"
              type="number"
              required
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
            />
            <FormField
              label="Condition"
              as="select"
              required
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value as AssetCondition })}
              options={[
                { value: 'EXCELLENT', label: 'Excellent' },
                { value: 'GOOD', label: 'Good' },
                { value: 'FAIR', label: 'Fair' },
                { value: 'POOR', label: 'Poor' },
                { value: 'DAMAGED', label: 'Damaged' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Purchase Date"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            />
            <FormField
              label="Warranty Expiry Date"
              type="date"
              value={formData.warrantyExpiryDate}
              onChange={(e) => setFormData({ ...formData, warrantyExpiryDate: e.target.value })}
            />
          </div>

          <FormField
            label="Maintenance Notes / AMC Details"
            as="textarea"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Annual maintenance contract vendor, service schedule, calibration notes..."
          />

          <div className="pt-4 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saveMutation.isPending}>
              {editingAsset ? 'Save Changes' : 'Register Asset'}
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
};

