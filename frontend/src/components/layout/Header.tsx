import React from 'react';
import { Menu, Activity, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { user } = useAuth();
  const [isDark, setIsDark] = React.useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 glass-panel border-b border-black/[0.06] dark:border-white/[0.08] px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-black/5 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-white/10 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-apple-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-apple-success"></span>
          </span>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Render Cloud Live
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-black/5 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-white/10 transition-colors"
          title="Toggle appearance"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Admin status pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-apple-accent/10 border border-apple-accent/20 text-xs font-medium text-apple-accent">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Admin Mode:</span>
          <span className="font-semibold">{user?.fullName || user?.username}</span>
        </div>
      </div>
    </header>
  );
};
