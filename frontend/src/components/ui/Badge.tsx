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
    success: 'bg-[#34C759]/10 text-[#30D158] border-[#34C759]/30',
    warning: 'bg-[#FF9500]/10 text-[#FF9F0A] border-[#FF9500]/30',
    danger: 'bg-[#FF3B30]/10 text-[#FF453A] border-[#FF3B30]/30',
    accent: 'bg-apple-accent/15 text-apple-accent border-apple-accent/30',
    neutral: 'bg-[#16161a] text-[#d6d6d5] border-[#222325]',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 tracking-tight font-medium',
    md: 'text-xs px-2.5 py-1 tracking-tight font-medium',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-none border select-none',
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
