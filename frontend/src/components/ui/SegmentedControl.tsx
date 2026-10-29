import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center p-1 rounded-full bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.06]',
        className
      )}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative z-10 flex items-center gap-1.5 font-medium rounded-full transition-colors duration-150 focus:outline-none',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
              isSelected
                ? 'text-apple-text dark:text-apple-darkText'
                : 'text-apple-secondary dark:text-apple-darkSecondary hover:text-apple-text dark:hover:text-apple-darkText'
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="segmented-control-active"
                className="absolute inset-0 bg-white dark:bg-apple-darkCard rounded-full shadow-apple-subtle -z-10"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-semibold',
                  isSelected
                    ? 'bg-apple-accent text-white'
                    : 'bg-black/10 dark:bg-white/10 text-apple-secondary dark:text-apple-darkSecondary'
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

