import { BillingCycle, BillingCycleStatus, ClientStatus } from '@/types';
import { addMonths, subDays, addDays, parseISO, format, differenceInCalendarDays } from 'date-fns';

/**
 * Calculates cycle endDate = startDate + 1 month - 1 day.
 * Correctly handles month-end dates (e.g. 20 Oct -> 19 Nov, 31 Jan -> 27/28 Feb).
 */
export function calculateCycleEndDate(startDateStr: string): string {
  try {
    const start = parseISO(startDateStr);
    const nextMonth = addMonths(start, 1);
    const end = subDays(nextMonth, 1);
    return format(end, 'yyyy-MM-dd');
  } catch {
    return startDateStr;
  }
}

/**
 * Calculates next cycle startDate = prevEndDate + 1 day.
 */
export function calculateNextCycleStartDate(prevEndDateStr: string): string {
  try {
    const prevEnd = parseISO(prevEndDateStr);
    const nextStart = addDays(prevEnd, 1);
    return format(nextStart, 'yyyy-MM-dd');
  } catch {
    return prevEndDateStr;
  }
}

/**
 * Derives cycle status dynamically without ever storing it:
 * - 'upcoming': today < startDate
 * - 'active': today >= startDate && today <= endDate
 * - 'renewal_pending': today > endDate and not yet renewed or closed
 * - 'completed': renewed or client closed
 */
export function deriveCycleStatus(
  cycle: BillingCycle,
  todayStr: string = format(new Date(), 'yyyy-MM-dd'),
  clientStatus?: ClientStatus
): BillingCycleStatus {
  if (clientStatus === 'closed' || cycle.renewalDecision === 'closed' || cycle.renewalDecision === 'renewed') {
    return 'completed';
  }
  if (todayStr < cycle.startDate) {
    return 'upcoming';
  }
  if (todayStr >= cycle.startDate && todayStr <= cycle.endDate) {
    return 'active';
  }
  return 'renewal_pending';
}

/**
 * Determines if renewal prompt should be displayed:
 * 3 days before endDate, on endDate, and after expiry.
 */
export function isCycleRenewalDue(
  cycle: BillingCycle,
  todayStr: string = format(new Date(), 'yyyy-MM-dd'),
  clientStatus?: ClientStatus
): boolean {
  if (clientStatus === 'closed' || cycle.renewalDecision === 'renewed' || cycle.renewalDecision === 'closed') {
    return false;
  }
  if (todayStr > cycle.endDate) {
    return true; // Expired without renewal
  }
  if (todayStr >= cycle.startDate && todayStr <= cycle.endDate) {
    try {
      const daysRemaining = differenceInCalendarDays(parseISO(cycle.endDate), parseISO(todayStr));
      return daysRemaining <= 3; // 3 days before or on end date
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Returns calendar days remaining until endDate (can be negative if expired).
 */
export function getCycleDaysRemaining(
  cycle: BillingCycle,
  todayStr: string = format(new Date(), 'yyyy-MM-dd')
): number {
  try {
    return differenceInCalendarDays(parseISO(cycle.endDate), parseISO(todayStr));
  } catch {
    return 0;
  }
}

/**
 * Formats cycle date range (e.g. "20 Oct 2026 – 19 Nov 2026" or "20 Oct – 19 Nov 2026")
 */
export function formatCycleDateRange(startDateStr: string, endDateStr: string): string {
  try {
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    const startFmt = format(start, 'dd MMM');
    const endFmt = format(end, 'dd MMM yyyy');
    return `${startFmt} – ${endFmt}`;
  } catch {
    return `${startDateStr} – ${endDateStr}`;
  }
}

/**
 * Returns billing month string 'YYYY-MM' (the month startDate falls in)
 */
export function getCycleBillingMonth(cycle: BillingCycle): string {
  return cycle.startDate.slice(0, 7);
}
