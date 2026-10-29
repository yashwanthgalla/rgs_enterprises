import React from 'react';
import { Card } from './Card';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  onClick,
}) => {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-apple-card hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-apple-secondary dark:text-apple-darkSecondary">
          {title}
        </span>
        <div className="p-2.5 rounded-full bg-apple-bg dark:bg-white/[0.06] text-apple-accent group-hover:scale-105 transition-transform duration-200">
          {icon}
        </div>
      </div>
      <div className="text-2xl lg:text-3xl font-semibold tracking-tight text-apple-text dark:text-apple-darkText">
        {value}
      </div>
      {(subtitle || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-apple-secondary dark:text-apple-darkSecondary">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center font-medium px-1.5 py-0.5 rounded-md',
                trend.isPositive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              )}
            >
              {trend.value}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </Card>
  );
};

