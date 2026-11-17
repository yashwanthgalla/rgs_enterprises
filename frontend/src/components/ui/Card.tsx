import React, { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  highlighted?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  highlighted = false,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-white rounded-2xl transition-all duration-200 shadow-apple-sm',
          highlighted ? 'border-2 border-[#0071E3]' : 'border border-[#E5E7EB]',
          hoverable && 'hover:border-[#9CA3AF] hover:shadow-apple-md hover:-translate-y-0.5 cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
