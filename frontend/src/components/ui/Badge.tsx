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
    accent: 'bg-[#FF3D00]/15 text-[#FF3D00] border-[#FF3D00]/40',
    neutral: 'bg-[#1A1A1A] text-[#737373] border-[#262626]',
    success: 'bg-[#34C759]/10 text-[#30D158] border-[#34C759]/30',
    warning: 'bg-[#FF9500]/10 text-[#FF9F0A] border-[#FF9500]/30',
    danger: 'bg-[#FF3B30]/10 text-[#FF453A] border-[#FF3B30]/30',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center font-mono uppercase tracking-[0.1em] rounded-none border select-none',
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
