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
          'bg-white rounded-none transition-colors duration-150',
          highlighted ? 'border-2 border-[#0071E3]' : 'border border-[#E5E7EB]',
          hoverable && 'hover:border-[#9CA3AF] cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
