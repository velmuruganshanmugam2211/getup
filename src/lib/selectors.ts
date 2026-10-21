import {
  Client,
  Payment,
  Expense,
  Deliverable,
  DeliverableType,
  BillingCycle,
  BillingCyclePackage,
  BillingCycleStatus,
  Lead,
  CallLog,
  CallOutcome,
} from '@/types';
import { differenceInMonths, parseISO, startOfMonth, format, addDays } from 'date-fns';
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
  displayBadgeWithRemaining: string; // e.g. "Videos 9 / 15 (6 remaining)" or "Videos 15 / 15 (+2 extra)"
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

  fixedExpenses: number;
  variableExpenses: number;
  clientExpenses: number;
  agencyExpenses: number;
  totalExpenses: number;

  netProfit: number;
  profitMargin: number;
  closingCash: number;

  totalVideosDelivered: number;
  totalVideosRemaining: number;
  totalDeliverablesDelivered: number;
  totalDeliverablesRemaining: number;
  totalDeliverablesPromised: number;
  totalDeliverablesPercent: number;
}

export interface CashFlowEntry {
  id: string;
  date: string;
  description: string;
  clientOrParty: string;
  clientId?: string;
  reference?: string;
  category?: string;
  nature?: 'fixed' | 'variable';
  type: 'in' | 'out_fixed' | 'out_variable' | 'inflow' | 'outflow';
  typeLabel: string;
  amount: number;
  inflow: number;
  outflow: number;
  runningBalance: number;
}

export interface MonthlyCashFlow {
  month: string;
  monthLabel: string;
  openingBalance: number;
  received: number;
  moneyReceived: number;
  fixedExpenses: number;
  fixedExpensesPaid: number;
  variableExpenses: number;
  variableExpensesPaid: number;
  totalExpenses: number;
  totalSpent: number;
  closingBalance: number;
  entries: CashFlowEntry[];
  ledger: CashFlowEntry[];
  last6Months: Array<{
    month: string;
    monthLabel: string;
    openingBalance: number;
    closingBalance: number;
    received: number;
    totalExpenses: number;
  }>;
  trend: Array<{
    month: string;
    opening: number;
    closing: number;
    received: number;
    spent: number;
  }>;
}

export type CashFlowStatement = MonthlyCashFlow;

export interface CallStats {
  callsMade: number;
  totalCalls: number;
  uniqueContacts: number;
  uniqueContactsCalled: number;
  connected: number;
  notAnswered: number;
  followUpsPending: number;
  followUpsDueToday: number;
  meetingsFixed: number;
  meetingsTomorrowOrThisWeek: number;
  interested: number;
  converted: number;
  connectionRate: number;
  conversionRate: number;
  perCallerStats: Array<{
    caller: string;
    callsCount: number;
    totalCalls?: number;
    connectedCount: number;
    connected?: number;
    meetingsCount: number;
    meetingsFixed?: number;
    followUpsCount: number;
    followUps?: number;
  }>;
  perCaller: Array<{
    caller: string;
    callsCount: number;
    totalCalls?: number;
    connectedCount: number;
    connected?: number;
    meetingsCount: number;
    meetingsFixed?: number;
    followUpsCount: number;
    followUps?: number;
  }>;
  meetingsUpcoming: number;
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
 * When asOfDateOrCycles is a month string (e.g. '2026-10'), returns metrics strictly for that month.
 * Otherwise returns cumulative all-time metrics.
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
  const isMonthQuery = typeof asOfDate === 'string' && asOfDate.length === 7;
  const monthStr = isMonthQuery ? (asOfDate as string) : null;

  if (monthStr) {
    // Specific Month Metrics
    const matchingCycle = clientCycles.find(
      (c) =>
        c.startDate.slice(0, 7) === monthStr ||
        (monthStr >= c.startDate.slice(0, 7) && monthStr <= c.endDate.slice(0, 7))
    );
    const expected = matchingCycle
      ? matchingCycle.feeAmount
      : client.status === 'active' || client.status === 'paused'
      ? monthlyFee
      : 0;

    const clientPayments = payments.filter((p) => p.clientId === client.id);
    const paidPayments = clientPayments.filter(
      (p) =>
        p.status === 'paid' &&
        (p.month === monthStr || (p.date && p.date.startsWith(monthStr)))
    );
    const received = paidPayments.reduce((sum, p) => sum + p.amount, 0);

    const pending = Math.max(0, expected - received);
    const advance = Math.max(0, received - expected);

    let overdue = 0;
    if (matchingCycle) {
      const pastCycles = clientCycles.filter((c) => c.cycleNumber < matchingCycle.cycleNumber);
      const pastExpected = pastCycles.reduce((sum, c) => sum + (c.feeAmount || 0), 0);
      const pastPaid = clientPayments
        .filter((p) => p.status === 'paid' && p.date < matchingCycle.startDate)
        .reduce((sum, p) => sum + p.amount, 0);
      overdue = Math.max(0, pastExpected - pastPaid);
    }

    const clientExpenses = expenses
      .filter((e) => e.clientId === client.id && (e.date.startsWith(monthStr) || (matchingCycle && e.cycleId === matchingCycle.id)))
      .reduce((sum, e) => sum + e.amount, 0);

    const profit = received - clientExpenses;
    const margin = received > 0 ? Math.round((profit / received) * 100) : clientExpenses > 0 ? -100 : 0;

    const sortedPaid = [...paidPayments].sort((a, b) => b.date.localeCompare(a.date));
    const lastPaymentDate = sortedPaid[0]?.date;

    return {
      monthlyFee,
      monthsElapsed: 1,
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

  // All-time Metrics (when asOfDate is not a YYYY-MM month string)
  const monthsElapsed = clientCycles.length > 0
    ? clientCycles.length
    : calculateMonthsElapsed(client.onboardedOn, asOfDate, client.status);

  const expected = clientCycles.length > 0
    ? clientCycles.reduce((sum, c) => sum + (c.feeAmount || 0), 0)
    : monthlyFee * monthsElapsed;

  const clientPayments = payments.filter((p) => p.clientId === client.id);
  const paidPayments = clientPayments.filter((p) => p.status === 'paid');
  const received = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  const pending = Math.max(0, expected - received);
  const advance = Math.max(0, received - expected);

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

  const todayStr = '2026-10-21';
  const monthFilter = typeof asOfDate === 'string' && asOfDate.length === 7 ? asOfDate : null;

  // Find relevant cycle
  let targetCycle: BillingCycle | undefined;

  if (monthFilter) {
    targetCycle = clientCycles.find((c) => c.startDate.slice(0, 7) === monthFilter);
  }

  if (!targetCycle) {
    targetCycle = clientCycles.find((c) => todayStr >= c.startDate && todayStr <= c.endDate);
  }

  if (!targetCycle && clientCycles.length > 0) {
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
    let displayBadgeWithRemaining = `${label} ${totalDone} / ${promised} (${remaining} remaining)`;

    if (promised === 0 && totalDone === 0) {
      displayBadge = 'No package';
      displayBadgeWithRemaining = 'No package';
    } else if (extra > 0) {
      displayBadge = `${promised} / ${promised} (+${extra} extra)`;
      displayBadgeWithRemaining = `${label} ${promised} / ${promised} (+${extra} extra)`;
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
      displayBadgeWithRemaining,
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
    if (typeof cyclesParam === 'string' || cyclesParam instanceof Date) {
      asOfDate = cyclesParam;
    }
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
 * Computes agency-wide totals. GUARANTEED to match every page (Finance, Dashboard, Clients, Reports).
 */
export function computeAgencyMetrics(
  clients: Client[],
  payments: Payment[],
  expenses: Expense[],
  deliverables: Deliverable[],
  asOfDateOrCycles?: Date | string | BillingCycle[],
  cyclesParam?: BillingCycle[] | string,
  initialOpeningBalance: number = 0
): AgencyMetrics {
  let asOfDate: Date | string = new Date();
  let cycles: BillingCycle[] | undefined = Array.isArray(cyclesParam) ? cyclesParam : undefined;

  if (Array.isArray(asOfDateOrCycles)) {
    cycles = asOfDateOrCycles;
    if (typeof cyclesParam === 'string' || cyclesParam instanceof Date) {
      asOfDate = cyclesParam;
    }
  } else if (asOfDateOrCycles) {
    asOfDate = asOfDateOrCycles;
  }

  const storeCycles = cycles || mockStore.billingCycles || [];
  const combined = computeAllClientsMetrics(clients, payments, expenses, deliverables, asOfDate, storeCycles);

  const isMonthQuery = typeof asOfDate === 'string' && asOfDate.length === 7;
  const monthStr = isMonthQuery ? (asOfDate as string) : null;

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === 'active').length;
  const totalMonthlyRetainer = clients
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + c.monthlyFee, 0);

  const totalExpected = combined.reduce((sum, c) => sum + c.financials.expected, 0);

  // If month query, filter payments and expenses strictly to that month
  const targetPayments = monthStr
    ? payments.filter((p) => p.month === monthStr || (p.date && p.date.startsWith(monthStr)))
    : payments;

  const targetExpenses = monthStr
    ? expenses.filter((e) => e.date && e.date.startsWith(monthStr))
    : expenses;

  const totalReceived = targetPayments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = combined.reduce((sum, c) => sum + c.financials.pending, 0);
  const totalAdvance = combined.reduce((sum, c) => sum + c.financials.advance, 0);
  const totalOverdue = combined.reduce((sum, c) => sum + c.financials.overdue, 0);

  const fixedExpenses = targetExpenses
    .filter((e) => e.expenseNature === 'fixed')
    .reduce((sum, e) => sum + e.amount, 0);

  const variableExpenses = targetExpenses
    .filter((e) => e.expenseNature === 'variable' || !e.expenseNature)
    .reduce((sum, e) => sum + e.amount, 0);

  const clientExpenses = targetExpenses
    .filter((e) => e.type === 'client' || !!e.clientId)
    .reduce((sum, e) => sum + e.amount, 0);

  const agencyExpenses = targetExpenses
    .filter((e) => e.type === 'agency' && !e.clientId)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenses = fixedExpenses + variableExpenses;
  const netProfit = totalReceived - totalExpenses;
  const profitMargin = totalReceived > 0 ? Math.round((netProfit / totalReceived) * 100) : 0;

  // Closing cash via cash flow selector
  const cfMonth = monthStr || (typeof asOfDate === 'string' ? asOfDate.slice(0, 7) : '2026-10');
  const cf = computeCashFlow(cfMonth, payments, expenses, initialOpeningBalance);
  const closingCash = cf.closingBalance;

  const totalVideosDelivered = deliverables.filter(
    (d) => d.type === 'video' && d.status === 'delivered' && (!monthStr || d.date.startsWith(monthStr) || d.month === monthStr)
  ).length;
  const totalVideosRemaining = combined.reduce(
    (sum, c) => sum + c.deliverables.videosRemaining,
    0
  );
  const totalDeliverablesDelivered = deliverables.filter(
    (d) => d.status === 'delivered' && (!monthStr || d.date.startsWith(monthStr) || d.month === monthStr)
  ).length;
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

    fixedExpenses,
    variableExpenses,
    clientExpenses,
    agencyExpenses,
    totalExpenses,

    netProfit,
    profitMargin,
    closingCash,

    totalVideosDelivered,
    totalVideosRemaining,
    totalDeliverablesDelivered,
    totalDeliverablesRemaining,
    totalDeliverablesPromised,
    totalDeliverablesPercent,
  };
}

/**
 * Derives cash flow ledger and opening/closing balance for a selected month.
 */
export function computeCashFlow(
  targetMonth: string,
  payments: Payment[],
  expenses: Expense[],
  initialOpeningBalance: number = 0,
  clientMap?: Map<string, string>
): MonthlyCashFlow {
  const allMonthsSet = new Set<string>();
  allMonthsSet.add(targetMonth);

  payments.forEach((p) => {
    if (p.month) allMonthsSet.add(p.month);
    else if (p.date) allMonthsSet.add(p.date.slice(0, 7));
  });

  expenses.forEach((e) => {
    if (e.date) allMonthsSet.add(e.date.slice(0, 7));
  });

  const sortedMonths = Array.from(allMonthsSet).filter(Boolean).sort();

  let runningClosing = initialOpeningBalance;
  const monthMap = new Map<string, {
    month: string;
    monthLabel: string;
    openingBalance: number;
    received: number;
    fixedExpenses: number;
    variableExpenses: number;
    totalExpenses: number;
    closingBalance: number;
  }>();

  for (const m of sortedMonths) {
    const opening = runningClosing;
    const mPayments = payments.filter(
      (p) => p.status === 'paid' && (p.month === m || (p.date && p.date.startsWith(m)))
    );
    const mReceived = mPayments.reduce((s, p) => s + p.amount, 0);

    const mExpenses = expenses.filter((e) => e.date && e.date.startsWith(m));
    const mFixed = mExpenses
      .filter((e) => e.expenseNature === 'fixed')
      .reduce((s, e) => s + e.amount, 0);
    const mVariable = mExpenses
      .filter((e) => e.expenseNature === 'variable' || !e.expenseNature)
      .reduce((s, e) => s + e.amount, 0);
    const mTotalExpenses = mFixed + mVariable;
    const closing = opening + mReceived - mTotalExpenses;

    const [yr, mo] = m.split('-').map(Number);
    const dateObj = new Date(yr || 2026, (mo || 1) - 1, 1);
    const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    monthMap.set(m, {
      month: m,
      monthLabel,
      openingBalance: opening,
      received: mReceived,
      fixedExpenses: mFixed,
      variableExpenses: mVariable,
      totalExpenses: mTotalExpenses,
      closingBalance: closing,
    });

    runningClosing = closing;
  }

  const currentMonthData = monthMap.get(targetMonth) || {
    month: targetMonth,
    monthLabel: targetMonth,
    openingBalance: runningClosing,
    received: 0,
    fixedExpenses: 0,
    variableExpenses: 0,
    totalExpenses: 0,
    closingBalance: runningClosing,
  };

  const targetPayments = payments.filter(
    (p) => p.status === 'paid' && (p.month === targetMonth || (p.date && p.date.startsWith(targetMonth)))
  );
  const targetExpenses = expenses.filter((e) => e.date && e.date.startsWith(targetMonth));

  interface RawItem {
    id: string;
    date: string;
    description: string;
    clientOrParty: string;
    type: 'in' | 'out_fixed' | 'out_variable';
    typeLabel: string;
    amount: number;
  }

  const rawItems: RawItem[] = [];

  for (const p of targetPayments) {
    const party = (clientMap && clientMap.get(p.clientId)) || p.clientId || 'Client Payment';
    rawItems.push({
      id: p.id,
      date: p.date || `${targetMonth}-01`,
      description: p.notes || `Retainer payment (${(p.mode || 'transfer').replace('_', ' ')})`,
      clientOrParty: party,
      type: 'in',
      typeLabel: 'Money In (Payment)',
      amount: p.amount,
    });
  }

  for (const e of targetExpenses) {
    const isFixed = e.expenseNature === 'fixed';
    const party = e.clientId
      ? (clientMap && clientMap.get(e.clientId)) || e.clientId
      : e.paidTo || 'Agency Operational';

    rawItems.push({
      id: e.id,
      date: e.date,
      description: e.note || e.category,
      clientOrParty: party,
      type: isFixed ? 'out_fixed' : 'out_variable',
      typeLabel: isFixed ? 'Fixed Expense' : 'Variable Expense',
      amount: e.amount,
    });
  }

  rawItems.sort((a, b) => a.date.localeCompare(b.date));

  let currentRun = currentMonthData.openingBalance;
  const entries: CashFlowEntry[] = rawItems.map((item) => {
    const isIn = item.type === 'in';
    const isFixed = item.type === 'out_fixed';
    if (isIn) {
      currentRun += item.amount;
    } else {
      currentRun -= item.amount;
    }
    return {
      ...item,
      nature: isIn ? undefined : (isFixed ? 'fixed' : 'variable'),
      inflow: isIn ? item.amount : 0,
      outflow: isIn ? 0 : item.amount,
      runningBalance: currentRun,
    };
  });

  const targetIndex = sortedMonths.indexOf(targetMonth);
  const sliceStart = Math.max(0, targetIndex - 5);
  const last6Months = sortedMonths
    .slice(sliceStart, targetIndex + 1)
    .map((m) => monthMap.get(m)!);

  return {
    ...currentMonthData,
    moneyReceived: currentMonthData.received,
    fixedExpensesPaid: currentMonthData.fixedExpenses,
    variableExpensesPaid: currentMonthData.variableExpenses,
    totalSpent: currentMonthData.totalExpenses,
    entries,
    ledger: entries,
    last6Months,
    trend: last6Months.map((m) => ({
      month: m.monthLabel || m.month,
      opening: m.openingBalance,
      closing: m.closingBalance,
      received: m.received,
      spent: m.totalExpenses,
    })),
  };
}

/**
 * Computes calls and follow-ups metrics for Calls module and Reports.
 */
export function computeCallStats(
  callLogs: CallLog[],
  leads: Lead[],
  period?: { start?: string; end?: string; date?: string },
  todayStr: string = '2026-10-21'
): CallStats {
  let logs = [...callLogs];

  if (period?.date) {
    logs = logs.filter((c) => c.date === period.date);
  } else if (period?.start && period?.end) {
    logs = logs.filter((c) => c.date >= period.start! && c.date <= period.end!);
  }

  const callsMade = logs.length;
  const uniqueContacts = new Set(logs.map((c) => c.leadId)).size;

  const connectedOutcomes: CallOutcome[] = ['Interested', 'Callback requested', 'Meeting fixed', 'Not interested'];
  const notAnsweredOutcomes: CallOutcome[] = ['Not answered', 'Busy', 'Wrong number'];

  const connected = logs.filter((c) => connectedOutcomes.includes(c.outcome)).length;
  const notAnswered = logs.filter((c) => notAnsweredOutcomes.includes(c.outcome)).length;

  const followUpsPending = callLogs.filter((c) => !!c.followUpDate && !c.followUpDone).length;
  const followUpsDueToday = callLogs.filter(
    (c) => c.followUpDate === todayStr && !c.followUpDone
  ).length;

  const meetingsFixed = logs.filter((c) => c.outcome === 'Meeting fixed').length;

  // Upcoming meetings from call logs
  const tomorrowStr = format(addDays(parseISO(todayStr), 1), 'yyyy-MM-dd');
  const nextWeekStr = format(addDays(parseISO(todayStr), 7), 'yyyy-MM-dd');
  const meetingsTomorrowOrThisWeek = callLogs.filter(
    (c) =>
      c.outcome === 'Meeting fixed' &&
      c.followUpDate &&
      c.followUpDate >= tomorrowStr &&
      c.followUpDate <= nextWeekStr
  ).length;

  const interested = logs.filter((c) => c.outcome === 'Interested').length;
  const converted = leads.filter((l) => l.stage === 'Converted' || !!l.convertedClientId).length;

  const connectionRate = callsMade > 0 ? Math.round((connected / callsMade) * 100) : 0;
  const conversionRate = leads.length > 0 ? Math.round((converted / leads.length) * 100) : 0;

  const callerMap = new Map<string, { calls: number; connected: number; meetings: number; followUps: number }>();
  for (const c of logs) {
    const caller = c.calledBy || 'Unassigned';
    if (!callerMap.has(caller)) {
      callerMap.set(caller, { calls: 0, connected: 0, meetings: 0, followUps: 0 });
    }
    const stat = callerMap.get(caller)!;
    stat.calls++;
    if (connectedOutcomes.includes(c.outcome)) stat.connected++;
    if (c.outcome === 'Meeting fixed') stat.meetings++;
    if (c.followUpDate) stat.followUps++;
  }

  const perCallerStats = Array.from(callerMap.entries()).map(([caller, data]) => ({
    caller,
    callsCount: data.calls,
    totalCalls: data.calls,
    connectedCount: data.connected,
    connected: data.connected,
    meetingsCount: data.meetings,
    meetingsFixed: data.meetings,
    followUpsCount: data.followUps,
    followUps: data.followUps,
  }));

  return {
    callsMade,
    totalCalls: callsMade,
    uniqueContacts,
    uniqueContactsCalled: uniqueContacts,
    connected,
    notAnswered,
    followUpsPending,
    followUpsDueToday,
    meetingsFixed,
    meetingsTomorrowOrThisWeek,
    interested,
    converted,
    connectionRate,
    conversionRate,
    perCallerStats,
    perCaller: perCallerStats,
    meetingsUpcoming: meetingsTomorrowOrThisWeek,
  };
}

