import {
  User,
  Client,
  Deliverable,
  Payment,
  Expense,
  Salary,
  Task,
  CalendarItem,
  Notification,
  ActivityLog,
  AgencySettings,
  BillingCycle,
  BillingCyclePackage,
  RecurringFixedExpense,
  Lead,
  CallLog,
} from '@/types';
import {
  SEED_USERS,
  SEED_CLIENTS,
  SEED_PAYMENTS,
  SEED_EXPENSES,
  SEED_SALARIES,
  SEED_TASKS,
  SEED_CALENDAR_ITEMS,
  SEED_NOTIFICATIONS,
  SEED_ACTIVITY_LOGS,
} from '@/mocks/seedData';
import { calculateCycleEndDate, calculateNextCycleStartDate } from '@/lib/cycleUtils';

const STORAGE_KEY_PREFIX = 'getup_agency_v4_';

function getOrInit<T>(key: string, initialData: T): T {
  try {
    const item = localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
    if (item) {
      return JSON.parse(item) as T;
    }
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, JSON.stringify(initialData));
  } catch {
    // ignore
  }
  return initialData;
}

function save<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export const DEFAULT_AGENCY_SETTINGS: AgencySettings = {
  agencyName: 'Getup Media Agency',
  logo: '/logo.svg',
  address: 'Indiranagar 100ft Road, Bangalore, Karnataka 560038',
  gstNumber: '29ABCDE1234F1Z5',
  currency: 'INR',
  defaultBillingDay: 1,
  financialYearStart: '04-01',
  browserNotificationsEnabled: true,
  defaultMeetingReminder: '10_min',
  overdueAlertsEnabled: true,
  sidebarCollapsedDefault: false,
  dateFormat: 'DD MMM YYYY',
  initialOpeningBalance: 0,
};

class MockStore {
  users: User[] = (() => {
    const raw = getOrInit('users', SEED_USERS);
    return raw.map((u) => {
      const seed = SEED_USERS.find((s) => s.id === u.id || s.email.toLowerCase() === u.email.toLowerCase());
      return {
        ...u,
        username: u.username || seed?.username || u.email.split('@')[0].toLowerCase(),
        passwordHash: u.passwordHash || seed?.passwordHash,
      };
    });
  })();
  clients: Client[] = getOrInit('clients', SEED_CLIENTS);
  billingCycles: BillingCycle[] = getOrInit('billingCycles', [] as BillingCycle[]);
  deliverables: Deliverable[] = getOrInit('deliverables', [] as Deliverable[]);
  payments: Payment[] = getOrInit('payments', SEED_PAYMENTS);
  expenses: Expense[] = getOrInit('expenses', SEED_EXPENSES);
  salaries: Salary[] = getOrInit('salaries', SEED_SALARIES);
  tasks: Task[] = getOrInit('tasks', SEED_TASKS);
  calendarItems: CalendarItem[] = getOrInit('calendarItems', SEED_CALENDAR_ITEMS);
  notifications: Notification[] = getOrInit('notifications', SEED_NOTIFICATIONS);
  activityLogs: ActivityLog[] = getOrInit('activityLogs', SEED_ACTIVITY_LOGS);
  leads: Lead[] = getOrInit('leads', [] as Lead[]);
  callLogs: CallLog[] = getOrInit('callLogs', [] as CallLog[]);
  recurringFixedExpenses: RecurringFixedExpense[] = getOrInit('recurringFixedExpenses', [] as RecurringFixedExpense[]);
  settings: AgencySettings = getOrInit('settings', DEFAULT_AGENCY_SETTINGS);
  currentUser: User = (() => {
    const raw = getOrInit('currentUser', SEED_USERS[0]);
    const seed = SEED_USERS.find((s) => s.id === raw.id || s.email.toLowerCase() === raw.email.toLowerCase());
    return {
      ...raw,
      username: raw.username || seed?.username || raw.email?.split('@')[0]?.toLowerCase() || 'velmurugan',
      passwordHash: raw.passwordHash || seed?.passwordHash,
    };
  })();

  constructor() {
    this.runMigrationIfNeeded();
  }

  runMigrationIfNeeded() {
    const today = '2026-10-20';
    let migratedSomething = false;

    // 1. If billingCycles is empty and we have clients, migrate each client
    if (this.billingCycles.length === 0 && this.clients.length > 0) {
      let totalCyclesCreated = 0;
      let totalDeliverablesLinked = 0;
      let totalPaymentsLinked = 0;

      for (const client of this.clients) {
        const clientDelivs = this.deliverables.filter((d) => d.clientId === client.id);
        const clientPayments = this.payments.filter((p) => p.clientId === client.id);
        const clientExpenses = this.expenses.filter((e) => e.clientId === client.id);

        const pkg: BillingCyclePackage = {};
        if (client.package?.videosPerMonth) pkg.videos = client.package.videosPerMonth;
        if (client.package?.postersPerMonth) pkg.posts = client.package.postersPerMonth;
        if (client.package?.reelsPerMonth) pkg.reels = client.package.reelsPerMonth;
        if (client.package?.storiesPerMonth) pkg.stories = client.package.storiesPerMonth;

        const fee = client.monthlyFee || 0;
        const startDate = client.onboardedOn || '2026-10-01';

        // Gather all relevant dates
        const dates = [
          ...clientDelivs.map((d) => d.date),
          ...clientPayments.map((p) => p.date),
          ...clientExpenses.map((e) => e.date),
          startDate,
          today,
        ].filter(Boolean);

        dates.sort();
        const maxDate = dates[dates.length - 1];

        // Generate cycles sequentially
        let currentStart = startDate;
        let cycleNum = 1;
        let prevCycleId: string | undefined = undefined;
        const generatedCycles: BillingCycle[] = [];

        while (true) {
          const currentEnd = calculateCycleEndDate(currentStart);
          const cycleId = `cycle-${client.id}-${cycleNum}`;

          const cycle: BillingCycle = {
            id: cycleId,
            clientId: client.id,
            cycleNumber: cycleNum,
            startDate: currentStart,
            endDate: currentEnd,
            package: { ...pkg },
            feeAmount: fee,
            renewedFromCycleId: prevCycleId,
            renewalDecision: 'pending',
            createdAt: client.createdAt || new Date().toISOString(),
            updatedAt: client.updatedAt || new Date().toISOString(),
            createdBy: client.createdBy || 'system',
          };

          // If there is another cycle following this one
          if (maxDate > currentEnd) {
            cycle.renewalDecision = 'renewed';
          }

          generatedCycles.push(cycle);
          prevCycleId = cycleId;

          // If current cycle ends after or on maxDate, stop generating
          if (currentEnd >= maxDate) {
            break;
          }

          currentStart = calculateNextCycleStartDate(currentEnd);
          cycleNum++;
        }

        // Add generated cycles
        this.billingCycles.push(...generatedCycles);
        totalCyclesCreated += generatedCycles.length;

        // Update client currentCycleId
        const activeOrLatest = generatedCycles[generatedCycles.length - 1];
        client.currentCycleId = activeOrLatest.id;

        // Assign deliverables to matching cycle
        for (const d of clientDelivs) {
          const matching = generatedCycles.find(
            (c) => d.date >= c.startDate && d.date <= c.endDate
          );
          d.cycleId = matching ? matching.id : activeOrLatest.id;
          totalDeliverablesLinked++;
        }

        // Assign payments to matching cycle
        for (const p of clientPayments) {
          const matching = generatedCycles.find(
            (c) =>
              (p.date >= c.startDate && p.date <= c.endDate) ||
              p.month === c.startDate.slice(0, 7)
          );
          p.cycleId = matching ? matching.id : activeOrLatest.id;
          totalPaymentsLinked++;
        }

        // Assign expenses to matching cycle
        for (const e of clientExpenses) {
          const matching = generatedCycles.find(
            (c) => e.date >= c.startDate && e.date <= c.endDate
          );
          e.cycleId = matching ? matching.id : activeOrLatest.id;
        }

        // For each cycle, if fee > 0 and no payment exists, create a pending payment record
        for (const cycle of generatedCycles) {
          const hasPayment = clientPayments.some(
            (p) => p.cycleId === cycle.id || p.month === cycle.startDate.slice(0, 7)
          );
          if (!hasPayment && cycle.feeAmount > 0) {
            const pendingPayment: Payment = {
              id: `pay-${cycle.id}-pending`,
              clientId: client.id,
              cycleId: cycle.id,
              month: cycle.startDate.slice(0, 7),
              amount: cycle.feeAmount,
              date: cycle.startDate,
              status: 'pending',
              mode: 'bank_transfer',
              notes: `Billing Cycle ${cycle.cycleNumber} Retainer`,
              createdAt: cycle.createdAt,
              updatedAt: cycle.updatedAt,
              createdBy: 'system',
            };
            this.payments.push(pendingPayment);
          }
        }
      }

      // Store one-time migration summary
      const summary = {
        clientsCount: this.clients.length,
        cyclesCount: totalCyclesCreated,
        deliverablesLinked: totalDeliverablesLinked,
        paymentsLinked: totalPaymentsLinked,
        migratedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem('getup_cycles_migrated_summary', JSON.stringify(summary));
      } catch {
        // ignore
      }
      migratedSomething = true;
    } else if (this.billingCycles.length > 0) {
      // Ensure existing deliverables and payments without cycleId get backfilled
      for (const d of this.deliverables) {
        if (!d.cycleId && d.clientId) {
          const clientCycles = this.billingCycles.filter((c) => c.clientId === d.clientId);
          const match = clientCycles.find((c) => d.date >= c.startDate && d.date <= c.endDate);
          d.cycleId = match ? match.id : clientCycles[clientCycles.length - 1]?.id;
          migratedSomething = true;
        }
      }
      for (const p of this.payments) {
        if (!p.cycleId && p.clientId) {
          const clientCycles = this.billingCycles.filter((c) => c.clientId === p.clientId);
          const match = clientCycles.find(
            (c) =>
              (p.date >= c.startDate && p.date <= c.endDate) ||
              p.month === c.startDate.slice(0, 7)
          );
          p.cycleId = match ? match.id : clientCycles[clientCycles.length - 1]?.id;
          migratedSomething = true;
        }
      }
      for (const e of this.expenses) {
        if (!e.cycleId && e.clientId) {
          const clientCycles = this.billingCycles.filter((c) => c.clientId === e.clientId);
          const match = clientCycles.find((c) => e.date >= c.startDate && e.date <= c.endDate);
          e.cycleId = match ? match.id : clientCycles[clientCycles.length - 1]?.id;
          migratedSomething = true;
        }
      }
    }

    // 2. Migrate existing expenses to populate expenseNature
    let expenseMigrationCount = 0;
    for (const e of this.expenses) {
      if (!e.expenseNature) {
        if (e.type === 'client' || !!e.clientId) {
          e.expenseNature = 'variable';
        } else if (['salary', 'rent', 'software'].includes(e.category)) {
          e.expenseNature = 'fixed';
        } else {
          e.expenseNature = 'variable';
        }
        expenseMigrationCount++;
        migratedSomething = true;
      }
    }

    if (expenseMigrationCount > 0) {
      try {
        localStorage.setItem(
          'getup_expenses_migrated_summary',
          JSON.stringify({
            count: expenseMigrationCount,
            migratedAt: new Date().toISOString(),
          })
        );
      } catch {
        // ignore
      }
    }

    if (migratedSomething) {
      this.saveAll();
    }
  }

  saveAll() {
    save('users', this.users);
    save('clients', this.clients);
    save('billingCycles', this.billingCycles);
    save('deliverables', this.deliverables);
    save('payments', this.payments);
    save('expenses', this.expenses);
    save('salaries', this.salaries);
    save('tasks', this.tasks);
    save('calendarItems', this.calendarItems);
    save('notifications', this.notifications);
    save('activityLogs', this.activityLogs);
    save('leads', this.leads);
    save('callLogs', this.callLogs);
    save('recurringFixedExpenses', this.recurringFixedExpenses);
    save('settings', this.settings);
    save('currentUser', this.currentUser);
  }

  resetAllData() {
    this.clients = [];
    this.billingCycles = [];
    this.deliverables = [];
    this.payments = [];
    this.expenses = [];
    this.salaries = [];
    this.tasks = [];
    this.calendarItems = [];
    this.notifications = [];
    this.activityLogs = [];
    this.leads = [];
    this.callLogs = [];
    this.recurringFixedExpenses = [];
    this.saveAll();
  }

  reset() {
    this.users = [...SEED_USERS];
    this.clients = [...SEED_CLIENTS];
    this.billingCycles = [];
    this.deliverables = [];
    this.payments = [...SEED_PAYMENTS];
    this.expenses = [...SEED_EXPENSES];
    this.salaries = [...SEED_SALARIES];
    this.tasks = [...SEED_TASKS];
    this.calendarItems = [...SEED_CALENDAR_ITEMS];
    this.notifications = [...SEED_NOTIFICATIONS];
    this.activityLogs = [...SEED_ACTIVITY_LOGS];
    this.leads = [];
    this.callLogs = [];
    this.recurringFixedExpenses = [];
    this.settings = { ...DEFAULT_AGENCY_SETTINGS };
    this.currentUser = { ...SEED_USERS[0] };
    this.saveAll();
  }
}

export const mockStore = new MockStore();

