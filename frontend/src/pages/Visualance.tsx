import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  Filter,
  RefreshCw,
  Edit,
  Warehouse,
  Lock,
  Globe,
  User,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { FormField, Input } from '../components/ui/Input';
import { CardSkeleton } from '../components/ui/Skeleton';
import { AdminPasswordModal } from '../components/common/AdminPasswordModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { godownApi } from '../services/api';
import { Godown } from '../types';

export const Visualance: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIGURED' | 'PENDING'>('ALL');

  // Track visible passwords by hub ID
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  // Track revealed decrypted passwords: { [hubId: number]: string }
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, string>>({});
  // Track copied states: { [key: string]: boolean } (e.g. 'pwd-12', 'url-12')
  const [copiedKeys, setCopiedKeys] = useState<Record<string, boolean>>({});

  // Admin Verification Modal State
  const [verifyingHub, setVerifyingHub] = useState<{ hub: Godown; action: 'view' | 'copy' } | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHub, setEditingHub] = useState<Godown | null>(null);
  const [editForm, setEditForm] = useState({
    cctvAccessUrl: '',
    cctvUsername: '',
    cctvPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const fetchGodowns = async (skipCache = false) => {
    setLoading(true);
    try {
      const res: any = await godownApi.getAll(0, 100, skipCache);
      const data = Array.isArray(res) ? res : res?.content || [];
      setGodowns(data);
    } catch (err: any) {
      error('Failed to load CCTV hub records: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGodowns();
  }, []);

  const handleCopy = (text: string, key: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKeys((prev) => ({ ...prev, [key]: true }));
    success(`${label} copied to clipboard`);
    setTimeout(() => {
      setCopiedKeys((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const handlePasswordAction = (hub: Godown, action: 'view' | 'copy') => {
    if (!isAdmin) {
      error('Access restricted: Only Administrators can view or copy CCTV credentials.');
      return;
    }

    // If already verified and revealed in this session
    if (revealedPasswords[hub.id] !== undefined) {
      if (action === 'view') {
        setVisiblePasswords((prev) => ({ ...prev, [hub.id]: !prev[hub.id] }));
      } else {
        handleCopy(revealedPasswords[hub.id], `pwd-${hub.id}`, 'CCTV Password');
      }
      return;
    }

    // Require administrator password verification
    setVerifyingHub({ hub, action });
  };

  const handleAdminVerify = async (adminPassword: string): Promise<boolean> => {
    if (!verifyingHub) return false;
    try {
      const res: any = await godownApi.revealCctvPassword(verifyingHub.hub.id, adminPassword);
      const plainPassword = res?.cctvPassword || '';
      setRevealedPasswords((prev) => ({ ...prev, [verifyingHub.hub.id]: plainPassword }));

      if (verifyingHub.action === 'view') {
        setVisiblePasswords((prev) => ({ ...prev, [verifyingHub.hub.id]: true }));
      } else {
        handleCopy(plainPassword, `pwd-${verifyingHub.hub.id}`, 'CCTV Password');
      }
      return true;
    } catch (err: any) {
      throw new Error(err.message || 'Incorrect administrator password.');
    }
  };

  const openEditModal = (hub: Godown) => {
    setEditingHub(hub);
    setEditForm({
      cctvAccessUrl: hub.cctvAccessUrl || '',
      cctvUsername: hub.cctvUsername || '',
      cctvPassword: hub.cctvPassword || '',
    });
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  const handleSaveCctv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHub) return;

    setSaving(true);
    try {
      await godownApi.update(editingHub.id, {
        ...editingHub,
        cctvAccessUrl: editForm.cctvAccessUrl.trim() || null,
        cctvUsername: editForm.cctvUsername.trim() || null,
        cctvPassword: editForm.cctvPassword.trim() || null,
      });

      success(`CCTV details updated for ${editingHub.erpName || editingHub.name}`);
      setIsEditModalOpen(false);
      // Refresh list
      fetchGodowns(true);
    } catch (err: any) {
      error('Failed to update CCTV details: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Filtered list
  const filteredHubs = useMemo(() => {
    return godowns.filter((g) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (g.name && g.name.toLowerCase().includes(q)) ||
        (g.erpName && g.erpName.toLowerCase().includes(q)) ||
        (g.code && g.code.toLowerCase().includes(q)) ||
        (g.city && g.city.toLowerCase().includes(q)) ||
        (g.location && g.location.toLowerCase().includes(q)) ||
        (g.cctvUsername && g.cctvUsername.toLowerCase().includes(q)) ||
        (g.cctvAccessUrl && g.cctvAccessUrl.toLowerCase().includes(q));

      const isConfigured = Boolean(g.cctvAccessUrl || g.cctvUsername || g.cctvPassword);

      if (statusFilter === 'CONFIGURED') {
        return matchSearch && isConfigured;
      }
      if (statusFilter === 'PENDING') {
        return matchSearch && !isConfigured;
      }
      return matchSearch;
    });
  }, [godowns, searchQuery, statusFilter]);

  // Summary Metrics
  const totalHubs = godowns.length;
  const configuredCount = godowns.filter((g) => g.cctvAccessUrl || g.cctvUsername || g.cctvPassword).length;
  const pendingCount = totalHubs - configuredCount;
  const liveUrlCount = godowns.filter((g) => Boolean(g.cctvAccessUrl)).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] shadow-apple-sm">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-gray-100 flex items-center gap-2">
                <span>Visualance</span>
                <Badge variant="neutral" size="sm" className="font-medium text-[11px]">
                  CCTV Surveillance
                </Badge>
              </h1>
              <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                Centralized CCTV surveillance monitoring, live feed access, NVR credentials, and camera configuration across all hubs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchGodowns(true)}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            className="rounded-xl shadow-apple-sm text-xs font-semibold"
          >
            Refresh Feeds
          </Button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col border border-[#E5E7EB] bg-white rounded-2xl shadow-apple-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#6B7280]">
              Total Facilities
            </span>
            <div className="p-2 rounded-xl bg-[#0071E3]/10 text-[#0071E3]">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex-1 flex flex-col justify-between">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
              {totalHubs}
            </div>
            <div className="min-h-[1.25rem] flex items-center gap-2 mt-2 text-xs text-[#6B7280]">
              Total managed warehouse hubs
            </div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col border border-[#E5E7EB] bg-white rounded-2xl shadow-apple-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#6B7280]">
              CCTV Configured
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex-1 flex flex-col justify-between">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600">
              {configuredCount}
            </div>
            <div className="min-h-[1.25rem] flex items-center gap-2 mt-2 text-xs text-[#6B7280]">
              {totalHubs > 0 ? `${Math.round((configuredCount / totalHubs) * 100)}% coverage` : '0% coverage'}
            </div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col border border-[#E5E7EB] bg-white rounded-2xl shadow-apple-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#6B7280]">
              Live Feed Portals
            </span>
            <div className="p-2 rounded-xl bg-[#0071E3]/10 text-[#0071E3]">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex-1 flex flex-col justify-between">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0071E3]">
              {liveUrlCount}
            </div>
            <div className="min-h-[1.25rem] flex items-center gap-2 mt-2 text-xs text-[#6B7280]">
              Direct web / IP surveillance links
            </div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col border border-[#E5E7EB] bg-white rounded-2xl shadow-apple-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#6B7280]">
              Pending Setup
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex-1 flex flex-col justify-between">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600">
              {pendingCount}
            </div>
            <div className="min-h-[1.25rem] flex items-center gap-2 mt-2 text-xs text-[#6B7280]">
              Awaiting camera credentials / IP
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border border-[#E5E7EB] bg-white rounded-2xl shadow-apple-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by hub name, code, location, username, or camera IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center p-1 bg-[#F3F4F6] rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-[#111827] shadow-apple-sm'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              All Hubs ({totalHubs})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('CONFIGURED')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'CONFIGURED'
                  ? 'bg-white text-emerald-600 shadow-apple-sm'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Configured ({configuredCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-white text-amber-600 shadow-apple-sm'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              Pending ({pendingCount})
            </button>
          </div>
        </div>
      </Card>

      {/* CCTV Hub Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredHubs.length === 0 ? (
        <Card className="p-12 text-center border border-[#E5E7EB] bg-white rounded-2xl shadow-apple-sm">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
            <Video className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">No Hubs Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No facility matches "${searchQuery}". Try a different keyword.`
              : 'No facilities match the selected filter.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredHubs.map((hub) => {
            const hasCctv = Boolean(hub.cctvAccessUrl || hub.cctvUsername || hub.cctvPassword);
            const isPasswordVisible = !!visiblePasswords[hub.id];
            const pwdCopyKey = `pwd-${hub.id}`;
            const urlCopyKey = `url-${hub.id}`;
            const userCopyKey = `user-${hub.id}`;

            const formattedUrl = hub.cctvAccessUrl
              ? hub.cctvAccessUrl.startsWith('http://') || hub.cctvAccessUrl.startsWith('https://')
                ? hub.cctvAccessUrl
                : `http://${hub.cctvAccessUrl}`
              : '';

            return (
              <Card
                key={hub.id}
                className="p-5 border border-[#E5E7EB] bg-white rounded-2xl shadow-apple-sm flex flex-col justify-between hover:border-[#0071E3]/40 transition-all duration-150"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between pb-3.5 border-b border-[#F3F4F6] gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-[#111827] truncate">
                          {hub.erpName || hub.name}
                        </h2>
                        {hub.code && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#0071E3]/10 text-[#0071E3]">
                            {hub.code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-1.5 truncate">
                        <span>{hub.location || hub.address || hub.city || 'Hub Facility'}</span>
                        {hub.city && <span className="text-gray-300">•</span>}
                        {hub.city && <span className="font-medium text-gray-700">{hub.city}</span>}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Badge
                        variant={hasCctv ? 'success' : 'warning'}
                        size="sm"
                        className="font-semibold text-[11px]"
                      >
                        {hasCctv ? 'CCTV Online' : 'Pending'}
                      </Badge>
                    </div>
                  </div>

                  {/* CCTV Stream / Access Portal URL */}
                  <div className="mt-4 p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[#0071E3]" />
                        <span>CCTV Access URL / IP</span>
                      </span>
                      {hub.cctvAccessUrl && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(hub.cctvAccessUrl || '', urlCopyKey, 'CCTV URL')}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                            title="Copy CCTV Access URL"
                          >
                            {copiedKeys[urlCopyKey] ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {hub.cctvAccessUrl ? (
                      <div className="flex items-center justify-between gap-3">
                        <code className="text-xs font-mono font-semibold text-gray-800 truncate block">
                          {hub.cctvAccessUrl}
                        </code>
                        <a
                          href={formattedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0071E3]/90 text-white text-xs font-semibold shadow-apple-sm shrink-0 transition-colors"
                        >
                          <span>Open Feed</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between py-1 text-xs text-amber-700">
                        <span className="italic flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          No access URL or IP configured
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(hub)}
                          className="text-xs text-[#0071E3] font-semibold h-7 px-2"
                        >
                          + Configure URL
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Credentials Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {/* Username */}
                    <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block mb-1 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>Username</span>
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-semibold text-[#111827] truncate">
                          {hub.cctvUsername || <span className="text-gray-400 font-sans italic">Not set</span>}
                        </span>
                        {hub.cctvUsername && (
                          <button
                            type="button"
                            onClick={() => handleCopy(hub.cctvUsername || '', userCopyKey, 'Username')}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors shrink-0"
                            title="Copy Username"
                          >
                            {copiedKeys[userCopyKey] ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Password */}
                    <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Password</span>
                        </span>
                        {!isAdmin && (
                          <span className="text-[9px] px-1.5 py-0.5 font-semibold text-amber-700 bg-amber-100 rounded">
                            Admin Only
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-semibold text-[#111827] truncate">
                          {hub.cctvPassword || (hub as any).hasCctvPassword ? (
                            isPasswordVisible ? (
                              revealedPasswords[hub.id] || hub.cctvPassword || '••••••••••••'
                            ) : (
                              '••••••••••••'
                            )
                          ) : (
                            <span className="text-gray-400 font-sans italic">Not set</span>
                          )}
                        </span>
                        {(hub.cctvPassword || (hub as any).hasCctvPassword) && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handlePasswordAction(hub, 'view')}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                              title={
                                !isAdmin
                                  ? 'Protected: Only Administrators can view passwords'
                                  : isPasswordVisible
                                  ? 'Hide Password'
                                  : 'Verify Admin Password to View'
                              }
                            >
                              {!isAdmin ? (
                                <Lock className="w-3.5 h-3.5 text-gray-400" />
                              ) : isPasswordVisible ? (
                                <EyeOff className="w-3.5 h-3.5 text-[#0071E3]" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePasswordAction(hub, 'copy')}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                              title={
                                !isAdmin
                                  ? 'Protected: Only Administrators can copy passwords'
                                  : 'Verify Admin Password to Copy'
                              }
                            >
                              {copiedKeys[pwdCopyKey] ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 mt-4 border-t border-[#F3F4F6] flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(hub)}
                    icon={<Edit className="w-3.5 h-3.5" />}
                    className="rounded-xl text-xs font-medium"
                  >
                    Edit Credentials
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/hubs/${hub.id}`)}
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="rounded-xl text-xs text-gray-600 hover:text-gray-900 font-medium"
                  >
                    View Hub
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit CCTV Credentials Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Configure CCTV — ${editingHub?.erpName || editingHub?.name || 'Hub'}`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveCctv} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#0071E3]/5 border border-[#0071E3]/15 text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2.5">
            <Video className="w-4 h-4 text-[#0071E3] shrink-0 mt-0.5" />
            <p>
              Update camera NVR web portal address, surveillance credentials, and streaming IP for{' '}
              <strong className="text-[#111827] dark:text-white">{editingHub?.erpName || editingHub?.name}</strong>.
            </p>
          </div>

          <FormField
            label="CCTV Access URL / IP"
            hint="Enter local/public IP or domain (e.g. 192.168.1.100:8000 or http://cctv.example.com)"
          >
            <Input
              placeholder="e.g. 192.168.1.100:8000 or http://myhub-cctv.ddns.net"
              value={editForm.cctvAccessUrl}
              onChange={(e) => setEditForm({ ...editForm, cctvAccessUrl: e.target.value })}
            />
          </FormField>

          <FormField label="CCTV Username">
            <Input
              placeholder="e.g. admin or security_ops"
              value={editForm.cctvUsername}
              onChange={(e) => setEditForm({ ...editForm, cctvUsername: e.target.value })}
            />
          </FormField>

          <FormField label="CCTV Password">
            <div className="relative">
              <Input
                type={showEditPassword ? 'text' : 'password'}
                placeholder="Enter CCTV access password"
                value={editForm.cctvPassword}
                onChange={(e) => setEditForm({ ...editForm, cctvPassword: e.target.value })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowEditPassword(!showEditPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title={showEditPassword ? 'Hide password' : 'Show password'}
              >
                {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#F3F4F6] dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              className="rounded-xl shadow-apple-sm font-semibold"
            >
              Save Credentials
            </Button>
          </div>
        </form>
      </Modal>

      {/* Admin Verification Modal for Viewing / Copying CCTV Passwords */}
      <AdminPasswordModal
        isOpen={Boolean(verifyingHub)}
        onClose={() => setVerifyingHub(null)}
        onConfirm={handleAdminVerify}
        title="Administrator Verification Required"
        description={`Enter your administrator account password to access protected CCTV credentials for ${verifyingHub?.hub.erpName || verifyingHub?.hub.name || 'this facility'}.`}
        actionLabel={verifyingHub?.action === 'copy' ? 'Verify & Copy' : 'Verify & Reveal'}
      />
    </div>
  );
};
