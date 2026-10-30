import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Warehouse,
  ReceiptText,
  Receipt,
  Users,
  Wrench,
  FolderLock,
  BarChart3,
  Settings,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Godowns', path: '/godowns', icon: Warehouse },
    { label: 'Rent Ledger', path: '/rent-ledger', icon: ReceiptText },
    { label: 'Expenses & Bills', path: '/expenses', icon: Receipt },
    { label: 'Staff Directory', path: '/staff', icon: Users },
    { label: 'Assets & Equipment', path: '/assets', icon: Wrench },
    { label: 'Document Vault', path: '/documents', icon: FolderLock },
    { label: 'Financial Reports', path: '/reports', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

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
        <div className="p-6 pb-5 flex items-center gap-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="w-10 h-10 rounded-2xl bg-apple-accent text-white flex items-center justify-center shadow-apple-sm font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100 truncate">
              {settings.companyName || 'RGS ENTERPRISES'}
            </h1>
            <p className="text-[11px] font-medium text-apple-accent tracking-wide uppercase">
              GodownIQ Portfolio
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
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

