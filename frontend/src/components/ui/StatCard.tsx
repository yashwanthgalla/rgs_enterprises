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
      className={clsx('p-5 flex flex-col justify-between border border-[#E5E7EB] bg-white rounded-none shadow-sm', onClick && 'cursor-pointer')}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
        <span className="font-mono text-xs uppercase tracking-wider text-[#6B7280]">
          {title}
        </span>
        <div className="p-2 bg-[#F3F4F6] text-[#0071E3]">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] font-sans">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-2 text-xs">
            {trend && (
              <span
                className={clsx(
                  'font-mono uppercase text-[10px] tracking-wider px-1.5 py-0.5 border',
                  trend.isPositive
                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                    : 'border-red-200 text-red-700 bg-red-50'
                )}
              >
                {trend.value}
              </span>
            )}
            {subtitle && (
              <span className="text-xs text-[#6B7280] truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
