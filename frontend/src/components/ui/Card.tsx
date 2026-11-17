import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'glass-card rounded-none transition-all duration-200 border border-[#222325]',
          hoverable && 'hover:shadow-brand-glow hover:-translate-y-0.5 hover:border-apple-accent/40',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
