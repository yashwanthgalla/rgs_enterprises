import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Warehouse,
  Landmark,
  Receipt,
  Users,
  Wrench,
  FolderLock,
  BarChart3,
  Settings,
  LogOut,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Zap,
  Wifi,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SubNavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: SubNavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    '/finance': true,
    '/expenses': true,
  });

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'HUBS', path: '/hubs', icon: Warehouse },
    {
      label: 'Finance',
      path: '/finance',
      icon: Landmark,
      children: [
        { label: 'Total Revenue', path: '/finance/revenue', icon: TrendingUp },
        { label: 'Rent', path: '/finance/rent', icon: Receipt },
      ],
    },
    {
      label: 'Expenses & Bills',
      path: '/expenses',
      icon: Receipt,
      children: [
        { label: 'Electricity Information', path: '/expenses/electricity', icon: Zap },
        { label: 'WiFi Information', path: '/expenses/wifi', icon: Wifi },
      ],
    },
    { label: 'Staff Directory', path: '/staff', icon: Users },
    { label: 'Assets & Equipment', path: '/assets', icon: Wrench },
    { label: 'Document Vault', path: '/documents', icon: FolderLock },
    { label: 'Financial Reports', path: '/reports', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleToggle = (path: string, defaultChildPath: string) => {
    const isCurrentlyOpen = !!openMenus[path];
    setOpenMenus((prev) => ({ ...prev, [path]: !isCurrentlyOpen }));
    if (!isCurrentlyOpen && !location.pathname.startsWith(path)) {
      navigate(defaultChildPath);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={clsx(
          'fixed top-0 bottom-0 left-0 z-40 w-64 glass-panel border-r border-black/[0.08] dark:border-white/[0.08] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="p-5 pb-4 flex items-center gap-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-apple-sm border border-black/10 dark:border-white/10 shrink-0 bg-white">
            <img
              src="/2.jpeg"
              alt="RGS Enterprises Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100 truncate">
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
              const isGroupOpen = !!openMenus[item.path];
              const defaultChildPath = item.children[0]?.path || item.path;

              return (
                <div key={item.path} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(item.path, defaultChildPath)}
                    className={clsx(
                      'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-150 select-none cursor-pointer',
                      isGroupActive
                        ? 'bg-apple-accent/10 dark:bg-apple-accent/15 text-apple-accent font-bold'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    <div className="p-1 rounded-lg text-gray-400">
                      {isGroupOpen ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </button>

                  {/* Submenu Items */}
                  {isGroupOpen && (
                    <div className="ml-4 pl-3 border-l-2 border-black/[0.08] dark:border-white/[0.08] space-y-1 my-1">
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
                            onClick={onClose}
                            className={clsx(
                              'flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-semibold tracking-tight transition-all duration-150',
                              isSubActive
                                ? 'bg-apple-accent text-white shadow-apple-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
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
                onClick={onClose}
                end={item.path === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-150',
                    isActive
                      ? 'bg-apple-accent text-white shadow-apple-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
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
        <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-apple-accent/15 text-apple-accent font-bold text-xs flex items-center justify-center shrink-0">
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {user?.fullName || user?.username || 'Administrator'}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {user?.email || 'admin'}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-gray-400 hover:text-apple-danger hover:bg-apple-danger/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

