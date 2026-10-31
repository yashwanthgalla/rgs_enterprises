import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse,
  ReceiptText,
  Receipt,
  TrendingUp,
  AlertTriangle,
  Plus,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Building,
  RefreshCw,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, godownApi } from '../services/api';
import { Godown } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const { user } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, remindersRes, godownsRes] = await Promise.allSettled([
        dashboardApi.getStats(),
        dashboardApi.getReminders(),
        godownApi.getAll(0, 5),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      }
      if (remindersRes.status === 'fulfilled' && remindersRes.value) {
        setReminders(Array.isArray(remindersRes.value) ? remindersRes.value : []);
      }
      if (godownsRes.status === 'fulfilled' && godownsRes.value) {
        const data = godownsRes.value as any;
        setGodowns(Array.isArray(data) ? data : data.content || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Welcome, {user?.fullName || user?.username || 'Administrator'}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time operations, occupancy tracking, and rental cashflow
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/godowns')}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            New Godown
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Godowns"
          value={stats?.totalGodowns ?? godowns.length ?? 0}
          subtitle={`${stats?.totalCapacitySqFt?.toLocaleString('en-IN') || 0} sq.ft total`}
          icon={Warehouse}
          color="blue"
          onClick={() => navigate('/godowns')}
        />

        <StatCard
          title="Occupancy Rate"
          value={`${stats?.occupancyRate ? Math.round(stats.occupancyRate) : 0}%`}
          subtitle={`${stats?.occupiedCapacitySqFt?.toLocaleString('en-IN') || 0} sq.ft leased`}
          icon={Building}
          color="green"
          trend={{
            value: `${stats?.occupancyRate ? Math.round(stats.occupancyRate) : 0}% Active`,
            isPositive: (stats?.occupancyRate || 0) >= 70,
          }}
          onClick={() => navigate('/godowns')}
        />

        <StatCard
          title="Rent Expected"
          value={formatCurrency(stats?.monthlyRentExpected || 0)}
          subtitle={`Collected: ${formatCurrency(stats?.monthlyRentCollected || 0)}`}
          icon={ReceiptText}
          color="purple"
          onClick={() => navigate('/rent-ledger')}
        />

        <StatCard
          title="Pending Rent"
          value={formatCurrency(stats?.pendingRent || 0)}
          subtitle={`Bills: ${formatCurrency(stats?.totalExpensesThisMonth || 0)}`}
          icon={AlertTriangle}
          color="amber"
          onClick={() => navigate('/rent-ledger')}
        />
      </div>

      {/* Split Section: Quick Reminders & Warehouse Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Action Reminders */}
        <Card className="lg:col-span-1 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-apple-warning" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Urgent Reminders
                </h2>
              </div>
              <Badge variant="warning" size="sm">
                {reminders.length} Active
              </Badge>
            </div>

            <div className="divide-y divide-black/[0.04] dark:divide-white/[0.06] mt-2 max-h-[340px] overflow-y-auto">
              {reminders.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-apple-success opacity-80" />
                  All godowns, rent schedules, and bills are up to date!
                </div>
              ) : (
                reminders.map((r, idx) => (
                  <div key={idx} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {r.title || r.godownName || 'Alert'}
                      </p>
                      <p className="text-gray-400 text-[11px] mt-0.5">{r.message || r.description}</p>
                    </div>
                    {r.dueDate && (
                      <span className="text-[10px] text-apple-danger font-medium shrink-0">
                        Due: {r.dueDate}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate('/rent-ledger')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Review Rent Roll
            </Button>
          </div>
        </Card>

        {/* Godown Snapshot Table */}
        <Card className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Warehouse Portfolio Snapshot
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Latest facility records and tenancy
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/godowns')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View All
              </Button>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-2">Godown</th>
                    <th className="py-3 px-2">Location</th>
                    <th className="py-3 px-2">Capacity</th>
                    <th className="py-3 px-2">Tenant</th>
                    <th className="py-3 px-2">Monthly Rent</th>
                    <th className="py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                  {godowns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        No godowns registered yet. Click &quot;New Godown&quot; to add your first facility.
                      </td>
                    </tr>
                  ) : (
                    godowns.slice(0, 5).map((g) => (
                      <tr
                        key={g.id}
                        onClick={() => navigate(`/godowns/${g.id}`)}
                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-2 font-semibold text-gray-900 dark:text-gray-100">
                          {g.name}
                        </td>
                        <td className="py-3 px-2 text-gray-500 dark:text-gray-400">
                          {g.location}
                        </td>
                        <td className="py-3 px-2 text-gray-500 dark:text-gray-400">
                          {g.capacitySqFt.toLocaleString('en-IN')} sq.ft
                        </td>
                        <td className="py-3 px-2 text-gray-700 dark:text-gray-300">
                          {g.currentTenant || <span className="text-gray-400 italic">Vacant</span>}
                        </td>
                        <td className="py-3 px-2 font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(g.monthlyRent)}
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={g.status === 'ACTIVE' ? 'success' : g.status === 'MAINTENANCE' ? 'warning' : 'neutral'}
                            size="sm"
                          >
                            {g.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/expenses')}
              icon={<Receipt className="w-3.5 h-3.5" />}
            >
              New Bill
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/rent-ledger')}
              icon={<ReceiptText className="w-3.5 h-3.5" />}
            >
              Record Rent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/documents')}
              icon={<Calendar className="w-3.5 h-3.5" />}
            >
              Doc Vault
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/reports')}
              icon={<TrendingUp className="w-3.5 h-3.5" />}
            >
              P&L Report
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

