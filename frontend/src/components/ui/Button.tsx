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
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-none border';

  const variants = {
    primary: 'bg-[#16161a] hover:bg-[#1f2024] text-[#faf8f9] border-[#222325] hover:border-apple-accent/50 shadow-sm hover:shadow-[0_0_15px_-3px_rgba(200,48,58,0.35)]',
    secondary: 'bg-[#16161a] hover:bg-[#202126] text-[#faf8f9] border-[#222325]',
    outline: 'border-[#222325] hover:border-[#383a40] bg-[#121315] hover:bg-[#16161a] text-[#faf8f9]',
    ghost: 'border-transparent bg-transparent hover:bg-white/5 text-[#faf8f9]',
    danger: 'bg-apple-danger hover:bg-red-700 text-white border-transparent',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5',
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
