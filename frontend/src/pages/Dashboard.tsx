import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
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
  Info,
  CreditCard,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, godownApi } from '../services/api';
import { Godown } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading, isFetching: statsFetching, refetch: refetchStats } = useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => dashboardApi.getStats(),
  });

  const { data: reminders = [], isLoading: remindersLoading, refetch: refetchReminders } = useQuery({
    queryKey: queryKeys.dashboard.reminders(),
    queryFn: async () => {
      const res = await dashboardApi.getReminders();
      return Array.isArray(res) ? res : [];
    },
  });

  const { data: godowns = [], isLoading: hubsLoading, refetch: refetchHubs } = useQuery({
    queryKey: queryKeys.hubs.list({ page: 0, size: 5 }),
    queryFn: async () => {
      const res: any = await godownApi.getAll(0, 5);
      return Array.isArray(res) ? res : res?.content || [];
    },
  });

  const loading = (statsLoading && !stats) || (remindersLoading && reminders.length === 0);
  const isRefreshing = statsFetching;

  const fetchDashboardData = () => {
    refetchStats();
    refetchReminders();
    refetchHubs();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-apple-sm border border-black/10 dark:border-white/10 shrink-0 bg-white">
            <img
              src="/2.jpeg"
              alt="RGS Enterprises Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Welcome, {user?.fullName || user?.username || 'Administrator'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Real-time operations, facility tracking, and rental cashflow
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/hubs')}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            New Hub
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && !stats ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Hubs"
              value={stats?.totalGodowns ?? godowns.length ?? 0}
              subtitle={`${stats?.totalCapacitySqFt?.toLocaleString('en-IN') || 0} sq.ft total`}
              icon={Warehouse}
              color="blue"
              onClick={() => navigate('/hubs')}
            />

            <StatCard
              title="Total Revenue / Month"
              value={formatCurrency(stats?.monthlyTotalRevenue || 0)}
              subtitle="Monthly portfolio revenue"
              icon={TrendingUp}
              color="green"
              onClick={() => navigate('/finance/revenue')}
            />

            <StatCard
              title="Profit / Month"
              value={formatCurrency(stats?.monthlyProfit ?? ((stats?.monthlyTotalRevenue ?? 0) - (stats?.monthlyRentTotal ?? 0)))}
              subtitle="Monthly net profit"
              icon={TrendingUp}
              color="purple"
              onClick={() => navigate('/finance')}
            />

            <StatCard
              title="Total Rent / Month"
              value={formatCurrency(stats?.monthlyRentTotal || 0)}
              subtitle="Monthly portfolio rent outflow"
              icon={CreditCard}
              color="amber"
              onClick={() => navigate('/finance/rent')}
            />
          </>
        )}
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
                  All hubs, rent schedules, and bills are up to date!
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
              onClick={() => navigate('/finance/rent')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Review Rent
            </Button>
          </div>
        </Card>

        {/* Godown Snapshot Table */}
        <Card className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Hubs Portfolio Snapshot
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Latest facility records and tenancy
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/hubs')}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View All
              </Button>
            </div>

            <div className="overflow-x-auto mt-2">
              {loading && godowns.length === 0 ? (
                <TableSkeleton rows={4} cols={6} />
              ) : (
                <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-2">Hub</th>
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
                        No hubs registered yet. Click &quot;New Hub&quot; to add your first facility.
                      </td>
                    </tr>
                  ) : (
                    godowns.slice(0, 5).map((g) => (
                      <tr
                        key={g.id}
                        onClick={() => navigate(`/hubs/${g.id}`)}
                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-2 font-semibold text-gray-900 dark:text-gray-100">
                          <div className="flex items-center gap-2">
                            {g.code && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-apple-accent/10 text-apple-accent dark:bg-apple-accent/20 font-bold shrink-0">
                                {g.code}
                              </span>
                            )}
                            <span className="truncate">{g.erpName || g.name}</span>
                          </div>
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
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/information/electricity')}
              icon={<Info className="w-3.5 h-3.5" />}
            >
              Information
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/rent')}
              icon={<Receipt className="w-3.5 h-3.5" />}
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

