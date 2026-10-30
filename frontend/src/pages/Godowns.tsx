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
  MoreVertical,
  ExternalLink,
  Edit,
  Trash2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Input, Select, Textarea } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { godownApi } from '../services/api';
import { Godown } from '../types';

export const Godowns: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const { success, error } = useToast();

  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGodown, setEditingGodown] = useState<Godown | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    capacitySqFt: '',
    occupiedSqFt: '',
    monthlyRent: '',
    currentTenant: '',
    tenantPhone: '',
    tenantEmail: '',
    status: 'ACTIVE',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchGodowns = async () => {
    setLoading(true);
    try {
      const res: any = await godownApi.getAll(0, 100);
      const data = Array.isArray(res) ? res : res?.content || [];
      setGodowns(data);
    } catch (err: any) {
      error('Failed to load godowns: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGodowns();
  }, []);

  const openCreateModal = () => {
    setEditingGodown(null);
    setFormData({
      name: '',
      code: '',
      location: '',
      capacitySqFt: '',
      occupiedSqFt: '',
      monthlyRent: '',
      currentTenant: '',
      tenantPhone: '',
      tenantEmail: '',
      status: 'ACTIVE',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (g: Godown, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGodown(g);
    setFormData({
      name: g.name || '',
      code: g.code || '',
      location: g.location || '',
      capacitySqFt: String(g.capacitySqFt || ''),
      occupiedSqFt: String(g.occupiedSqFt || ''),
      monthlyRent: String(g.monthlyRent || ''),
      currentTenant: g.currentTenant || '',
      tenantPhone: g.tenantPhone || '',
      tenantEmail: g.tenantEmail || '',
      status: g.status || 'ACTIVE',
      notes: g.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this godown? This will delete associated records.')) {
      return;
    }
    try {
      await godownApi.delete(id);
      success('Godown deleted successfully');
      setGodowns((prev) => prev.filter((g) => g.id !== id));
    } catch (err: any) {
      error('Failed to delete godown: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.location || !formData.capacitySqFt || !formData.monthlyRent) {
      error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        code: formData.code || undefined,
        location: formData.location,
        capacitySqFt: Number(formData.capacitySqFt),
        occupiedSqFt: formData.occupiedSqFt ? Number(formData.occupiedSqFt) : 0,
        monthlyRent: Number(formData.monthlyRent),
        currentTenant: formData.currentTenant || null,
        tenantPhone: formData.tenantPhone || null,
        tenantEmail: formData.tenantEmail || null,
        status: formData.status,
        notes: formData.notes || null,
      };

      if (editingGodown) {
        await godownApi.update(editingGodown.id, payload);
        success('Godown updated successfully');
      } else {
        await godownApi.create(payload);
        success('Godown created successfully');
      }

      setIsModalOpen(false);
      fetchGodowns();
    } catch (err: any) {
      error('Operation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredGodowns = godowns.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.currentTenant && g.currentTenant.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Godowns & Warehouses
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage physical warehouses, lease contracts, and square footage capacity
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          icon={<Plus className="w-4 h-4" />}
          className="rounded-xl shadow-apple-sm"
        >
          Add New Godown
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Input
            placeholder="Search by godown name, location, or tenant..."
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
            className="w-full sm:w-40"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>
      </div>

      {/* Grid of Godown Cards */}
      {loading ? (
        <div className="py-20 text-center text-xs text-gray-400">
          <div className="w-6 h-6 border-2 border-apple-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading warehouse facilities...
        </div>
      ) : filteredGodowns.length === 0 ? (
        <Card className="p-12 text-center text-xs text-gray-400">
          <Warehouse className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
            No godowns found
          </p>
          <p className="mt-1">
            {searchQuery
              ? 'Try modifying your search filter.'
              : 'Add your first warehouse property to get started.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGodowns.map((g) => {
            const occupancyPct = g.capacitySqFt > 0 ? Math.round(((g.occupiedSqFt || 0) / g.capacitySqFt) * 100) : 0;
            return (
              <Card
                key={g.id}
                hoverable
                onClick={() => navigate(`/godowns/${g.id}`)}
                className="p-5 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 group-hover:text-apple-accent transition-colors">
                          {g.name}
                        </h3>
                        {g.code && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-gray-500">
                            {g.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{g.location}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Badge
                        variant={g.status === 'ACTIVE' ? 'success' : g.status === 'MAINTENANCE' ? 'warning' : 'neutral'}
                        size="sm"
                      >
                        {g.status}
                      </Badge>
                      <button
                        onClick={(e) => openEditModal(g, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/5 dark:hover:text-gray-200 dark:hover:bg-white/10 transition-colors"
                        title="Edit Godown"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(g.id, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-apple-danger hover:bg-apple-danger/10 transition-colors"
                        title="Delete Godown"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="mt-4 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Square className="w-3.5 h-3.5" />
                        <span>Capacity: {g.capacitySqFt.toLocaleString('en-IN')} sq.ft</span>
                      </span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {occupancyPct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-apple-accent rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Tenant Details */}
                  <div className="mt-4 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Current Tenant:</span>
                      <span className="font-semibold truncate max-w-[160px]">
                        {g.currentTenant || <span className="text-gray-400 italic font-normal">Vacant</span>}
                      </span>
                    </div>
                    {g.tenantPhone && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Phone:</span>
                        <span>{g.tenantPhone}</span>
                      </div>
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

      {/* Add / Edit Godown Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGodown ? 'Edit Godown Property' : 'Add New Godown Property'}
        description="Fill in facility measurements, tenancy, and monthly billing rates."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Godown Name" required>
              <Input
                placeholder="e.g. Unit A - Auto Logistics"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Facility Code">
              <Input
                placeholder="e.g. GDW-01"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Location / Address" required>
            <Input
              placeholder="e.g. Plot 42, IDA Cherlapally, Hyderabad"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Total Capacity (sq.ft)" required>
              <Input
                type="number"
                placeholder="e.g. 15000"
                value={formData.capacitySqFt}
                onChange={(e) => setFormData({ ...formData, capacitySqFt: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Occupied (sq.ft)">
              <Input
                type="number"
                placeholder="e.g. 15000"
                value={formData.occupiedSqFt}
                onChange={(e) => setFormData({ ...formData, occupiedSqFt: e.target.value })}
              />
            </FormField>

            <FormField label="Monthly Rent (₹)" required>
              <Input
                type="number"
                placeholder="e.g. 75000"
                value={formData.monthlyRent}
                onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Current Tenant">
              <Input
                placeholder="e.g. Reliance Retail"
                value={formData.currentTenant}
                onChange={(e) => setFormData({ ...formData, currentTenant: e.target.value })}
              />
            </FormField>

            <FormField label="Tenant Phone">
              <Input
                placeholder="e.g. +91 98765 43210"
                value={formData.tenantPhone}
                onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
              />
            </FormField>

            <FormField label="Facility Status">
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Internal Notes & Lease terms">
            <Textarea
              placeholder="Key specifications, power capacity, lease expiration dates..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
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
              {editingGodown ? 'Update Godown' : 'Create Godown'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
