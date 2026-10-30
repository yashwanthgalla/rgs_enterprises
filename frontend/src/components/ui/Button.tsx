import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-xl';

  const variants = {
    primary: 'bg-apple-accent hover:bg-apple-accentHover text-white shadow-apple-sm hover:shadow-apple-md',
    secondary: 'bg-[#E5E5EA] hover:bg-[#D1D1D6] text-[#1D1D1F] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] dark:text-[#F5F5F7]',
    outline: 'border border-black/15 hover:border-black/30 dark:border-white/20 dark:hover:border-white/40 bg-transparent text-[#1D1D1F] dark:text-[#F5F5F7]',
    ghost: 'bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-[#1D1D1F] dark:text-[#F5F5F7]',
    danger: 'bg-apple-danger hover:bg-red-600 text-white shadow-apple-sm',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5 rounded-2xl',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};

