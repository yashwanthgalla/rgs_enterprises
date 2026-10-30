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

  const occupancyPct = godown.capacitySqFt > 0 ? Math.round(((godown.occupiedSqFt || 0) / godown.capacitySqFt) * 100) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/godowns')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            All Godowns
          </Button>
          <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {godown.name}
          </h1>
          <Badge
            variant={godown.status === 'ACTIVE' ? 'success' : godown.status === 'MAINTENANCE' ? 'warning' : 'neutral'}
            size="sm"
          >
            {godown.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRentFormData({
                amountDue: String(godown.monthlyRent || ''),
                month: new Date().toISOString().slice(0, 7),
                dueDate: new Date().toISOString().slice(0, 10),
                tenantName: godown.currentTenant || '',
              });
              setIsRentModalOpen(true);
            }}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            New Rent Due
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
            <span className="text-xs text-gray-400 uppercase font-semibold">Location</span>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-apple-accent shrink-0" />
              <span>{godown.location}</span>
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Capacity & Occupancy</span>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
              {godown.capacitySqFt.toLocaleString('en-IN')} sq.ft ({occupancyPct}%)
            </p>
            <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-apple-accent rounded-full"
                style={{ width: `${Math.min(occupancyPct, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Contract Rent</span>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {formatCurrency(godown.monthlyRent)}
              <span className="text-xs font-normal text-gray-400"> / month</span>
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Current Tenant</span>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
              {godown.currentTenant || <span className="italic text-gray-400">Vacant</span>}
            </p>
            {godown.tenantPhone && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span>{godown.tenantPhone}</span>
              </p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-sm mb-4">Facility Information</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-gray-400">Facility ID:</span>
                <span className="font-mono">#{godown.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-gray-400">Facility Code:</span>
                <span>{godown.code || 'None'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-gray-400">Total Area:</span>
                <span>{godown.capacitySqFt.toLocaleString('en-IN')} sq.ft</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-gray-400">Occupied Area:</span>
                <span>{(godown.occupiedSqFt || 0).toLocaleString('en-IN')} sq.ft</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-gray-400">Vacant Space:</span>
                <span>{Math.max(0, godown.capacitySqFt - (godown.occupiedSqFt || 0)).toLocaleString('en-IN')} sq.ft</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-sm mb-4">Contract & Tenancy Terms</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-gray-400">Tenant Name:</span>
                <span className="font-medium">{godown.currentTenant || 'None'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-gray-400">Contact Email:</span>
                <span>{godown.tenantEmail || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-gray-400">Contact Phone:</span>
                <span>{godown.tenantPhone || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-gray-400">Lease Dates:</span>
                <span>{godown.leaseStartDate || 'N/A'} to {godown.leaseEndDate || 'N/A'}</span>
              </div>
            </div>

            {godown.notes && (
              <div className="mt-4 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] text-xs text-gray-500">
                <span className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Notes:</span>
                {godown.notes}
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
