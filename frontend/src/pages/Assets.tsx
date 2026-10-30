import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Plus,
  ShieldAlert,
  Calendar,
  Building,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Input, Select, Textarea } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { assetApi, godownApi } from '../services/api';
import { Asset, Godown } from '../types';

export const Assets: React.FC = () => {
  const { formatCurrency } = useSettings();
  const { success, error } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    godownId: '',
    category: 'CCTV',
    serialNumber: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchaseCost: '',
    warrantyExpiry: '',
    status: 'OPERATIONAL',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const [aRes, gRes] = await Promise.all([
        assetApi.getAll({ size: 100 }),
        godownApi.getAllList().catch(() => godownApi.getAll(0, 100)),
      ]);

      const assetList = Array.isArray(aRes) ? aRes : (aRes as any)?.content || [];
      const gList = Array.isArray(gRes) ? gRes : (gRes as any)?.content || [];

      setAssets(assetList);
      setGodowns(gList);
    } catch (err: any) {
      error('Failed to load assets: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.godownId) {
      error('Please provide asset name and facility');
      return;
    }

    setSubmitting(true);
    try {
      await assetApi.create({
        name: formData.name,
        godownId: Number(formData.godownId),
        category: formData.category,
        serialNumber: formData.serialNumber || undefined,
        purchaseDate: formData.purchaseDate || undefined,
        purchaseCost: formData.purchaseCost ? Number(formData.purchaseCost) : undefined,
        warrantyExpiry: formData.warrantyExpiry || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
      });

      success('Equipment record registered');
      setIsModalOpen(false);
      fetchAssets();
    } catch (err: any) {
      error('Failed to create asset: ' + (err.message || 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAsset = async (id: number) => {
    if (!window.confirm('Delete this asset entry?')) return;
    try {
      await assetApi.delete(id);
      success('Asset deleted');
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      error('Failed to delete asset: ' + err.message);
    }
  };

  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.serialNumber && a.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.godownName && a.godownName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'ALL' || a.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Assets & Infrastructure Register
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            CCTV cameras, fire extinguishers, high-bay lights, generators, and equipment warranties
          </p>
        </div>

        <Button
          onClick={() => {
            setFormData({
              name: '',
              godownId: godowns[0] ? String(godowns[0].id) : '',
              category: 'CCTV',
              serialNumber: '',
              purchaseDate: new Date().toISOString().slice(0, 10),
              purchaseCost: '',
              warrantyExpiry: '',
              status: 'OPERATIONAL',
              notes: '',
            });
            setIsModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
          className="rounded-xl shadow-apple-sm"
        >
          Add Equipment
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Input
            placeholder="Search by equipment name, serial number, or warehouse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
        </div>

        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="ALL">All Categories</option>
          <option value="CCTV">CCTV Systems</option>
          <option value="FIRE_SAFETY">Fire Safety</option>
          <option value="GENERATOR">Generator / UPS</option>
          <option value="FORKLIFT">Forklifts / Ramps</option>
          <option value="LIGHTING">High-bay Lighting</option>
          <option value="HVAC">Ventilation & HVAC</option>
          <option value="OTHER">Other Equipment</option>
        </Select>
      </div>

      {/* Assets Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-gray-400">
          Loading equipment assets...
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card className="p-10 text-center text-xs text-gray-400">
          No equipment records found. Log your safety infrastructure.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{asset.name}</h3>
                    <p className="text-xs text-apple-accent font-medium mt-0.5">{asset.category}</p>
                  </div>
                  <Badge
                    variant={asset.status === 'OPERATIONAL' ? 'success' : asset.status === 'NEEDS_REPAIR' ? 'warning' : 'danger'}
                    size="sm"
                  >
                    {asset.status}
                  </Badge>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <p className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-gray-400" />
                    <span>{asset.godownName || `Godown #${asset.godownId}`}</span>
                  </p>
                  {asset.serialNumber && (
                    <p className="text-gray-400 font-mono text-[11px]">
                      S/N: {asset.serialNumber}
                    </p>
                  )}
                  {asset.warrantyExpiry && (
                    <p className="flex items-center gap-1.5 text-gray-500">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>Warranty Expiry: {asset.warrantyExpiry}</span>
                    </p>
                  )}
                  {asset.notes && (
                    <p className="mt-2 text-gray-400 italic text-[11px]">
                      {asset.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Cost</span>
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    {asset.purchaseCost ? formatCurrency(asset.purchaseCost) : 'N/A'}
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteAsset(asset.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-apple-danger hover:bg-apple-danger/10 transition-colors"
                  title="Delete asset"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Asset Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Equipment / Asset"
        description="Register a safety device, machine, or warehouse fixture."
      >
        <form onSubmit={handleCreateAsset} className="space-y-4">
          <FormField label="Asset / Equipment Name" required>
            <Input
              placeholder="e.g. Hikvision 8CH 4K IP CCTV Kit"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Assigned Godown" required>
              <Select
                value={formData.godownId}
                onChange={(e) => setFormData({ ...formData, godownId: e.target.value })}
                required
              >
                <option value="">-- Choose Godown --</option>
                {godowns.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Category">
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              >
                <option value="CCTV">CCTV Systems</option>
                <option value="FIRE_SAFETY">Fire Safety</option>
                <option value="GENERATOR">Generator / UPS</option>
                <option value="FORKLIFT">Forklift / Ramp</option>
                <option value="LIGHTING">High-bay Lighting</option>
                <option value="HVAC">HVAC / Ventilation</option>
                <option value="OTHER">Other</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Serial Number">
              <Input
                placeholder="e.g. SN-89218491"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
            </FormField>

            <FormField label="Cost (₹)">
              <Input
                type="number"
                placeholder="e.g. 45000"
                value={formData.purchaseCost}
                onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Purchase Date">
              <Input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              />
            </FormField>

            <FormField label="Warranty Expiry">
              <Input
                type="date"
                value={formData.warrantyExpiry}
                onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Operational Status">
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="OPERATIONAL">OPERATIONAL</option>
              <option value="NEEDS_REPAIR">NEEDS REPAIR</option>
              <option value="DECOMMISSIONED">DECOMMISSIONED</option>
            </Select>
          </FormField>

          <FormField label="Maintenance Notes">
            <Textarea
              placeholder="AMC provider, servicing schedule, filter changes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Equipment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
