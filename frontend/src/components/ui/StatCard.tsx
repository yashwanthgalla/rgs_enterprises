import React from 'react';
import { Card } from './Card';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  onClick,
}) => {
  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      className={clsx(
        'p-5 flex flex-col border border-[#E5E7EB] bg-white rounded-2xl shadow-apple-sm transition-all',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
        <span className="text-xs uppercase tracking-wider font-semibold text-[#6B7280] truncate">
          {title}
        </span>
        <div className="p-2 rounded-xl bg-[#0071E3]/10 text-[#0071E3] shrink-0 ml-2">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4 flex-1 flex flex-col justify-between">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] font-sans">
          {value}
        </div>
        <div className="min-h-[1.25rem] flex items-center gap-2 mt-2 text-xs">
          {trend && (
            <span
              className={clsx(
                'font-medium rounded-full text-[10px] px-2 py-0.5 border shrink-0',
                trend.isPositive
                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                  : 'border-red-200 text-red-700 bg-red-50'
              )}
            >
              {trend.value}
            </span>
          )}
          {subtitle ? (
            <span className="text-xs text-[#6B7280] truncate">
              {subtitle}
            </span>
          ) : (
            <span className="text-xs text-transparent select-none" aria-hidden="true">
              &nbsp;
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
