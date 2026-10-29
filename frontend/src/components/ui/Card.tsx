import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  glass = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-apple-lg border border-black/[0.06] dark:border-white/[0.08] p-6 transition-all duration-200',
        glass
          ? 'glass-nav shadow-apple-subtle'
          : 'bg-white dark:bg-apple-darkSurface shadow-apple-subtle',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

