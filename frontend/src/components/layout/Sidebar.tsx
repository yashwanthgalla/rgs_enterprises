import React, { useState, useEffect, startTransition } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { perfLogger } from '../../utils/perfLogger';
import {
  LayoutDashboard,
  Warehouse,
  Receipt,
  Users,
  Wrench,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  LogOut,
  Zap,
  Wifi,
  Info,
  Landmark,
  Video,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { clsx } from 'clsx';

import { queryClient, STALE_TIMES } from '../../api/queryClient';
import { queryKeys } from '../../api/queryKeys';
import {
  dashboardApi,
  godownApi,
  financeApi,
  employeeApi,
  assetApi,
  reportApi,
} from '../../services/api';

// Lazy chunk prefetch map to warm the browser cache before user clicks
const chunkPrefetchers: Record<string, () => Promise<any>> = {
  '/': () => import('../../pages/Dashboard'),
  '/hubs': () => import('../../pages/Godowns'),
  '/finance/revenue': () => import('../../pages/Finance'),
  '/finance/rent': () => import('../../pages/Finance'),
  '/information/electricity': () => import('../../pages/Expenses'),
  '/information/wifi': () => import('../../pages/Expenses'),
  '/visualance': () => import('../../pages/Visualance'),
  '/staff': () => import('../../pages/Staff'),
  '/assets': () => import('../../pages/Assets'),
  '/reports': () => import('../../pages/Reports'),
  '/settings': () => import('../../pages/Settings'),
};

const prefetchRoute = (path: string) => {
  // 1. Prefetch lazy JS chunk
  const prefetcher = chunkPrefetchers[path];
  if (prefetcher) {
    prefetcher().catch(() => {});
  }

  // 2. Prefetch main route query to hide database latency completely
  try {
    if (path === '/') {
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard.stats(),
        queryFn: () => dashboardApi.getStats(),
        staleTime: STALE_TIMES.STANDARD,
      });
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard.reminders(),
        queryFn: () => dashboardApi.getReminders(),
        staleTime: STALE_TIMES.STANDARD,
      });
    } else if (path === '/hubs') {
      queryClient.prefetchQuery({
        queryKey: queryKeys.hubs.list({ page: 0, size: 100, showDeleted: false }),
        queryFn: async () => {
          const res: any = await godownApi.getAll(0, 100, true, { show_deleted: 'false' });
          return Array.isArray(res) ? res : res?.content || [];
        },
        staleTime: STALE_TIMES.DYNAMIC,
      });
    } else if (path.startsWith('/finance')) {
      queryClient.prefetchQuery({
        queryKey: queryKeys.finance.rents(),
        queryFn: async () => {
          const res: any = await financeApi.getRents();
          return Array.isArray(res) ? res : res?.content || [];
        },
        staleTime: STALE_TIMES.DYNAMIC,
      });
      queryClient.prefetchQuery({
        queryKey: queryKeys.finance.revenues(),
        queryFn: async () => {
          const res: any = await financeApi.getTotalRevenues();
          return Array.isArray(res) ? res : res?.content || [];
        },
        staleTime: STALE_TIMES.DYNAMIC,
      });
    } else if (path === '/staff') {
      queryClient.prefetchQuery({
        queryKey: queryKeys.staff.list(),
        queryFn: async () => {
          const res: any = await employeeApi.getAll();
          return Array.isArray(res) ? res : res?.content || [];
        },
        staleTime: STALE_TIMES.DYNAMIC,
      });
    } else if (path === '/assets') {
      queryClient.prefetchQuery({
        queryKey: queryKeys.assets.list(),
        queryFn: async () => {
          const res: any = await assetApi.getAll();
          return Array.isArray(res) ? res : res?.content || [];
        },
        staleTime: STALE_TIMES.STANDARD,
      });
    } else if (path === '/reports') {
      const yr = new Date().getFullYear();
      queryClient.prefetchQuery({
        queryKey: queryKeys.reports.summary(yr),
        queryFn: () => reportApi.getSummary(yr),
        staleTime: STALE_TIMES.DYNAMIC,
      });
    }
  } catch (err) {
    console.warn('Navigation prefetch failed silently:', err);
  }
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  // Accordion behavior: only one dropdown can be open at a time ('/finance', '/information', or null)
  const [openMenu, setOpenMenu] = useState<string | null>(() => {
    if (location.pathname.startsWith('/finance')) return '/finance';
    if (location.pathname.startsWith('/information')) return '/information';
    return null;
  });

  // Automatically sync with route changes: open only the active section
  useEffect(() => {
    if (location.pathname.startsWith('/finance')) {
      setOpenMenu('/finance');
    } else if (location.pathname.startsWith('/information')) {
      setOpenMenu('/information');
    }
  }, [location.pathname]);

  const userRole = (user?.role || 'ADMIN').toUpperCase();

  const allNavItems: (NavItem & { roles?: string[] })[] = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Hubs', path: '/hubs', icon: Warehouse },
    {
      label: 'Finance',
      path: '/finance',
      icon: Landmark,
      roles: ['ADMIN'],
      children: [
        { label: 'Total Revenue', path: '/finance/revenue', icon: TrendingUp },
        { label: 'Rent', path: '/finance/rent', icon: Receipt },
      ],
    },
    {
      label: 'Information',
      path: '/information',
      icon: Info,
      children: [
        { label: 'Electricity Information', path: '/information/electricity', icon: Zap },
        { label: 'WiFi Information', path: '/information/wifi', icon: Wifi },
      ],
    },
    { label: 'Visualance', path: '/visualance', icon: Video },
    { label: 'Staff Directory', path: '/staff', icon: Users, roles: ['ADMIN', 'MANAGER'] },
    { label: 'Assets & Equipment', path: '/assets', icon: Wrench, roles: ['ADMIN', 'MANAGER'] },
    { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['ADMIN'] },
    { label: 'Settings', path: '/settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const navItems = allNavItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  const handleToggle = (path: string, defaultChildPath: string) => {
    if (openMenu === path) {
      setOpenMenu(null);
    } else {
      // Opening one menu automatically collapses the other
      setOpenMenu(path);
      if (!location.pathname.startsWith(path)) {
        perfLogger.startRoute(defaultChildPath);
        startTransition(() => {
          navigate(defaultChildPath);
        });
      }
    }
  };

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    onClose();
    if (location.pathname !== path) {
      perfLogger.startRoute(path);
      startTransition(() => {
        navigate(path);
      });
    }
  };

  const handleLogout = () => {
    logout();
    startTransition(() => {
      navigate('/login');
    });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={clsx(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-[#E5E7EB] flex flex-col transition-transform duration-150 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="p-5 pb-4 flex items-center gap-3 border-b border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-apple-sm shrink-0 bg-white">
            <img
              src="/2.jpeg"
              alt="RGS Enterprises Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight text-[#111827] truncate">
              RGS ENTERPRISES
            </h1>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;

            // Render NavItem with Sub-items (Finance & Expenses)
            if (item.children) {
              const isGroupActive = location.pathname.startsWith(item.path);
              const isGroupOpen = openMenu === item.path;
              const defaultChildPath = item.children[0]?.path || item.path;

              return (
                <div key={item.path} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(item.path, defaultChildPath)}
                    className={clsx(
                      'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-150 select-none cursor-pointer',
                      isGroupActive
                        ? 'bg-[#0071E3]/10 text-[#0071E3]'
                        : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    <div className="p-1 text-[#9CA3AF]">
                      {isGroupOpen ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </button>

                  {/* Submenu Items */}
                  {isGroupOpen && (
                    <div className="ml-4 pl-3 border-l-2 border-[#E5E7EB] space-y-1 my-1">
                      {item.children.map((sub, idx) => {
                        const SubIcon = sub.icon;
                        const isSubActive =
                          location.pathname === sub.path ||
                          (location.pathname === item.path && idx === 0) ||
                          (sub.path === '/finance/revenue' &&
                            location.pathname === '/finance' &&
                            (!location.search || location.search.includes('revenue'))) ||
                          (sub.path === '/finance/rent' &&
                            location.pathname === '/finance' &&
                            location.search.includes('rent'));

                        return (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            onClick={(e) => handleNavClick(e, sub.path)}
                            onMouseEnter={() => prefetchRoute(sub.path)}
                            onFocus={() => prefetchRoute(sub.path)}
                            className={clsx(
                              'flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-semibold tracking-tight transition-all duration-150',
                              isSubActive
                                ? 'bg-[#0071E3] text-white shadow-apple-sm'
                                : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]'
                            )}
                          >
                            <SubIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{sub.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Standard NavItem
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={(e) => handleNavClick(e, item.path)}
                onMouseEnter={() => prefetchRoute(item.path)}
                onFocus={() => prefetchRoute(item.path)}
                end={item.path === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-150',
                    isActive
                      ? 'bg-[#0071E3] text-white shadow-apple-sm'
                      : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Card */}
        <div className="p-3 border-t border-[#E5E7EB]">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full border border-[#E5E7EB] bg-[#0071E3]/15 text-[#0071E3] font-bold text-xs flex items-center justify-center shrink-0">
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-[#111827] truncate">
                  {user?.fullName || user?.username || 'Administrator'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-[#6B7280] truncate">
                    {user?.email || user?.username || 'admin'}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-[#0071E3]/10 text-[#0071E3] shrink-0">
                    {userRole}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-xl text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
