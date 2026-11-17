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
    <header className="sticky top-0 z-30 h-16 glass-panel border-b border-[#262626] px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-none text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] lg:hidden"
        >
          <Menu className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-none text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-colors"
          title="Toggle appearance"
        >
          {isDark ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
        </button>

        {/* User status pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-none bg-[#1A1A1A] border border-[#262626] text-xs font-mono tracking-wide text-[#FAFAFA]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#FF3D00]" strokeWidth={1.5} />
          <span className="font-semibold">{user?.fullName || user?.username}</span>
        </div>
      </div>
    </header>
  );
};

