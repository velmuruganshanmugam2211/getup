import { format, parseISO, isValid } from 'date-fns';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * Format a number as Indian Rupee (INR)
 * @example formatINR(50000) => "₹50,000"
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }
  return inrFormatter.format(amount);
}

/**
 * Format a date string or Date object
 */
export function formatDate(date: string | Date | null | undefined, pattern = 'dd MMM yyyy'): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d) ? format(d, pattern) : '—';
  } catch {
    return '—';
  }
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'dd MMM yyyy, hh:mm a');
}

/**
 * Format time only
 */
export function formatTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'hh:mm a');
}

/**
 * Format month string e.g. "2026-10" => "October 2026"
 */
export function formatMonth(monthStr: string | null | undefined): string {
  if (!monthStr) return '—';
  try {
    const [year, month] = monthStr.split('-').map(Number);
    if (!year || !month) return monthStr;
    const date = new Date(year, month - 1, 1);
    return format(date, 'MMMM yyyy');
  } catch {
    return monthStr;
  }
}

/**
 * Format a percentage
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
