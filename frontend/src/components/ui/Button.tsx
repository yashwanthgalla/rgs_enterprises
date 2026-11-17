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
  const baseStyles = 'inline-flex items-center justify-center font-semibold uppercase tracking-[0.1em] rounded-none transition-all duration-150 select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3D00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]';

  const variants = {
    // Primary: Text in vermillion accent with animated underline
    primary: 'relative bg-transparent text-[#FF3D00] hover:text-[#FF3D00] px-3 border-b-2 border-[#FF3D00] hover:border-[#FF5722]',
    // Solid: High-contrast vermillion action block
    solid: 'bg-[#FF3D00] text-[#0A0A0A] hover:bg-[#E03600] px-6 border-0',
    // Secondary / Outline: 1px border foreground, inverts on hover
    secondary: 'border border-[#FAFAFA] text-[#FAFAFA] bg-transparent hover:bg-[#FAFAFA] hover:text-[#0A0A0A] px-6',
    outline: 'border border-[#262626] hover:border-[#FAFAFA] bg-transparent text-[#FAFAFA] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] px-5',
    // Ghost: Muted text, reveals underline on hover
    ghost: 'border-0 bg-transparent text-[#737373] hover:text-[#FAFAFA] px-4 hover:underline underline-offset-4 decoration-[#FF3D00]',
    // Danger
    danger: 'bg-[#FF3B30] text-white hover:bg-red-700 px-5 border-0',
  };

  const sizes = {
    sm: 'text-xs py-2 gap-2',
    md: 'text-sm py-2.5 gap-2.5',
    lg: 'text-base py-3.5 gap-3',
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
