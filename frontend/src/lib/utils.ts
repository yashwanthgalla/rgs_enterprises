import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format numbers as Indian Rupee (INR) currency
 * e.g. 1500000 -> ₹15,00,000
 */
export function formatINR(amount: number | string | undefined | null, symbol: string = '₹'): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return `${symbol}0`;
  }
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(numeric);
  return `${symbol}${formatted}`;
}

/**
 * Format numbers as compact Indian currency (e.g. 4.5 Lakhs, 1.8 Cr)
 */
export function formatINRCompact(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹0';
  }
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Math.abs(num) >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(num) >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return formatINR(num);
}

/**
 * Format square feet area
 */
export function formatSqft(area: number | string | undefined | null): string {
  if (area === undefined || area === null || isNaN(Number(area))) {
    return '0 sq ft';
  }
  const numeric = typeof area === 'string' ? parseFloat(area) : area;
  return `${new Intl.NumberFormat('en-IN').format(numeric)} sq ft`;
}

/**
 * Format date in clean Apple style: "15 Oct 2026"
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Format month in human readable format: "2026-10" -> "Oct 2026"
 */
export function formatMonth(monthStr?: string | null): string {
  if (!monthStr || !monthStr.includes('-')) return monthStr || '—';
  try {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(date);
  } catch {
    return monthStr;
  }
}

