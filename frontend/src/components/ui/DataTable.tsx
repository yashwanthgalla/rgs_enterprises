import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  page?: number;
  totalPages?: number;
  totalElements?: number;
  onPageChange?: (page: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
  actions?: React.ReactNode;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = 'Search records...',
  searchValue,
  onSearchChange,
  page = 0,
  totalPages = 1,
  totalElements,
  onPageChange,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display matching your criteria.',
  onEmptyAction,
  emptyActionLabel,
  actions,
  onRowClick,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalSearch(val);
    if (onSearchChange) onSearchChange(val);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {onSearchChange !== undefined ? (
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-apple-secondary pointer-events-none" />
            <input
              type="text"
              value={searchValue !== undefined ? searchValue : internalSearch}
              onChange={handleSearch}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 text-xs lg:text-sm rounded-full border border-apple-border dark:border-apple-darkBorder bg-white/80 dark:bg-apple-darkSurface text-apple-text dark:text-apple-darkText placeholder:text-apple-secondary/60 focus:outline-none focus:ring-2 focus:ring-apple-accent/20 focus:border-apple-accent transition-all"
            />
          </div>
        ) : (
          <div />
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Table Surface */}
      <div className="overflow-hidden rounded-apple-lg border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-apple-darkSurface shadow-apple-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={cn(
                      'px-5 py-3.5 text-xs font-semibold text-apple-secondary dark:text-apple-darkSecondary uppercase tracking-wider',
                      col.sortable && 'cursor-pointer select-none hover:text-apple-text dark:hover:text-apple-darkText',
                      col.className
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && <ArrowUpDown className="w-3 h-3 opacity-60" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
              {isLoading ? (
                // Skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((col) => (
                      <td key={col.key} className="px-5 py-4">
                        <div className="h-4 bg-black/[0.06] dark:bg-white/[0.08] rounded-md w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-8">
                    <EmptyState
                      icon={Inbox}
                      title={emptyTitle}
                      description={emptyDescription}
                      onAction={onEmptyAction}
                      actionLabel={emptyActionLabel}
                    />
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => (
                  <tr
                    key={item.id ? String(item.id) : idx}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={cn(
                      'transition-colors duration-150',
                      onRowClick
                        ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                        : 'hover:bg-black/[0.01] dark:hover:bg-white/[0.01]'
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn('px-5 py-3.5 text-apple-text dark:text-apple-darkText', col.className)}
                      >
                        {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && onPageChange && (
          <div className="px-5 py-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs text-apple-secondary dark:text-apple-darkSecondary">
            <div>
              {totalElements !== undefined
                ? `Showing ${data.length} of ${totalElements} records`
                : `Page ${page + 1} of ${totalPages}`}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 0}
                onClick={() => onPageChange(page - 1)}
                className="h-7 w-7 p-0 rounded-full"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-2 font-medium text-apple-text dark:text-apple-darkText">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => onPageChange(page + 1)}
                className="h-7 w-7 p-0 rounded-full"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

