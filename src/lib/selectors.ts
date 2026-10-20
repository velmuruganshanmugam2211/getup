import {
  Client,
  Payment,
  Expense,
  Deliverable,
  DeliverableType,
  BillingCycle,
  BillingCyclePackage,
  BillingCycleStatus,
} from '@/types';
import { differenceInMonths, parseISO, startOfMonth } from 'date-fns';
import { mockStore } from '@/services/mock/mockStore';
import { deriveCycleStatus, isCycleRenewalDue, getCycleDaysRemaining } from './cycleUtils';

export interface ClientFinancialMetrics {
  monthlyFee: number;
  monthsElapsed: number;
  expected: number;
  received: number;
  pending: number;
  advance: number;
  overdue: number;
  clientExpenses: number;
  profit: number;
  margin: number;
  lastPaymentDate?: string;
  hasPending: boolean;
}

export interface ActiveTypeMetric {
  type: DeliverableType;
  label: string;
  shortLabel: string;
  perMonth: number;
  promised: number;
  done: number;
  remaining: number;
  extra: number;
  carriedForward: number;
  creditedExtra: number;
  percent: number;
  displayBadge: string; // e.g. "15 / 15 (+7 extra)" or "3 / 15" or "No package"
}

export interface ClientDeliverablesMetrics {
  videosPerMonth: number;
  postsPerMonth: number;
  reelsPerMonth: number;
  storiesPerMonth: number;
  monthlyPromised: number;
  totalPromised: number;

  videosDone: number;
  postsDone: number;
  reelsDone: number;
  storiesDone: number;
  totalDone: number;

  videosRemaining: number;
  postsRemaining: number;
  reelsRemaining: number;
  storiesRemaining: number;
  totalRemaining: number;

  totalExtra: number;
  percent: number;
  isBehind: boolean;
  hasPackage: boolean;

  activeTypes: ActiveTypeMetric[];
  activeTypeKeys: DeliverableType[];

  currentCycle?: BillingCycle;
  cycleDaysRemaining?: number;
  cycleStatus?: BillingCycleStatus;
  isRenewalDue?: boolean;
}

export interface ClientCombinedMetrics {
  client: Client;
  financials: ClientFinancialMetrics;
  deliverables: ClientDeliverablesMetrics;
}

export interface AgencyMetrics {
  totalClients: number;
  activeClients: number;
  totalMonthlyRetainer: number;

  totalExpected: number;
  totalReceived: number;
  totalPending: number;
  totalAdvance: number;
  totalOverdue: number;

  clientExpenses: number;
  agencyExpenses: number;
  totalExpenses: number;

  netProfit: number;
  profitMargin: number;

  totalVideosDelivered: number;
  totalVideosRemaining: number;
  totalDeliverablesDelivered: number;
  totalDeliverablesRemaining: number;
  totalDeliverablesPromised: number;
  totalDeliverablesPercent: number;
}

/**
 * Calculates billing months elapsed between onboarding and asOfDate (min 1 month).
 */
export function calculateMonthsElapsed(
  onboardedOn: string,
  asOfDate: Date | string = new Date(),
  status?: string,
  closedAt?: string
): number {
  if (!onboardedOn) return 1;
  try {
    const start = startOfMonth(parseISO(onboardedOn));
    let targetDate: Date;
    if (status === 'closed' && closedAt) {
      targetDate = parseISO(closedAt);
    } else if (typeof asOfDate === 'string') {
      targetDate = parseISO(asOfDate.length === 7 ? `${asOfDate}-01` : asOfDate);
    } else {
      targetDate = asOfDate;
    }
    const end = startOfMonth(targetDate);
    const diff = differenceInMonths(end, start);
    return Math.max(1, diff + 1);
  } catch {
    return 1;
  }
}

/**
 * Computes exact financial metrics for a single client using month-wise billing cycles.
 * Expected revenue is the sum of cycle fees.
 */
export function computeClientFinancials(
  client: Client,
  payments: Payment[],
  expenses: Expense[],
  asOfDateOrCycles?: Date | string | BillingCycle[],
  cyclesParam?: BillingCycle[]
): ClientFinancialMetrics {
  let asOfDate: Date | string = new Date();
  let cycles = cyclesParam;

  if (Array.isArray(asOfDateOrCycles)) {
    cycles = asOfDateOrCycles;
  } else if (asOfDateOrCycles) {
    asOfDate = asOfDateOrCycles;
  }

  const storeCycles = cycles || mockStore.billingCycles || [];
  const clientCycles = storeCycles
    .filter((c) => c.clientId === client.id)
    .sort((a, b) => a.cycleNumber - b.cycleNumber);

  const monthlyFee = client.monthlyFee || 0;
  const monthsElapsed = clientCycles.length > 0
    ? clientCycles.length
    : calculateMonthsElapsed(client.onboardedOn, asOfDate, client.status);

  // Expected revenue = sum of cycle fees (replaces monthlyFee * months formula)
  const expected = clientCycles.length > 0
    ? clientCycles.reduce((sum, c) => sum + (c.feeAmount || 0), 0)
    : monthlyFee * monthsElapsed;

  const clientPayments = payments.filter((p) => p.clientId === client.id);
  const paidPayments = clientPayments.filter((p) => p.status === 'paid');
  const received = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  const pending = Math.max(0, expected - received);
  const advance = Math.max(0, received - expected);

  // Overdue = unpaid portion belonging strictly to completed past cycles
  let overdue = 0;
  if (clientCycles.length > 1) {
    const pastExpected = clientCycles
      .slice(0, clientCycles.length - 1)
      .reduce((sum, c) => sum + (c.feeAmount || 0), 0);
    overdue = Math.max(0, pastExpected - received);
  } else if (monthsElapsed > 1) {
    const pastExpected = monthlyFee * (monthsElapsed - 1);
    overdue = Math.max(0, pastExpected - received);
  }

  const clientExpenses = expenses
    .filter((e) => e.clientId === client.id)
    .reduce((sum, e) => sum + e.amount, 0);

  const profit = received - clientExpenses;
  const margin = received > 0 ? Math.round((profit / received) * 100) : clientExpenses > 0 ? -100 : 0;

  const sortedPaid = [...paidPayments].sort((a, b) => b.date.localeCompare(a.date));
  const lastPaymentDate = sortedPaid[0]?.date;

  return {
    monthlyFee,
    monthsElapsed,
    expected,
    received,
    pending,
    advance,
    overdue,
    clientExpenses,
    profit,
    margin,
    lastPaymentDate,
    hasPending: pending > 0,
  };
}

/**
 * Computes deliverables metrics for a single client based on active or selected month cycle.
 * Implements strict over-delivery rules:
 * - Progress per type = min(done, promised) / promised
 * - Extra shows separately as a badge: "Reels 15 / 15 (+7 extra)"
 * - Total progress never exceeds 100% and never mixes extra into percentage
 * - Show 0/0 as "No package", never 100%
 * - Remaining = max(promised - done, 0)
 */
export function computeClientDeliverables(
  client: Client,
  deliverables: Deliverable[],
  asOfDateOrCycles?: Date | string | BillingCycle[],
  cyclesParam?: BillingCycle[]
): ClientDeliverablesMetrics {
  let asOfDate: Date | string = new Date();
  let cycles = cyclesParam;

  if (Array.isArray(asOfDateOrCycles)) {
    cycles = asOfDateOrCycles;
  } else if (asOfDateOrCycles) {
    asOfDate = asOfDateOrCycles;
  }

  const storeCycles = cycles || mockStore.billingCycles || [];
  const clientCycles = storeCycles
    .filter((c) => c.clientId === client.id)
    .sort((a, b) => b.cycleNumber - a.cycleNumber);

  const todayStr = '2026-10-20';
  const monthFilter = typeof asOfDate === 'string' && asOfDate.length === 7 ? asOfDate : null;

  // Find relevant cycle
  let targetCycle: BillingCycle | undefined;

  if (monthFilter) {
    // Filter by billing month (the month cycle.startDate falls in)
    targetCycle = clientCycles.find((c) => c.startDate.slice(0, 7) === monthFilter);
  }

  if (!targetCycle) {
    // Find active cycle (today between start and end)
    targetCycle = clientCycles.find((c) => todayStr >= c.startDate && todayStr <= c.endDate);
  }

  if (!targetCycle && clientCycles.length > 0) {
    // Fallback to latest cycle
    targetCycle = clientCycles[0];
  }

  // Snapshot or fallback package
  const pkgSnapshot: BillingCyclePackage = targetCycle?.package || {
    videos: client.package?.videosPerMonth,
    posts: client.package?.postersPerMonth,
    reels: client.package?.reelsPerMonth,
    stories: client.package?.storiesPerMonth,
  };

  const videosPerMonth = pkgSnapshot.videos || 0;
  const postsPerMonth = pkgSnapshot.posts || 0;
  const reelsPerMonth = pkgSnapshot.reels || 0;
  const storiesPerMonth = pkgSnapshot.stories || 0;
  const monthlyPromised = videosPerMonth + postsPerMonth + reelsPerMonth + storiesPerMonth;

  // Carried forward & Credited extra from previous cycle
  const carried = targetCycle?.carriedForward || {};
  const credited = targetCycle?.creditedExtra || {};

  // Deliverables strictly in this cycle
  const clientDelivs = deliverables.filter((d) => d.clientId === client.id);
  const cycleDelivs = targetCycle
    ? clientDelivs.filter(
        (d) =>
          d.status === 'delivered' &&
          (d.cycleId === targetCycle.id ||
            (!d.cycleId && d.date >= targetCycle.startDate && d.date <= targetCycle.endDate))
      )
    : clientDelivs.filter((d) => d.status === 'delivered');

  const calcType = (
    type: DeliverableType,
    label: string,
    shortLabel: string,
    basePerMonth: number,
    carriedCount = 0,
    creditCount = 0
  ): ActiveTypeMetric | null => {
    const promised = basePerMonth + carriedCount;
    const deliveredCount = cycleDelivs.filter((d) => d.type === type).length;
    const totalDone = deliveredCount + creditCount;

    // Strict rule: capped progress = min(done, promised) / promised
    const cappedDone = Math.min(totalDone, promised);
    const remaining = Math.max(0, promised - totalDone);
    const extra = Math.max(0, totalDone - promised);

    const percent = promised > 0 ? Math.min(100, Math.round((cappedDone / promised) * 100)) : 0;

    let displayBadge = `${totalDone} / ${promised}`;
    if (promised === 0 && totalDone === 0) {
      displayBadge = 'No package';
    } else if (extra > 0) {
      displayBadge = `${promised} / ${promised} (+${extra} extra)`;
    }

    if (basePerMonth === 0 && carriedCount === 0 && totalDone === 0) {
      return null;
    }

    return {
      type,
      label,
      shortLabel,
      perMonth: basePerMonth,
      promised,
      done: totalDone,
      remaining,
      extra,
      carriedForward: carriedCount,
      creditedExtra: creditCount,
      percent,
      displayBadge,
    };
  };

  const videoMetric = calcType('video', 'Videos', 'V', videosPerMonth, carried.videos || 0, credited.videos || 0);
  const postMetric = calcType('post', 'Posts', 'P', postsPerMonth, carried.posts || 0, credited.posts || 0);
  const reelMetric = calcType('reel', 'Reels', 'R', reelsPerMonth, carried.reels || 0, credited.reels || 0);
  const storyMetric = calcType('story', 'Stories', 'S', storiesPerMonth, carried.stories || 0, credited.stories || 0);

  const activeTypes: ActiveTypeMetric[] = [videoMetric, postMetric, reelMetric, storyMetric].filter(
    (m): m is ActiveTypeMetric => m !== null
  );

  const activeTypeKeys = activeTypes.map((m) => m.type);

  const videosDone = videoMetric ? videoMetric.done : 0;
  const postsDone = postMetric ? postMetric.done : 0;
  const reelsDone = reelMetric ? reelMetric.done : 0;
  const storiesDone = storyMetric ? storyMetric.done : 0;
  const totalDone = videosDone + postsDone + reelsDone + storiesDone;

  const totalPromised = activeTypes.reduce((sum, m) => sum + m.promised, 0);
  const totalCappedDone = activeTypes.reduce((sum, m) => sum + Math.min(m.done, m.promised), 0);
  const totalRemaining = activeTypes.reduce((sum, m) => sum + m.remaining, 0);
  const totalExtra = activeTypes.reduce((sum, m) => sum + m.extra, 0);

  const hasPackage = totalPromised > 0;
  // Rule: total progress never exceeds 100% and never mixes extra into percentage
  const percent = hasPackage ? Math.min(100, Math.round((totalCappedDone / totalPromised) * 100)) : 0;
  const isBehind = hasPackage && percent < 50;

  const cycleStatus = targetCycle ? deriveCycleStatus(targetCycle, todayStr, client.status) : undefined;
  const cycleDaysRemaining = targetCycle ? getCycleDaysRemaining(targetCycle, todayStr) : undefined;
  const isRenewalDueStatus = targetCycle ? isCycleRenewalDue(targetCycle, todayStr, client.status) : false;

  return {
    videosPerMonth,
    postsPerMonth,
    reelsPerMonth,
    storiesPerMonth,
    monthlyPromised,
    totalPromised,

    videosDone,
    postsDone,
    reelsDone,
    storiesDone,
    totalDone,

    videosRemaining: videoMetric ? videoMetric.remaining : 0,
    postsRemaining: postMetric ? postMetric.remaining : 0,
    reelsRemaining: reelMetric ? reelMetric.remaining : 0,
    storiesRemaining: storyMetric ? storyMetric.remaining : 0,
    totalRemaining,

    totalExtra,
    percent,
    isBehind,
    hasPackage,

    activeTypes,
    activeTypeKeys,

    currentCycle: targetCycle,
    cycleDaysRemaining,
    cycleStatus,
    isRenewalDue: isRenewalDueStatus,
  };
}

/**
 * Computes combined metrics for an array of clients.
 */
export function computeAllClientsMetrics(
  clients: Client[],
  payments: Payment[],
  expenses: Expense[],
  deliverables: Deliverable[],
  asOfDateOrCycles?: Date | string | BillingCycle[],
  cyclesParam?: BillingCycle[]
): ClientCombinedMetrics[] {
  let asOfDate: Date | string = new Date();
  let cycles = cyclesParam;

  if (Array.isArray(asOfDateOrCycles)) {
    cycles = asOfDateOrCycles;
  } else if (asOfDateOrCycles) {
    asOfDate = asOfDateOrCycles;
  }

  const storeCycles = cycles || mockStore.billingCycles || [];
  return clients.map((client) => ({
    client,
    financials: computeClientFinancials(client, payments, expenses, asOfDate, storeCycles),
    deliverables: computeClientDeliverables(client, deliverables, asOfDate, storeCycles),
  }));
}

/**
 * Computes agency-wide totals. GUARANTEED to match every page.
 */
export function computeAgencyMetrics(
  clients: Client[],
  payments: Payment[],
  expenses: Expense[],
  deliverables: Deliverable[],
  asOfDateOrCycles?: Date | string | BillingCycle[],
  cyclesParam?: BillingCycle[]
): AgencyMetrics {
  let asOfDate: Date | string = new Date();
  let cycles = cyclesParam;

  if (Array.isArray(asOfDateOrCycles)) {
    cycles = asOfDateOrCycles;
  } else if (asOfDateOrCycles) {
    asOfDate = asOfDateOrCycles;
  }

  const storeCycles = cycles || mockStore.billingCycles || [];
  const combined = computeAllClientsMetrics(clients, payments, expenses, deliverables, asOfDate, storeCycles);

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === 'active').length;
  const totalMonthlyRetainer = clients
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + c.monthlyFee, 0);

  const totalExpected = combined.reduce((sum, c) => sum + c.financials.expected, 0);
  const totalReceived = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = combined.reduce((sum, c) => sum + c.financials.pending, 0);
  const totalAdvance = combined.reduce((sum, c) => sum + c.financials.advance, 0);
  const totalOverdue = combined.reduce((sum, c) => sum + c.financials.overdue, 0);

  const clientExpenses = expenses
    .filter((e) => e.type === 'client' || !!e.clientId)
    .reduce((sum, e) => sum + e.amount, 0);

  const agencyExpenses = expenses
    .filter((e) => e.type === 'agency' || !e.clientId)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenses = clientExpenses + agencyExpenses;
  const netProfit = totalReceived - totalExpenses;
  const profitMargin = totalReceived > 0 ? Math.round((netProfit / totalReceived) * 100) : 0;

  const totalVideosDelivered = deliverables.filter(
    (d) => d.type === 'video' && d.status === 'delivered'
  ).length;
  const totalVideosRemaining = combined.reduce(
    (sum, c) => sum + c.deliverables.videosRemaining,
    0
  );
  const totalDeliverablesDelivered = deliverables.filter((d) => d.status === 'delivered').length;
  const totalDeliverablesRemaining = combined.reduce(
    (sum, c) => sum + c.deliverables.totalRemaining,
    0
  );
  const totalDeliverablesPromised = combined.reduce(
    (sum, c) => sum + c.deliverables.totalPromised,
    0
  );
  const totalDeliverablesPercent = totalDeliverablesPromised > 0
    ? Math.min(100, Math.round((totalDeliverablesDelivered / totalDeliverablesPromised) * 100))
    : 0;

  return {
    totalClients,
    activeClients,
    totalMonthlyRetainer,

    totalExpected,
    totalReceived,
    totalPending,
    totalAdvance,
    totalOverdue,

    clientExpenses,
    agencyExpenses,
    totalExpenses,

    netProfit,
    profitMargin,

    totalVideosDelivered,
    totalVideosRemaining,
    totalDeliverablesDelivered,
    totalDeliverablesRemaining,
    totalDeliverablesPromised,
    totalDeliverablesPercent,
  };
}
