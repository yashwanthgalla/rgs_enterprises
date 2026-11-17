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
      className={clsx('p-6 flex flex-col justify-between border border-[#262626] bg-[#0F0F0F] rounded-none', onClick && 'cursor-pointer')}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#737373]">
          {title}
        </span>
        <Icon className="w-4 h-4 text-[#737373]" strokeWidth={1.5} />
      </div>

      <div className="mt-6">
        <div className="text-3xl sm:text-4xl font-bold tracking-tight text-[#FAFAFA] font-sans">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-2 text-xs">
            {trend && (
              <span
                className={clsx(
                  'font-mono uppercase text-[10px] tracking-wider px-1.5 py-0.5 border',
                  trend.isPositive
                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                    : 'border-[#FF3B30]/30 text-[#FF3B30] bg-[#FF3B30]/10'
                )}
              >
                {trend.value}
              </span>
            )}
            {subtitle && (
              <span className="font-mono text-xs text-[#737373] truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
