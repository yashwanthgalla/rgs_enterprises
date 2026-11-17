import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { clsx } from 'clsx';

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

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (location.pathname.startsWith('/finance')) initial['/finance'] = true;
    if (location.pathname.startsWith('/information')) initial['/information'] = true;
    return initial;
  });

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Hubs', path: '/hubs', icon: Warehouse },
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
      label: 'Information',
      path: '/information',
      icon: Info,
      children: [
        { label: 'Electricity Information', path: '/information/electricity', icon: Zap },
        { label: 'WiFi Information', path: '/information/wifi', icon: Wifi },
      ],
    },
    { label: 'Staff Directory', path: '/staff', icon: Users },
    { label: 'Assets & Equipment', path: '/assets', icon: Wrench },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
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
          <div className="w-10 h-10 rounded-none overflow-hidden border border-[#E5E7EB] shrink-0 bg-white">
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
              const isGroupOpen = !!openMenus[item.path];
              const defaultChildPath = item.children[0]?.path || item.path;

              return (
                <div key={item.path} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleToggle(item.path, defaultChildPath)}
                    className={clsx(
                      'w-full flex items-center justify-between px-3.5 py-2.5 rounded-none text-xs font-semibold tracking-wide transition-colors duration-150 select-none cursor-pointer border-l-2',
                      isGroupActive
                        ? 'border-[#0071E3] bg-[#0071E3]/10 text-[#0071E3]'
                        : 'border-transparent text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
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
                            onClick={onClose}
                            className={clsx(
                              'flex items-center gap-2.5 px-3 py-2 rounded-none text-[11px] font-semibold tracking-wide transition-colors duration-150 border-l-2',
                              isSubActive
                                ? 'border-[#0071E3] bg-[#0071E3]/10 text-[#0071E3]'
                                : 'border-transparent text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]'
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
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-none text-xs font-semibold tracking-wide transition-colors duration-150 border-l-2',
                    isActive
                      ? 'border-[#0071E3] bg-[#0071E3]/10 text-[#0071E3]'
                      : 'border-transparent text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
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
          <div className="flex items-center justify-between p-2 rounded-none bg-[#F9FAFB] border border-[#E5E7EB]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-none border border-[#E5E7EB] bg-[#0071E3]/10 text-[#0071E3] font-bold text-xs flex items-center justify-center shrink-0">
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-[#111827] truncate">
                  {user?.fullName || user?.username || 'Administrator'}
                </p>
                <p className="text-[10px] text-[#6B7280] truncate">
                  {user?.email || 'admin'}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-none text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
