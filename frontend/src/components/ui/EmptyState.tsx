import React from 'react';
import { Button } from './Button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-apple-lg border border-dashed border-apple-border dark:border-apple-darkBorder bg-black/[0.01] dark:bg-white/[0.01]">
      <div className="w-14 h-14 rounded-full bg-apple-bg dark:bg-white/[0.06] flex items-center justify-center text-apple-secondary dark:text-apple-darkSecondary mb-4">
        <Icon className="w-7 h-7 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-semibold text-apple-text dark:text-apple-darkText tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-apple-secondary dark:text-apple-darkSecondary max-w-sm mt-1.5 mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} icon={actionIcon} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

