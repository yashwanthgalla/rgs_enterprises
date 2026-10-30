import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'accent' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className,
}) => {
  const variants = {
    success: 'bg-[#34C759]/15 text-[#248A3D] dark:bg-[#34C759]/25 dark:text-[#30D158] border-[#34C759]/20',
    warning: 'bg-[#FF9500]/15 text-[#C97700] dark:bg-[#FF9500]/25 dark:text-[#FF9F0A] border-[#FF9500]/20',
    danger: 'bg-[#FF3B30]/15 text-[#D70015] dark:bg-[#FF3B30]/25 dark:text-[#FF453A] border-[#FF3B30]/20',
    accent: 'bg-[#0071E3]/15 text-[#0071E3] dark:bg-[#0071E3]/25 dark:text-[#0A84FF] border-[#0071E3]/20',
    neutral: 'bg-black/5 text-[#86868B] dark:bg-white/10 dark:text-[#98989D] border-black/5 dark:border-white/10',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 tracking-tight font-medium',
    md: 'text-xs px-2.5 py-1 tracking-tight font-medium',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full border select-none',
          variants[variant],
          sizes[size],
          className
        )
      )}
    >
      {children}
    </span>
  );
};
