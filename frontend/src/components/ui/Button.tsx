import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'solid';
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
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-none transition-all duration-150 select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2';

  const variants = {
    primary: 'bg-[#0071E3] hover:bg-[#005BB5] text-white shadow-apple-sm px-4 border-0',
    solid: 'bg-[#0071E3] hover:bg-[#005BB5] text-white shadow-apple-sm px-5 border-0',
    secondary: 'border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] text-[#111827] px-4 shadow-sm',
    outline: 'border border-[#E5E7EB] bg-white hover:bg-[#F3F4F6] text-[#111827] px-4',
    ghost: 'border-0 bg-transparent text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] px-3',
    danger: 'bg-[#FF3B30] hover:bg-red-600 text-white px-4 border-0',
  };

  const sizes = {
    sm: 'text-xs py-1.5 px-3 gap-1.5',
    md: 'text-xs py-2 px-4 gap-2',
    lg: 'text-sm py-2.5 px-5 gap-2.5',
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
