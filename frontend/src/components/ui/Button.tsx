import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent/50';

  const variants = {
    primary:
      'bg-apple-accent hover:bg-apple-accent-hover text-white shadow-sm hover:shadow',
    secondary:
      'bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.09] dark:hover:bg-white/[0.12] text-apple-text dark:text-apple-darkText border border-apple-border dark:border-apple-darkBorder',
    outline:
      'border border-apple-border dark:border-apple-darkBorder hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-apple-text dark:text-apple-darkText',
    ghost:
      'hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-apple-secondary dark:text-apple-darkSecondary hover:text-apple-text dark:hover:text-apple-darkText',
    danger:
      'bg-apple-danger hover:bg-red-600 text-white shadow-sm',
  };

  const sizes = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5 h-8',
    md: 'text-sm px-4 py-2 gap-2 h-10',
    lg: 'text-base px-6 py-2.5 gap-2.5 h-12',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};

