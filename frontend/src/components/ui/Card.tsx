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
          'glass-card rounded-none transition-colors duration-150',
          highlighted ? 'border-2 border-[#FF3D00]' : 'border border-[#262626]',
          hoverable && 'hover:border-[#737373] cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
