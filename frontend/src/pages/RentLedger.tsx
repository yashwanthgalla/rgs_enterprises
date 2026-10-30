import React, { useState, useEffect } from 'react';
import {
  ReceiptText,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  IndianRupee,
  CreditCard,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Input, Select, Textarea } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { rentApi, godownApi } from '../services/api';
import { RentEntry, Godown } from '../types';

export const RentLedger: React.FC = () => {
  const { formatCurrency } = useSettings();
  const { success, error } = useToast();

  const [rents, setRents] = useState<RentEntry[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Payment Recording Modal
  const [selectedRent, setSelectedRent] = useState<RentEntry | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amountPaid: '',
    paymentMethod: 'UPI',
    referenceNumber: '',
    notes: '',
  });

  // Create Rent Invoice Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createData, setCreateData] = useState({
    godownId: '',
    tenantName: '',
    month: new Date().toISOString().slice(0, 7),
    dueDate: new Date().toISOString().slice(0, 10),
    amountDue: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchRents = async () => {
    setLoading(true);
    try {
      const [rRes, gRes] = await Promise.all([
        rentApi.getAll({ size: 100 }),
        godownApi.getAllList().catch(() => godownApi.getAll(0, 100)),
      ]);

      const rentList = Array.isArray(rRes) ? rRes : (rRes as any)?.content || [];
      const godownList = Array.isArray(gRes) ? gRes : (gRes as any)?.content || [];

      setRents(rentList);
      setGodowns(godownList);
    } catch (err: any) {
      error('Failed to load rent roll: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRents();
  }, []);

  const openPayModal = (rent: RentEntry) => {
    setSelectedRent(rent);
    setPaymentData({
      amountPaid: String(rent.amountDue - (rent.amountPaid || 0)),
      paymentMethod: 'UPI',
      referenceNumber: '',
      notes: '',
    });
    setIsPayModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRent) return;

    setSubmitting(true);
    try {
      await rentApi.recordPayment(selectedRent.id, {
        amountPaid: Number(paymentData.amountPaid),
        paymentMethod: paymentData.paymentMethod,
        referenceNumber: paymentData.referenceNumber || undefined,
        notes: paymentData.notes || undefined,
      });

      success('Payment recorded successfully!');
      setIsPayModalOpen(false);
      fetchRents();
    } catch (err: any) {
      error('Failed to record payment: ' + (err.message || 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createData.godownId || !createData.amountDue) {
      error('Please specify godown and amount due');
      return;
    }

    setSubmitting(true);
    try {
      const selectedG = godowns.find((g) => g.id === Number(createData.godownId));
      const year = parseInt(createData.month.split('-')[0], 10);

      await rentApi.create({
        godownId: Number(createData.godownId),
        tenantName: createData.tenantName || selectedG?.currentTenant || 'Tenant',
        month: createData.month,
        year: year,
        amountDue: Number(createData.amountDue),
        dueDate: createData.dueDate,
        status: 'DUE',
      });

      success('Rent ledger entry added');
      setIsCreateModalOpen(false);
      fetchRents();
    } catch (err: any) {
      error('Failed to add entry: ' + (err.message || 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  // Calculations
  const totalDue = rents.reduce((acc, r) => acc + (r.amountDue || 0), 0);
  const totalCollected = rents.reduce((acc, r) => acc + (r.amountPaid || 0), 0);
  const totalPending = Math.max(0, totalDue - totalCollected);

  const filteredRents = rents.filter((r) => {
    const matchesSearch =
      (r.tenantName && r.tenantName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.godownName && r.godownName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.month.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Rent Ledger & Invoicing
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Track monthly lease obligations, collect payments, and manage balances
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
          className="rounded-xl shadow-apple-sm"
        >
          Add Rent Schedule
        </Button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Billed</span>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{formatCurrency(totalDue)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-apple-accent/10 text-apple-accent">
            <ReceiptText className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Collected</span>
            <p className="text-xl font-bold text-apple-success mt-0.5">{formatCurrency(totalCollected)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-apple-success/10 text-apple-success">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Pending Dues</span>
            <p className="text-xl font-bold text-apple-danger mt-0.5">{formatCurrency(totalPending)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-apple-danger/10 text-apple-danger">
            <AlertCircle className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Input
            placeholder="Search by tenant name, month, or godown..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
        </div>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="ALL">All Statuses</option>
          <option value="PAID">Paid</option>
          <option value="DUE">Due</option>
          <option value="OVERDUE">Overdue</option>
          <option value="PARTIAL">Partial</option>
        </Select>
      </div>

      {/* Rent Roll Table */}
      <Card className="p-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Godown / Tenant</th>
                <th className="py-3 px-3">Month</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3">Amount Due</th>
                <th className="py-3 px-3">Paid</th>
                <th className="py-3 px-3">Balance</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Loading rent ledger...
                  </td>
                </tr>
              ) : filteredRents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No rent records matching the filter.
                  </td>
                </tr>
              ) : (
                filteredRents.map((r) => {
                  const balance = (r.amountDue || 0) - (r.amountPaid || 0);
                  return (
                    <tr key={r.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                      <td className="py-3.5 px-3">
                        <p className="font-bold text-gray-900 dark:text-gray-100">{r.tenantName}</p>
                        <p className="text-[11px] text-gray-400">{r.godownName || `Godown #${r.godownId}`}</p>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-gray-800 dark:text-gray-200">
                        {r.month}
                      </td>
                      <td className="py-3.5 px-3 text-gray-500">
                        {r.dueDate}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(r.amountDue)}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-apple-success">
                        {formatCurrency(r.amountPaid)}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-apple-danger">
                        {formatCurrency(balance)}
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge
                          variant={r.status === 'PAID' ? 'success' : r.status === 'OVERDUE' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {r.status !== 'PAID' ? (
                          <Button
                            size="sm"
                            onClick={() => openPayModal(r)}
                            icon={<CreditCard className="w-3.5 h-3.5" />}
                          >
                            Pay
                          </Button>
                        ) : (
                          <span className="text-[11px] text-apple-success font-semibold">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Record Rent Payment"
        description={`Logging payment for ${selectedRent?.tenantName} (${selectedRent?.month})`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <FormField label="Amount Received (₹)" required>
            <Input
              type="number"
              value={paymentData.amountPaid}
              onChange={(e) => setPaymentData({ ...paymentData, amountPaid: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Payment Method">
            <Select
              value={paymentData.paymentMethod}
              onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
            >
              <option value="UPI">UPI (PhonePe, GPay, Paytm)</option>
              <option value="NEFT">Bank Transfer (NEFT / RTGS / IMPS)</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CASH">Cash Deposit</option>
            </Select>
          </FormField>

          <FormField label="UTR / Transaction Ref">
            <Input
              placeholder="e.g. UTR49281948291"
              value={paymentData.referenceNumber}
              onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
            />
          </FormField>

          <FormField label="Remarks">
            <Textarea
              placeholder="Optional notes or receipt acknowledgement"
              value={paymentData.notes}
              onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button type="button" variant="outline" onClick={() => setIsPayModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Rent Due Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule Rent Due"
        description="Add a new rent invoice to the ledger."
      >
        <form onSubmit={handleCreateRent} className="space-y-4">
          <FormField label="Select Godown Facility" required>
            <Select
              value={createData.godownId}
              onChange={(e) => {
                const gId = e.target.value;
                const g = godowns.find((item) => item.id === Number(gId));
                setCreateData({
                  ...createData,
                  godownId: gId,
                  tenantName: g?.currentTenant || '',
                  amountDue: g ? String(g.monthlyRent || '') : createData.amountDue,
                });
              }}
              required
            >
              <option value="">-- Choose Godown --</option>
              {godowns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.location}) - {g.currentTenant || 'Vacant'}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Tenant Name">
            <Input
              value={createData.tenantName}
              onChange={(e) => setCreateData({ ...createData, tenantName: e.target.value })}
              placeholder="Tenant legal name"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Billing Month" required>
              <Input
                type="month"
                value={createData.month}
                onChange={(e) => setCreateData({ ...createData, month: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Due Date" required>
              <Input
                type="date"
                value={createData.dueDate}
                onChange={(e) => setCreateData({ ...createData, dueDate: e.target.value })}
                required
              />
            </FormField>
          </div>

          <FormField label="Amount Due (₹)" required>
            <Input
              type="number"
              value={createData.amountDue}
              onChange={(e) => setCreateData({ ...createData, amountDue: e.target.value })}
              required
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
