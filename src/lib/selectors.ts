import { Client, Payment, Expense, Deliverable, DeliverableType } from '@/types';
import { differenceInMonths, parseISO, startOfMonth } from 'date-fns';

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
  percent: number;
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

  percent: number;
  isBehind: boolean;
  hasPackage: boolean;

  activeTypes: ActiveTypeMetric[];
  activeTypeKeys: DeliverableType[];
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
 * Computes exact financial metrics for a single client.
 */
export function computeClientFinancials(
  client: Client,
  payments: Payment[],
  expenses: Expense[],
  asOfDate: Date | string = new Date()
): ClientFinancialMetrics {
  const monthlyFee = client.monthlyFee || 0;
  const monthsElapsed = calculateMonthsElapsed(client.onboardedOn, asOfDate, client.status);
  const expected = monthlyFee * monthsElapsed;

  const clientPayments = payments.filter((p) => p.clientId === client.id);
  const paidPayments = clientPayments.filter((p) => p.status === 'paid');
  const received = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  const pending = Math.max(0, expected - received);
  const advance = Math.max(0, received - expected);

  // Overdue = portion of expected revenue belonging strictly to past months that remains unpaid
  let overdue = 0;
  if (monthsElapsed > 1) {
    const pastExpected = monthlyFee * (monthsElapsed - 1);
    overdue = Math.max(0, pastExpected - received);
  }

  const clientExpenses = expenses
    .filter((e) => e.clientId === client.id)
    .reduce((sum, e) => sum + e.amount, 0);

  const profit = received - clientExpenses;
  const margin = received > 0 ? Math.round((profit / received) * 100) : clientExpenses > 0 ? -100 : 0;

  // Last payment date
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
 * Computes deliverables metrics for a single client (promised, done, remaining across 4 types).
 */
export function computeClientDeliverables(
  client: Client,
  deliverables: Deliverable[],
  asOfDate: Date | string = new Date()
): ClientDeliverablesMetrics {
  const pkg = client.package;
  const videosPerMonth = pkg?.videosPerMonth || 0;
  const postsPerMonth = pkg?.postersPerMonth || 0;
  const reelsPerMonth = pkg?.reelsPerMonth || 0;
  const storiesPerMonth = pkg?.storiesPerMonth || 0;
  const monthlyPromised = videosPerMonth + postsPerMonth + reelsPerMonth + storiesPerMonth;

  const monthsElapsed = calculateMonthsElapsed(client.onboardedOn, asOfDate, client.status);
  const totalPromised = monthlyPromised * monthsElapsed;

  const clientDelivs = deliverables.filter((d) => d.clientId === client.id);
  const delivered = clientDelivs.filter((d) => d.status === 'delivered');

  const videosDone = delivered.filter((d) => d.type === 'video').length;
  const postsDone = delivered.filter((d) => d.type === 'post').length;
  const reelsDone = delivered.filter((d) => d.type === 'reel').length;
  const storiesDone = delivered.filter((d) => d.type === 'story').length;
  const totalDone = videosDone + postsDone + reelsDone + storiesDone;

  const promisedVideos = videosPerMonth * monthsElapsed;
  const promisedPosts = postsPerMonth * monthsElapsed;
  const promisedReels = reelsPerMonth * monthsElapsed;
  const promisedStories = storiesPerMonth * monthsElapsed;

  const videosRemaining = Math.max(0, promisedVideos - videosDone);
  const postsRemaining = Math.max(0, promisedPosts - postsDone);
  const reelsRemaining = Math.max(0, promisedReels - reelsDone);
  const storiesRemaining = Math.max(0, promisedStories - storiesDone);
  const totalRemaining = Math.max(0, totalPromised - totalDone);

  const hasPackage = monthlyPromised > 0;
  const percent =
    hasPackage && totalPromised > 0
      ? Math.min(100, Math.round((totalDone / totalPromised) * 100))
      : 0;

  const isBehind = hasPackage && totalPromised > 0 && percent < 50;

  // Active types: only deliverable types with non-zero allocation in package
  const activeTypes: ActiveTypeMetric[] = [];
  const activeTypeKeys: DeliverableType[] = [];

  if (videosPerMonth > 0) {
    activeTypeKeys.push('video');
    activeTypes.push({
      type: 'video',
      label: 'Videos',
      shortLabel: 'V',
      perMonth: videosPerMonth,
      promised: promisedVideos,
      done: videosDone,
      remaining: videosRemaining,
      percent: promisedVideos > 0 ? Math.min(100, Math.round((videosDone / promisedVideos) * 100)) : 0,
    });
  }

  if (postsPerMonth > 0) {
    activeTypeKeys.push('post');
    activeTypes.push({
      type: 'post',
      label: 'Posts',
      shortLabel: 'P',
      perMonth: postsPerMonth,
      promised: promisedPosts,
      done: postsDone,
      remaining: postsRemaining,
      percent: promisedPosts > 0 ? Math.min(100, Math.round((postsDone / promisedPosts) * 100)) : 0,
    });
  }

  if (reelsPerMonth > 0) {
    activeTypeKeys.push('reel');
    activeTypes.push({
      type: 'reel',
      label: 'Reels',
      shortLabel: 'R',
      perMonth: reelsPerMonth,
      promised: promisedReels,
      done: reelsDone,
      remaining: reelsRemaining,
      percent: promisedReels > 0 ? Math.min(100, Math.round((reelsDone / promisedReels) * 100)) : 0,
    });
  }

  if (storiesPerMonth > 0) {
    activeTypeKeys.push('story');
    activeTypes.push({
      type: 'story',
      label: 'Stories',
      shortLabel: 'S',
      perMonth: storiesPerMonth,
      promised: promisedStories,
      done: storiesDone,
      remaining: storiesRemaining,
      percent: promisedStories > 0 ? Math.min(100, Math.round((storiesDone / promisedStories) * 100)) : 0,
    });
  }

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

    videosRemaining,
    postsRemaining,
    reelsRemaining,
    storiesRemaining,
    totalRemaining,

    percent,
    isBehind,
    hasPackage,

    activeTypes,
    activeTypeKeys,
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
  asOfDate: Date | string = new Date()
): ClientCombinedMetrics[] {
  return clients.map((client) => ({
    client,
    financials: computeClientFinancials(client, payments, expenses, asOfDate),
    deliverables: computeClientDeliverables(client, deliverables, asOfDate),
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
  asOfDate: Date | string = new Date()
): AgencyMetrics {
  const combined = computeAllClientsMetrics(clients, payments, expenses, deliverables, asOfDate);

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
