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
  const colorStyles = {
    blue: 'bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0071E3]/20 dark:text-[#0A84FF]',
    green: 'bg-[#34C759]/10 text-[#248A3D] dark:bg-[#34C759]/20 dark:text-[#30D158]',
    amber: 'bg-[#FF9500]/10 text-[#C97700] dark:bg-[#FF9500]/20 dark:text-[#FF9F0A]',
    purple: 'bg-[#5856D6]/10 text-[#5856D6] dark:bg-[#5856D6]/20 dark:text-[#5E5CE6]',
    red: 'bg-[#FF3B30]/10 text-[#D70015] dark:bg-[#FF3B30]/20 dark:text-[#FF453A]',
  };

  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      className={clsx('p-5 flex flex-col justify-between', onClick && 'cursor-pointer')}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
          {title}
        </span>
        <div className={clsx('p-2.5 rounded-2xl', colorStyles[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            {trend && (
              <span
                className={clsx(
                  'font-semibold px-1.5 py-0.5 rounded-md',
                  trend.isPositive
                    ? 'text-apple-success bg-apple-success/10'
                    : 'text-apple-danger bg-apple-danger/10'
                )}
              >
                {trend.value}
              </span>
            )}
            {subtitle && (
              <span className="text-gray-500 dark:text-gray-400 truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
