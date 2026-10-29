import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'accent';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className,
}) => {
  const variants = {
    success:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    warning:
      'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    danger:
      'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
    info:
      'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20',
    accent:
      'bg-apple-accent/10 text-apple-accent border border-apple-accent/20',
    neutral:
      'bg-black/[0.05] dark:bg-white/[0.08] text-apple-secondary dark:text-apple-darkSecondary border border-black/[0.05] dark:border-white/[0.1]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide transition-colors',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

