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
  deliverables: Deliverable[] = getOrInit('deliverables', [] as Deliverable[]);
  payments: Payment[] = getOrInit('payments', SEED_PAYMENTS);
  expenses: Expense[] = getOrInit('expenses', SEED_EXPENSES);
  salaries: Salary[] = getOrInit('salaries', SEED_SALARIES);
  tasks: Task[] = getOrInit('tasks', SEED_TASKS);
  calendarItems: CalendarItem[] = getOrInit('calendarItems', SEED_CALENDAR_ITEMS);
  notifications: Notification[] = getOrInit('notifications', SEED_NOTIFICATIONS);
  activityLogs: ActivityLog[] = getOrInit('activityLogs', SEED_ACTIVITY_LOGS);
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

  saveAll() {
    save('users', this.users);
    save('clients', this.clients);
    save('deliverables', this.deliverables);
    save('payments', this.payments);
    save('expenses', this.expenses);
    save('salaries', this.salaries);
    save('tasks', this.tasks);
    save('calendarItems', this.calendarItems);
    save('notifications', this.notifications);
    save('activityLogs', this.activityLogs);
    save('settings', this.settings);
    save('currentUser', this.currentUser);
  }

  resetAllData() {
    this.clients = [];
    this.deliverables = [];
    this.payments = [];
    this.expenses = [];
    this.salaries = [];
    this.tasks = [];
    this.calendarItems = [];
    this.notifications = [];
    this.activityLogs = [];
    this.saveAll();
  }

  reset() {
    this.users = [...SEED_USERS];
    this.clients = [...SEED_CLIENTS];
    this.deliverables = [];
    this.payments = [...SEED_PAYMENTS];
    this.expenses = [...SEED_EXPENSES];
    this.salaries = [...SEED_SALARIES];
    this.tasks = [...SEED_TASKS];
    this.calendarItems = [...SEED_CALENDAR_ITEMS];
    this.notifications = [...SEED_NOTIFICATIONS];
    this.activityLogs = [...SEED_ACTIVITY_LOGS];
    this.settings = { ...DEFAULT_AGENCY_SETTINGS };
    this.currentUser = { ...SEED_USERS[0] };
    this.saveAll();
  }
}

export const mockStore = new MockStore();
