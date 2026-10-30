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
          'glass-card rounded-2xl transition-all duration-200',
          hoverable && 'hover:shadow-apple-md hover:-translate-y-0.5 hover:border-black/[0.12] dark:hover:border-white/[0.2]',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
