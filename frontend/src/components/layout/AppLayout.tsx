import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Warehouse,
  ReceiptText,
  CreditCard,
  Wrench,
  Users,
  FolderOpen,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Bell,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/godowns', label: 'Godowns', icon: Warehouse },
  { to: '/rent-ledger', label: 'Rent Roll', icon: ReceiptText },
  { to: '/expenses', label: 'Expenses & Bills', icon: CreditCard },
  { to: '/assets', label: 'Asset Register', icon: Wrench },
  { to: '/staff', label: 'Staff & Payroll', icon: Users },
  { to: '/documents', label: 'Doc Vault', icon: FolderOpen },
  { to: '/reports', label: 'Financial Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { companyName, logoUrl } = useSettings();
  const navigate = useNavigate();

  // Track last visit timestamp per admin
  const [lastVisited, setLastVisited] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user?.username) {
      const key = `last_visit_${user.username}`;
      const prev = localStorage.getItem(key);
      if (prev) {
        setLastVisited(prev);
      }
      // Save current timestamp for next time
      const nowStr = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      sessionStorage.setItem(`session_${user.username}`, nowStr);
      localStorage.setItem(key, nowStr);
    }
  }, [user?.username]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-apple-bg dark:bg-apple-darkBg text-apple-text dark:text-apple-darkText flex">
      {/* Desktop Frosted Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-apple-border dark:border-apple-darkBorder bg-white/70 dark:bg-apple-darkSurface/70 backdrop-blur-xl h-screen sticky top-0 z-30 select-none">
        {/* Branding */}
        <div className="px-6 py-5 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-apple-accent flex items-center justify-center text-white shadow-sm">
              <Warehouse className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold tracking-tight truncate text-apple-text dark:text-apple-darkText">
              {companyName}
            </h1>
            <p className="text-[11px] text-apple-secondary dark:text-apple-darkSecondary font-medium">
              Portfolio Management
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-apple-accent text-white shadow-sm'
                      : 'text-apple-secondary dark:text-apple-darkSecondary hover:text-apple-text dark:hover:text-apple-darkText hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer User Info */}
        <div className="p-3 border-t border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.04]">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-apple-text dark:text-apple-darkText truncate">
                {user?.fullName || user?.username || 'Administrator'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="accent" className="text-[9px] px-1.5 py-0">
                  {user?.role || 'ADMIN'}
                </Badge>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-apple-secondary hover:text-apple-danger hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 glass-nav border-b border-apple-border dark:border-apple-darkBorder px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-apple-secondary dark:text-apple-darkSecondary hidden sm:inline">
              Workspace
            </span>
            <span className="text-xs text-apple-secondary dark:text-apple-darkSecondary hidden sm:inline">/</span>
            <span className="text-xs font-semibold text-apple-text dark:text-apple-darkText">
              {companyName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {lastVisited && (
              <div className="text-[11px] text-apple-secondary dark:text-apple-darkSecondary hidden sm:flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.05] px-3 py-1 rounded-full border border-apple-border dark:border-apple-darkBorder">
                <span>Last visited:</span>
                <span className="font-semibold text-apple-text dark:text-apple-darkText">{lastVisited}</span>
              </div>
            )}

            <div className="text-xs text-apple-secondary dark:text-apple-darkSecondary hidden lg:flex items-center gap-1.5 bg-black/[0.03] dark:bg-white/[0.05] px-3 py-1.5 rounded-full border border-apple-border dark:border-apple-darkBorder">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>PostgreSQL & Storage Connected</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="md:hidden p-2 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-apple-secondary transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (Apple iOS Style) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-nav border-t border-apple-border dark:border-apple-darkBorder px-2 py-2 flex items-center justify-around">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors',
                  isActive
                    ? 'text-apple-accent font-semibold'
                    : 'text-apple-secondary dark:text-apple-darkSecondary hover:text-apple-text'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        {/* Extra sheets or Reports on mobile */}
        <NavLink
          to="/reports"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors',
              isActive
                ? 'text-apple-accent font-semibold'
                : 'text-apple-secondary dark:text-apple-darkSecondary hover:text-apple-text'
            )
          }
        >
          <BarChart3 className="w-5 h-5" />
          <span>Reports</span>
        </NavLink>
      </nav>
    </div>
  );
};

