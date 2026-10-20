import {
  clientService,
  financeService,
  taskService,
  deliverableService,
  billingCycleService,
} from '@/services';
import { Client, Payment, Expense, Task, Deliverable, Role, BillingCycle } from '@/types';
import { computeAgencyMetrics, computeAllClientsMetrics } from '@/lib/selectors';
import { isCycleRenewalDue, getCycleDaysRemaining, deriveCycleStatus } from '@/lib/cycleUtils';

export interface ClientDeliveryUsage {
  client: Client;
  hasPackage: boolean;
  activeTypes: import('@/lib/selectors').ActiveTypeMetric[];
  videosDelivered: number;
  videosTotal: number;
  videosRemaining: number;
  postersDelivered: number;
  postersTotal: number;
  postersRemaining: number;
  reelsDelivered: number;
  reelsTotal: number;
  reelsRemaining: number;
  storiesDelivered: number;
  storiesTotal: number;
  storiesRemaining: number;
  totalDelivered: number;
  totalPromised: number;
  totalRemaining: number;
  percent: number;
  isOnTrack: boolean;
  isBehind: boolean;
}

export interface PendingClientItem {
  client: Client;
  pending: number;
  expected: number;
  received: number;
  overdue: number;
  isOverdue: boolean;
}

export interface RenewalDueItem {
  client: Client;
  cycle: BillingCycle;
  daysRemaining: number;
  isExpired: boolean;
  statusLabel: string;
}

export interface DashboardSummary {
  month: string;
  // Client KPIs
  totalClientsCount: number;
  activeClientsCount: number;
  onboardedThisMonthCount: number;

  // Deliverables
  totalDelivered: number;
  deliveredThisMonth: number;
  totalDeliverablesPromised: number;
  deliverablesPercent: number;
  deliveredByType: Record<string, number>;

  // Finance (synchronized with central selectors)
  totalMonthlyRetainer: number;
  moneyReceived: number;
  moneyPending: number;
  totalExpenses: number;
  clientExpenses: number;
  agencyExpenses: number;
  profit: number;
  overduePayments: Payment[];

  // Pending collection and recent expenses widgets
  pendingClients: PendingClientItem[];
  topExpenses: Expense[];

  // Renewal alerts
  renewalDueClients: RenewalDueItem[];

  // Per-client usage (for package usage meter)
  clientUsage: ClientDeliveryUsage[];

  // Worker specific items
  workerTasks: Task[];
  workerDeliverables: Deliverable[];
}

export const dashboardService = {
  async getDashboardSummary(month: string, _role?: Role, userId?: string): Promise<DashboardSummary> {
    const [clients, allPayments, allExpenses, tasks, allDeliverables, allCycles] = await Promise.all([
      clientService.getClients(),
      financeService.getPayments(),
      financeService.getExpenses(),
      taskService.getTasks(),
      deliverableService.getDeliverables(),
      billingCycleService.getCycles(),
    ]);

    // Use single source of truth selectors
    const metrics = computeAgencyMetrics(clients, allPayments, allExpenses, allDeliverables, month, allCycles);
    const clientMetrics = computeAllClientsMetrics(clients, allPayments, allExpenses, allDeliverables, month, allCycles);

    const activeClients = clients.filter((c) => c.status === 'active');
    const onboardedThisMonth = clients.filter((c) => c.onboardedOn?.startsWith(month));

    // Deliverable totals
    const deliveredAll = allDeliverables.filter((d) => d.status === 'delivered');
    const deliveredThisMonth = allDeliverables.filter(
      (d) => d.status === 'delivered' && (d.month === month || d.date.startsWith(month))
    );

    const deliveredByType: Record<string, number> = {
      video: deliveredAll.filter((d) => d.type === 'video').length,
      post: deliveredAll.filter((d) => d.type === 'post').length,
      reel: deliveredAll.filter((d) => d.type === 'reel').length,
      story: deliveredAll.filter((d) => d.type === 'story').length,
    };

    // Client package usage mapped from selector breakdowns - sorted by most behind
    const clientUsage: ClientDeliveryUsage[] = clientMetrics
      .filter((cm) => cm.client.status === 'active')
      .map((cm) => {
        const d = cm.deliverables;

        return {
          client: cm.client,
          hasPackage: d.hasPackage,
          activeTypes: d.activeTypes,
          videosDelivered: d.videosDone,
          videosTotal: d.videosDone + d.videosRemaining,
          videosRemaining: d.videosRemaining,
          postersDelivered: d.postsDone,
          postersTotal: d.postsDone + d.postsRemaining,
          postersRemaining: d.postsRemaining,
          reelsDelivered: d.reelsDone,
          reelsTotal: d.reelsDone + d.reelsRemaining,
          reelsRemaining: d.reelsRemaining,
          storiesDelivered: d.storiesDone,
          storiesTotal: d.storiesDone + d.storiesRemaining,
          storiesRemaining: d.storiesRemaining,
          totalDelivered: d.totalDone,
          totalPromised: d.totalPromised,
          totalRemaining: d.totalRemaining,
          percent: d.percent,
          isOnTrack: !d.isBehind,
          isBehind: d.isBehind,
        };
      })
      .sort((a, b) => {
        // Clients with package first, then behind clients first, then lowest percent
        if (a.hasPackage !== b.hasPackage) return a.hasPackage ? -1 : 1;
        if (a.isBehind !== b.isBehind) return a.isBehind ? -1 : 1;
        return a.percent - b.percent;
      });

    // Clients with pending collections
    const pendingClients: PendingClientItem[] = clientMetrics
      .filter((cm) => cm.financials.pending > 0)
      .map((cm) => ({
        client: cm.client,
        pending: cm.financials.pending,
        expected: cm.financials.expected,
        received: cm.financials.received,
        overdue: cm.financials.overdue,
        isOverdue: cm.financials.overdue > 0,
      }))
      .sort((a, b) => b.pending - a.pending);

    // Renewal Due calculation (<= 3 days or renewal_pending)
    const todayStr = new Date().toISOString().split('T')[0];
    const renewalDueClients: RenewalDueItem[] = [];
    for (const client of activeClients) {
      const clientCycles = allCycles.filter((c) => c.clientId === client.id);
      if (clientCycles.length === 0) continue;

      const currentCycle =
        (client.currentCycleId ? clientCycles.find((c) => c.id === client.currentCycleId) : null) ||
        [...clientCycles].sort((a, b) => b.cycleNumber - a.cycleNumber)[0];

      if (currentCycle && isCycleRenewalDue(currentCycle, todayStr)) {
        const derived = deriveCycleStatus(currentCycle, todayStr);
        const daysLeft = getCycleDaysRemaining(currentCycle, todayStr);
        renewalDueClients.push({
          client,
          cycle: currentCycle,
          daysRemaining: daysLeft,
          isExpired: derived === 'renewal_pending',
          statusLabel:
            derived === 'renewal_pending'
              ? 'Ended – renewal pending'
              : daysLeft === 0
              ? 'Ends today'
              : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
        });
      }
    }

    // Recent/top expenses this month
    const currentMonthExpenses = allExpenses
      .filter((e) => e.date.startsWith(month))
      .sort((a, b) => b.amount - a.amount);
    const topExpenses = (currentMonthExpenses.length > 0 ? currentMonthExpenses : allExpenses).slice(0, 5);

    // Overdue payments
    const overduePayments = allPayments.filter((p) => p.status === 'overdue');

    // Worker-specific
    const workerTasks = userId ? tasks.filter((t) => t.assigneeId === userId) : [];
    const workerDeliverables = userId
      ? allDeliverables.filter((d) => d.status !== 'delivered')
      : [];

    return {
      month,
      totalClientsCount: clients.length,
      activeClientsCount: activeClients.length,
      onboardedThisMonthCount: onboardedThisMonth.length,
      totalDelivered: deliveredAll.length,
      deliveredThisMonth: deliveredThisMonth.length,
      totalDeliverablesPromised: metrics.totalDeliverablesPromised,
      deliverablesPercent: metrics.totalDeliverablesPercent,
      deliveredByType,
      totalMonthlyRetainer: metrics.totalMonthlyRetainer,
      moneyReceived: metrics.totalReceived,
      moneyPending: metrics.totalPending,
      totalExpenses: metrics.totalExpenses,
      clientExpenses: metrics.clientExpenses,
      agencyExpenses: metrics.agencyExpenses,
      profit: metrics.netProfit,
      overduePayments,
      pendingClients,
      topExpenses,
      renewalDueClients,
      clientUsage,
      workerTasks,
      workerDeliverables,
    };
  },
};
