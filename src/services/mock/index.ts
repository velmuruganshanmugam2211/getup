import {
  IAuthService,
  IClientService,
  IBillingCycleService,
  IDeliverableService,
  IFinanceService,
  ITaskService,
  ICalendarService,
  ITeamService,
  INotificationService,
  IActivityLogService,
  ISettingsService,
  MonthlyFinancialSummary,
} from '../types';
import { mockStore } from './mockStore';
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
  DeliverableType,
} from '@/types';
import bcrypt from 'bcryptjs';
import { computeAgencyMetrics } from '@/lib/selectors';
import { calculateCycleEndDate, calculateNextCycleStartDate } from '@/lib/cycleUtils';

const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockAuthService: IAuthService = {
  async login(identifier: string, password?: string): Promise<User> {
    await delay(60);
    const idClean = identifier.trim().toLowerCase();
    const user = mockStore.users.find(
      (u) =>
        (u.email && u.email.toLowerCase() === idClean) ||
        (u.username && u.username.toLowerCase() === idClean)
    );

    if (!user) {
      throw new Error('Invalid username/email or password.');
    }

    if (!user.active || user.isFormerMember) {
      throw new Error('This account has been deactivated. Please contact an administrator.');
    }

    if (user.passwordHash && password) {
      const isMatch = bcrypt.compareSync(password, user.passwordHash);
      if (!isMatch) {
        throw new Error('Invalid username/email or password.');
      }
    } else if (user.passwordHash && !password) {
      throw new Error('Password is required.');
    }

    user.lastLogin = new Date().toISOString();
    mockStore.currentUser = user;
    mockStore.saveAll();
    return user;
  },

  async logout(): Promise<void> {
    await delay(20);
  },

  async getCurrentUser(): Promise<User | null> {
    await delay(10);
    return mockStore.currentUser;
  },

  async switchUser(userId: string): Promise<User> {
    await delay(20);
    const user = mockStore.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }
    mockStore.currentUser = user;
    mockStore.saveAll();
    return user;
  },
};

export const mockClientService: IClientService = {
  async getClients(filters): Promise<Client[]> {
    await delay();
    let result = [...mockStore.clients];

    // Role-based data layer security:
    // Workers must never see financial data or unauthorized clients.
    if (mockStore.currentUser.role === 'worker') {
      const workerTasks = mockStore.tasks.filter((t) => t.assigneeId === mockStore.currentUser.id);
      const workerClientIds = new Set(workerTasks.map((t) => t.clientId).filter(Boolean));
      result = result
        .filter((c) => workerClientIds.has(c.id))
        .map((c) => ({
          ...c,
          monthlyFee: 0,
        }));
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.business.toLowerCase().includes(q) ||
          (c.vertical || '').toLowerCase().includes(q) ||
          c.contactPerson.toLowerCase().includes(q)
      );
    }
    if (filters?.status) {
      result = result.filter((c) => c.status === filters.status);
    }
    return result;
  },

  async getClientById(id: string): Promise<Client | null> {
    await delay();
    const client = mockStore.clients.find((c) => c.id === id);
    if (!client) return null;
    if (mockStore.currentUser.role === 'worker') {
      return {
        ...client,
        monthlyFee: 0,
      };
    }
    return client;
  },

  async createClient(data): Promise<Client> {
    await delay();
    const newClientId = `client-${Date.now()}`;
    const newClient: Client = {
      ...data,
      id: newClientId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: mockStore.currentUser.id,
    };

    // Auto-create Billing Cycle 1 from onboarding date
    const startDate = data.onboardedOn || '2026-10-20';
    const endDate = calculateCycleEndDate(startDate);

    const pkgSnapshot: BillingCyclePackage = {};
    if (data.package?.videosPerMonth) pkgSnapshot.videos = data.package.videosPerMonth;
    if (data.package?.postersPerMonth) pkgSnapshot.posts = data.package.postersPerMonth;
    if (data.package?.reelsPerMonth) pkgSnapshot.reels = data.package.reelsPerMonth;
    if (data.package?.storiesPerMonth) pkgSnapshot.stories = data.package.storiesPerMonth;

    const cycle1: BillingCycle = {
      id: `cycle-${newClientId}-1`,
      clientId: newClientId,
      cycleNumber: 1,
      startDate,
      endDate,
      package: pkgSnapshot,
      feeAmount: data.monthlyFee || 0,
      renewalDecision: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: mockStore.currentUser.id,
    };
    newClient.currentCycleId = cycle1.id;
    mockStore.billingCycles.unshift(cycle1);

    // Auto-create pending payment for cycle 1 so Pending to Collect stays correct!
    if ((data.monthlyFee || 0) > 0) {
      const pendingPayment: Payment = {
        id: `pay-${cycle1.id}-pending`,
        clientId: newClientId,
        cycleId: cycle1.id,
        month: startDate.slice(0, 7),
        amount: data.monthlyFee,
        date: startDate,
        status: 'pending',
        mode: 'bank_transfer',
        notes: `Billing Cycle 1 Retainer`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: mockStore.currentUser.id,
      };
      mockStore.payments.unshift(pendingPayment);
    }

    mockStore.clients.unshift(newClient);
    mockStore.saveAll();
    return newClient;
  },

  async updateClient(id: string, data): Promise<Client> {
    await delay();
    const index = mockStore.clients.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Client not found');
    const updated = {
      ...mockStore.clients[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    mockStore.clients[index] = updated;
    mockStore.saveAll();
    return updated;
  },

  async deleteClient(id: string): Promise<void> {
    await delay();
    // Cascade delete linked entities cleanly
    mockStore.clients = mockStore.clients.filter((c) => c.id !== id);
    mockStore.billingCycles = mockStore.billingCycles.filter((c) => c.clientId !== id);
    mockStore.deliverables = mockStore.deliverables.filter((d) => d.clientId !== id);
    mockStore.payments = mockStore.payments.filter((p) => p.clientId !== id);
    mockStore.expenses = mockStore.expenses.filter((e) => e.clientId !== id);
    mockStore.tasks = mockStore.tasks.filter((t) => t.clientId !== id);
    mockStore.calendarItems = mockStore.calendarItems.filter((i) => i.clientId !== id);
    mockStore.saveAll();
  },
};

export const mockDeliverableService: IDeliverableService = {
  async getDeliverables(filters): Promise<Deliverable[]> {
    await delay();
    let result = [...mockStore.deliverables];
    if (filters?.clientId) {
      result = result.filter((d) => d.clientId === filters.clientId);
    }
    if (filters?.month) {
      result = result.filter((d) => d.month === filters.month);
    }
    if (filters?.type) {
      result = result.filter((d) => d.type === filters.type);
    }
    if (filters?.status) {
      result = result.filter((d) => d.status === filters.status);
    }
    return result;
  },

  async createDeliverable(data): Promise<Deliverable> {
    await delay();
    let assignedCycleId = data.cycleId;
    if (!assignedCycleId && data.clientId) {
      const clientCycles = mockStore.billingCycles
        .filter((c) => c.clientId === data.clientId)
        .sort((a, b) => b.cycleNumber - a.cycleNumber);

      const today = '2026-10-20';
      if (data.date) {
        const dateMatch = clientCycles.find(
          (c) => data.date >= c.startDate && data.date <= c.endDate
        );
        assignedCycleId = dateMatch ? dateMatch.id : clientCycles[0]?.id;
      } else {
        const activeMatch = clientCycles.find(
          (c) => today >= c.startDate && today <= c.endDate
        );
        assignedCycleId = activeMatch ? activeMatch.id : clientCycles[0]?.id;
      }
    }

    const newItem: Deliverable = {
      ...data,
      cycleId: assignedCycleId,
      id: `dlv-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: mockStore.currentUser.id,
    };
    mockStore.deliverables.unshift(newItem);
    mockStore.saveAll();
    return newItem;
  },

  async updateDeliverable(id: string, data): Promise<Deliverable> {
    await delay();
    const index = mockStore.deliverables.findIndex((d) => d.id === id);
    if (index === -1) throw new Error('Deliverable not found');
    const updated = {
      ...mockStore.deliverables[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    mockStore.deliverables[index] = updated;

    // If marked delivered, also mark any linked tasks as done
    if (data.status === 'delivered') {
      mockStore.tasks = mockStore.tasks.map((t) => {
        if (t.deliverableId === id && t.status !== 'done') {
          return { ...t, status: 'done', updatedAt: new Date().toISOString() };
        }
        return t;
      });
    }

    mockStore.saveAll();
    return updated;
  },

  async deleteDeliverable(id: string): Promise<void> {
    await delay();
    mockStore.deliverables = mockStore.deliverables.filter((d) => d.id !== id);
    mockStore.saveAll();
  },
};

export const mockFinanceService: IFinanceService = {
  async getPayments(filters): Promise<Payment[]> {
    await delay();
    if (mockStore.currentUser.role === 'worker') return [];
    let result = [...mockStore.payments];
    if (filters?.clientId) {
      result = result.filter((p) => p.clientId === filters.clientId);
    }
    if (filters?.month) {
      result = result.filter((p) => p.month === filters.month);
    }
    if (filters?.status) {
      result = result.filter((p) => p.status === filters.status);
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  },

  async createPayment(data): Promise<Payment> {
    await delay();
    let assignedCycleId = data.cycleId;
    if (!assignedCycleId && data.clientId) {
      const clientCycles = mockStore.billingCycles
        .filter((c) => c.clientId === data.clientId)
        .sort((a, b) => b.cycleNumber - a.cycleNumber);

      const match = clientCycles.find(
        (c) =>
          (data.date && data.date >= c.startDate && data.date <= c.endDate) ||
          (data.month && data.month === c.startDate.slice(0, 7))
      );
      assignedCycleId = match ? match.id : clientCycles[0]?.id;
    }

    const newPayment: Payment = {
      ...data,
      cycleId: assignedCycleId,
      id: `pay-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: mockStore.currentUser.id,
    };
    mockStore.payments.unshift(newPayment);
    mockStore.saveAll();
    return newPayment;
  },

  async updatePayment(id: string, data): Promise<Payment> {
    await delay();
    const index = mockStore.payments.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Payment not found');
    const updated = {
      ...mockStore.payments[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    mockStore.payments[index] = updated;
    mockStore.saveAll();
    return updated;
  },

  async deletePayment(id: string): Promise<void> {
    await delay();
    mockStore.payments = mockStore.payments.filter((p) => p.id !== id);
    mockStore.saveAll();
  },

  async getExpenses(filters): Promise<Expense[]> {
    await delay();
    if (mockStore.currentUser.role === 'worker') return [];
    let result = [...mockStore.expenses];
    if (filters?.month) {
      result = result.filter((e) => e.date.startsWith(filters.month!));
    }
    if (filters?.category) {
      result = result.filter((e) => e.category === filters.category);
    }
    if (filters?.clientId) {
      result = result.filter((e) => e.clientId === filters.clientId);
    }
    if (filters?.type) {
      result = result.filter((e) => e.type === filters.type);
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  },

  async createExpense(data): Promise<Expense> {
    await delay();
    let assignedCycleId = data.cycleId;
    if (!assignedCycleId && data.clientId) {
      const clientCycles = mockStore.billingCycles
        .filter((c) => c.clientId === data.clientId)
        .sort((a, b) => b.cycleNumber - a.cycleNumber);

      const match = clientCycles.find(
        (c) => data.date && data.date >= c.startDate && data.date <= c.endDate
      );
      assignedCycleId = match ? match.id : clientCycles[0]?.id;
    }

    const newExpense: Expense = {
      ...data,
      cycleId: assignedCycleId,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: mockStore.currentUser.id,
    };
    mockStore.expenses.unshift(newExpense);
    mockStore.saveAll();
    return newExpense;
  },

  async createExpensesBatch(items): Promise<Expense[]> {
    await delay();
    const now = new Date().toISOString();
    const newExpenses: Expense[] = items.map((data, index) => ({
      ...data,
      id: `exp-${Date.now()}-${index}`,
      createdAt: now,
      updatedAt: now,
      createdBy: mockStore.currentUser.id,
    }));
    mockStore.expenses.unshift(...newExpenses);
    mockStore.saveAll();
    return newExpenses;
  },

  async updateExpense(id: string, data): Promise<Expense> {
    await delay();
    const index = mockStore.expenses.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Expense not found');
    const updated = {
      ...mockStore.expenses[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    mockStore.expenses[index] = updated;
    mockStore.saveAll();
    return updated;
  },

  async deleteExpense(id: string): Promise<void> {
    await delay();
    mockStore.expenses = mockStore.expenses.filter((e) => e.id !== id);
    mockStore.saveAll();
  },

  async getSalaries(month?: string): Promise<Salary[]> {
    await delay();
    if (mockStore.currentUser.role === 'worker') return [];
    let result = [...mockStore.salaries];
    if (month) {
      result = result.filter((s) => s.month === month);
    }
    return result;
  },

  async getMonthlySummary(month: string): Promise<MonthlyFinancialSummary> {
    await delay();
    if (mockStore.currentUser.role === 'worker') {
      return {
        month,
        agreedAmount: 0,
        receivedAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        totalExpenses: 0,
        profit: 0,
        expensesByCategory: {},
      };
    }

    const metrics = computeAgencyMetrics(
      mockStore.clients,
      mockStore.payments,
      mockStore.expenses,
      mockStore.deliverables,
      month
    );

    const expensesByCategory: Record<string, number> = {};
    mockStore.expenses
      .filter((e) => e.date.startsWith(month))
      .forEach((e) => {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
      });

    return {
      month,
      agreedAmount: metrics.totalExpected,
      receivedAmount: metrics.totalReceived,
      pendingAmount: metrics.totalPending,
      overdueAmount: metrics.totalOverdue,
      totalExpenses: metrics.totalExpenses,
      profit: metrics.netProfit,
      expensesByCategory,
    };
  },
};

export const mockTaskService: ITaskService = {
  async getTasks(filters): Promise<Task[]> {
    await delay();
    let result = [...mockStore.tasks];

    // Role-based data layer security:
    if (mockStore.currentUser.role === 'worker') {
      result = result.filter((t) => t.assigneeId === mockStore.currentUser.id);
    } else if (filters?.assigneeId) {
      result = result.filter((t) => t.assigneeId === filters.assigneeId);
    }

    if (filters?.status) {
      result = result.filter((t) => t.status === filters.status);
    }
    if (filters?.clientId) {
      result = result.filter((t) => t.clientId === filters.clientId);
    }
    return result;
  },

  async createTask(data): Promise<Task> {
    await delay();
    const newTask: Task = {
      ...data,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: mockStore.currentUser.id,
    };
    mockStore.tasks.unshift(newTask);
    mockStore.saveAll();
    return newTask;
  },

  async updateTask(id: string, data): Promise<Task> {
    await delay();
    const index = mockStore.tasks.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Task not found');
    const updated = {
      ...mockStore.tasks[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    mockStore.tasks[index] = updated;

    // If marked done and linked to deliverable, also mark deliverable as delivered
    if (data.status === 'done' && updated.deliverableId) {
      const delivIndex = mockStore.deliverables.findIndex((d) => d.id === updated.deliverableId);
      if (delivIndex !== -1 && mockStore.deliverables[delivIndex].status !== 'delivered') {
        mockStore.deliverables[delivIndex] = {
          ...mockStore.deliverables[delivIndex],
          status: 'delivered',
          updatedAt: new Date().toISOString(),
        };
      }
    }

    mockStore.saveAll();
    return updated;
  },

  async deleteTask(id: string): Promise<void> {
    await delay();
    mockStore.tasks = mockStore.tasks.filter((t) => t.id !== id);
    mockStore.saveAll();
  },

  async logTime(taskId: string, minutes: number): Promise<Task> {
    await delay();
    const task = mockStore.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');
    task.timeSpent = (task.timeSpent || 0) + minutes;
    task.updatedAt = new Date().toISOString();
    mockStore.saveAll();
    return task;
  },
};

export const mockCalendarService: ICalendarService = {
  async getItems(filters): Promise<CalendarItem[]> {
    await delay();
    if (mockStore.currentUser.role === 'worker') return [];
    let result = [...mockStore.calendarItems];
    if (filters?.month) {
      result = result.filter((i) => i.date.startsWith(filters.month!));
    }
    if (filters?.date) {
      result = result.filter((i) => i.date === filters.date);
    }
    if (filters?.clientId) {
      result = result.filter((i) => i.clientId === filters.clientId);
    }
    if (filters?.type) {
      result = result.filter((i) => i.type === filters.type);
    }
    return result.sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
  },

  async getItemById(id: string): Promise<CalendarItem | null> {
    await delay();
    return mockStore.calendarItems.find((i) => i.id === id) || null;
  },

  async createItem(data): Promise<CalendarItem> {
    await delay();
    const newItem: CalendarItem = {
      ...data,
      id: `cal-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: mockStore.currentUser.id,
    };
    mockStore.calendarItems.unshift(newItem);
    mockStore.saveAll();
    return newItem;
  },

  async updateItem(id: string, data): Promise<CalendarItem> {
    await delay();
    const index = mockStore.calendarItems.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Calendar item not found');
    const updated = {
      ...mockStore.calendarItems[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    mockStore.calendarItems[index] = updated;
    mockStore.saveAll();
    return updated;
  },

  async deleteItem(id: string): Promise<void> {
    await delay();
    mockStore.calendarItems = mockStore.calendarItems.filter((i) => i.id !== id);
    mockStore.saveAll();
  },
};

export const mockTeamService: ITeamService = {
  async getUsers(): Promise<User[]> {
    await delay();
    return [...mockStore.users];
  },

  async getUserById(id: string): Promise<User | null> {
    await delay();
    return mockStore.users.find((u) => u.id === id) || null;
  },

  async checkUsernameUnique(username: string, excludeUserId?: string): Promise<boolean> {
    await delay(20);
    const clean = username.trim().toLowerCase();
    const exists = mockStore.users.some(
      (u) => u.username?.toLowerCase() === clean && u.id !== excludeUserId
    );
    return !exists;
  },

  async createUser(data): Promise<User> {
    await delay();
    const cleanUsername = data.username?.trim().toLowerCase() || data.email.split('@')[0].toLowerCase();
    const exists = mockStore.users.some((u) => u.username?.toLowerCase() === cleanUsername);
    if (exists) {
      throw new Error(`Username "@${cleanUsername}" is already taken.`);
    }

    const passwordHash = data.password
      ? bcrypt.hashSync(data.password, 10)
      : data.passwordHash || bcrypt.hashSync('password123', 10);

    const { password, ...userData } = data;

    const newUser: User = {
      ...userData,
      username: cleanUsername,
      passwordHash,
      id: `user-${Date.now()}`,
      active: data.active !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: mockStore.currentUser?.id || 'system',
    };
    mockStore.users.push(newUser);
    mockStore.saveAll();
    return newUser;
  },

  async updateUser(id: string, data): Promise<User> {
    await delay();
    const index = mockStore.users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');

    const currentUser = mockStore.users[index];

    if (data.username && data.username.toLowerCase() !== currentUser.username?.toLowerCase()) {
      const cleanUsername = data.username.trim().toLowerCase();
      const exists = mockStore.users.some(
        (u) => u.id !== id && u.username?.toLowerCase() === cleanUsername
      );
      if (exists) {
        throw new Error(`Username "@${cleanUsername}" is already taken.`);
      }
    }

    const { password, ...userData } = data;
    let passwordHash = currentUser.passwordHash;
    if (password && password.trim()) {
      passwordHash = bcrypt.hashSync(password.trim(), 10);
    }

    const updated: User = {
      ...currentUser,
      ...userData,
      passwordHash,
      updatedAt: new Date().toISOString(),
    };

    mockStore.users[index] = updated;
    if (id === mockStore.currentUser.id) {
      mockStore.currentUser = updated;
    }
    mockStore.saveAll();
    return updated;
  },

  async deleteUser(id: string, options?: { reassignToUserId?: string; keepAsFormerMember?: boolean }): Promise<void> {
    await delay();
    const user = mockStore.users.find((u) => u.id === id);
    if (!user) throw new Error('User not found');

    if (id === mockStore.currentUser.id) {
      throw new Error('You cannot delete your own account.');
    }

    if (user.role === 'super_admin') {
      const activeSuperAdmins = mockStore.users.filter(
        (u) => u.role === 'super_admin' && u.active && !u.isFormerMember && u.id !== id
      );
      if (activeSuperAdmins.length === 0) {
        throw new Error('Cannot delete or deactivate the last Super Admin. Promote another member first.');
      }
    }

    const assignedTasks = mockStore.tasks.filter((t) => t.assigneeId === id);
    const userDeliverables = mockStore.deliverables.filter((d) => d.assigneeId === id);

    if (assignedTasks.length > 0 || userDeliverables.length > 0) {
      if (options?.reassignToUserId) {
        mockStore.tasks = mockStore.tasks.map((t) =>
          t.assigneeId === id ? { ...t, assigneeId: options.reassignToUserId!, updatedAt: new Date().toISOString() } : t
        );
      }

      if (options?.keepAsFormerMember || !options?.reassignToUserId) {
        user.isFormerMember = true;
        user.active = false;
        user.title = user.title ? `${user.title} (Former)` : 'Former Member';
        user.updatedAt = new Date().toISOString();
        mockStore.saveAll();
        return;
      }
    }

    if (options?.keepAsFormerMember) {
      user.isFormerMember = true;
      user.active = false;
      user.updatedAt = new Date().toISOString();
    } else {
      mockStore.users = mockStore.users.filter((u) => u.id !== id);
    }

    mockStore.saveAll();
  },
};

export const mockNotificationService: INotificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    await delay(20);
    return mockStore.notifications
      .filter((n) => n.userId === userId || n.userId === 'user-1')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async markAsRead(id: string): Promise<void> {
    await delay(10);
    const notif = mockStore.notifications.find((n) => n.id === id);
    if (notif) {
      notif.readAt = new Date().toISOString();
      mockStore.saveAll();
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    await delay(10);
    mockStore.notifications.forEach((n) => {
      if (n.userId === userId || n.userId === 'user-1') {
        n.readAt = new Date().toISOString();
      }
    });
    mockStore.saveAll();
  },

  async createNotification(data): Promise<Notification> {
    await delay(10);
    const notif: Notification = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: mockStore.currentUser.id,
    };
    mockStore.notifications.unshift(notif);
    mockStore.saveAll();
    return notif;
  },
};

export const mockActivityLogService: IActivityLogService = {
  async getActivityLogs(limit = 20, entityId?: string): Promise<ActivityLog[]> {
    await delay();
    let result = [...mockStore.activityLogs];
    if (entityId) {
      result = result.filter(
        (l) => l.entityId === entityId || (l.after as any)?.clientId === entityId
      );
    }
    return result.slice(0, limit);
  },

  async log(action: string, entity: string, entityId: string, after?: Record<string, unknown>): Promise<void> {
    const entry: ActivityLog = {
      id: `act-${Date.now()}`,
      actorId: mockStore.currentUser.id,
      actorName: mockStore.currentUser.name,
      action,
      entity,
      entityId,
      after,
      at: new Date().toISOString(),
    };
    mockStore.activityLogs.unshift(entry);
    mockStore.saveAll();
  },
};

export const mockSettingsService: ISettingsService = {
  async getSettings(): Promise<AgencySettings> {
    await delay();
    return { ...mockStore.settings };
  },

  async updateSettings(data: Partial<AgencySettings>): Promise<AgencySettings> {
    await delay();
    mockStore.settings = { ...mockStore.settings, ...data };
    mockStore.saveAll();
    return { ...mockStore.settings };
  },

  async exportData(options?: { includeLogins?: boolean }): Promise<string> {
    await delay();
    const sanitizedUsers = mockStore.users.map((u) => {
      const copy = { ...u };
      if (!options?.includeLogins) {
        delete copy.passwordHash;
      }
      return copy;
    });

    const data = {
      version: '4.0',
      exportedAt: new Date().toISOString(),
      agencyName: mockStore.settings.agencyName,
      settings: mockStore.settings,
      users: sanitizedUsers,
      clients: mockStore.clients,
      deliverables: mockStore.deliverables,
      payments: mockStore.payments,
      expenses: mockStore.expenses,
      tasks: mockStore.tasks,
      calendarItems: mockStore.calendarItems,
      counts: {
        users: sanitizedUsers.length,
        clients: mockStore.clients.length,
        deliverables: mockStore.deliverables.length,
        payments: mockStore.payments.length,
        expenses: mockStore.expenses.length,
        tasks: mockStore.tasks.length,
      },
    };
    return JSON.stringify(data, null, 2);
  },

  hasUndoSnapshot(): boolean {
    return !!localStorage.getItem('getup_agency_undo_snapshot');
  },

  async undoImport(): Promise<boolean> {
    await delay(50);
    const snapshotStr = localStorage.getItem('getup_agency_undo_snapshot');
    if (!snapshotStr) return false;
    try {
      const snap = JSON.parse(snapshotStr);
      if (snap.settings) mockStore.settings = snap.settings;
      if (snap.users) mockStore.users = snap.users;
      if (snap.clients) mockStore.clients = snap.clients;
      if (snap.deliverables) mockStore.deliverables = snap.deliverables;
      if (snap.payments) mockStore.payments = snap.payments;
      if (snap.expenses) mockStore.expenses = snap.expenses;
      if (snap.tasks) mockStore.tasks = snap.tasks;
      if (snap.calendarItems) mockStore.calendarItems = snap.calendarItems;
      mockStore.saveAll();
      localStorage.removeItem('getup_agency_undo_snapshot');
      return true;
    } catch {
      return false;
    }
  },

  async importData(jsonData: string, mode: 'replace' | 'merge' = 'replace'): Promise<{ importedCounts: Record<string, number> }> {
    await delay(100);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonData);
    } catch (err: any) {
      throw new Error('Invalid JSON format: ' + err.message);
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Corrupted or invalid JSON root payload.');
    }

    // Save pre-import backup snapshot
    const currentSnapshot = {
      timestamp: new Date().toISOString(),
      settings: mockStore.settings,
      users: mockStore.users,
      clients: mockStore.clients,
      deliverables: mockStore.deliverables,
      payments: mockStore.payments,
      expenses: mockStore.expenses,
      tasks: mockStore.tasks,
      calendarItems: mockStore.calendarItems,
    };
    localStorage.setItem('getup_agency_undo_snapshot', JSON.stringify(currentSnapshot));

    const counts: Record<string, number> = {
      clients: 0,
      deliverables: 0,
      payments: 0,
      expenses: 0,
      tasks: 0,
      users: 0,
    };

    if (mode === 'replace') {
      if (Array.isArray(parsed.clients)) {
        mockStore.clients = parsed.clients;
        counts.clients = parsed.clients.length;
      }
      if (Array.isArray(parsed.deliverables)) {
        mockStore.deliverables = parsed.deliverables;
        counts.deliverables = parsed.deliverables.length;
      }
      if (Array.isArray(parsed.payments)) {
        mockStore.payments = parsed.payments;
        counts.payments = parsed.payments.length;
      }
      if (Array.isArray(parsed.expenses)) {
        mockStore.expenses = parsed.expenses;
        counts.expenses = parsed.expenses.length;
      }
      if (Array.isArray(parsed.tasks)) {
        mockStore.tasks = parsed.tasks;
        counts.tasks = parsed.tasks.length;
      }
      if (Array.isArray(parsed.calendarItems)) {
        mockStore.calendarItems = parsed.calendarItems;
      }
      if (parsed.settings && typeof parsed.settings === 'object') {
        mockStore.settings = { ...mockStore.settings, ...parsed.settings };
      }
      if (Array.isArray(parsed.users) && parsed.users.length > 0) {
        // Keep current user or seed super_admin password if omitted
        const mergedUsers = parsed.users.map((u: any) => {
          const existing = mockStore.users.find((ex) => ex.id === u.id || ex.email === u.email);
          return {
            ...u,
            passwordHash: u.passwordHash || existing?.passwordHash || bcrypt.hashSync('password123', 10),
          };
        });
        mockStore.users = mergedUsers;
        counts.users = mergedUsers.length;
      }
    } else {
      // Merge mode (skip duplicates by ID or unique key)
      if (Array.isArray(parsed.clients)) {
        let added = 0;
        parsed.clients.forEach((c: any) => {
          if (!mockStore.clients.some((ex) => ex.id === c.id || ex.name.toLowerCase() === c.name?.toLowerCase())) {
            mockStore.clients.push(c);
            added++;
          }
        });
        counts.clients = added;
      }

      if (Array.isArray(parsed.deliverables)) {
        let added = 0;
        parsed.deliverables.forEach((d: any) => {
          if (!mockStore.deliverables.some((ex) => ex.id === d.id)) {
            mockStore.deliverables.push(d);
            added++;
          }
        });
        counts.deliverables = added;
      }

      if (Array.isArray(parsed.payments)) {
        let added = 0;
        parsed.payments.forEach((p: any) => {
          if (!mockStore.payments.some((ex) => ex.id === p.id)) {
            mockStore.payments.push(p);
            added++;
          }
        });
        counts.payments = added;
      }

      if (Array.isArray(parsed.expenses)) {
        let added = 0;
        parsed.expenses.forEach((e: any) => {
          if (!mockStore.expenses.some((ex) => ex.id === e.id)) {
            mockStore.expenses.push(e);
            added++;
          }
        });
        counts.expenses = added;
      }

      if (Array.isArray(parsed.tasks)) {
        let added = 0;
        parsed.tasks.forEach((t: any) => {
          if (!mockStore.tasks.some((ex) => ex.id === t.id)) {
            mockStore.tasks.push(t);
            added++;
          }
        });
        counts.tasks = added;
      }

      if (Array.isArray(parsed.users)) {
        let added = 0;
        parsed.users.forEach((u: any) => {
          if (!mockStore.users.some((ex) => ex.id === u.id || ex.email?.toLowerCase() === u.email?.toLowerCase())) {
            mockStore.users.push({
              ...u,
              passwordHash: u.passwordHash || bcrypt.hashSync('password123', 10),
            });
            added++;
          }
        });
        counts.users = added;
      }
    }

    mockStore.saveAll();
    return { importedCounts: counts };
  },

  async importCsv(csvData: string, type: 'clients' | 'deliverables', mode: 'replace' | 'merge' = 'merge'): Promise<{ importedCounts: Record<string, number> }> {
    await delay(100);
    const lines = csvData.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      throw new Error('CSV file has no data rows.');
    }

    // Save snapshot
    const currentSnapshot = {
      timestamp: new Date().toISOString(),
      settings: mockStore.settings,
      users: mockStore.users,
      clients: mockStore.clients,
      deliverables: mockStore.deliverables,
      payments: mockStore.payments,
      expenses: mockStore.expenses,
      tasks: mockStore.tasks,
      calendarItems: mockStore.calendarItems,
    };
    localStorage.setItem('getup_agency_undo_snapshot', JSON.stringify(currentSnapshot));

    const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    const dataLines = lines.slice(1);
    let count = 0;

    if (type === 'clients') {
      const newClients: Client[] = [];
      dataLines.forEach((line, idx) => {
        const parts = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
        const name = parts[headers.indexOf('name')] || parts[0];
        const business = parts[headers.indexOf('business')] || parts[1] || 'Brand';
        const fee = Number(parts[headers.indexOf('monthlyfee')] || parts[2]) || 0;
        const status = (parts[headers.indexOf('status')] || 'active') as any;

        if (name) {
          newClients.push({
            id: `cli-${Date.now()}-${idx}`,
            name,
            business,
            contactPerson: name,
            phone: '',
            email: '',
            status,
            onboardedOn: new Date().toISOString().split('T')[0],
            monthlyFee: fee,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: mockStore.currentUser?.id || 'system',
          });
        }
      });

      if (mode === 'replace') {
        mockStore.clients = newClients;
        count = newClients.length;
      } else {
        newClients.forEach((c) => {
          if (!mockStore.clients.some((ex) => ex.name.toLowerCase() === c.name.toLowerCase())) {
            mockStore.clients.push(c);
            count++;
          }
        });
      }
    }

    mockStore.saveAll();
    return { importedCounts: { [type]: count } };
  },

  async resetAllData(): Promise<void> {
    await delay();
    mockStore.resetAllData();
  },
};

export const mockBillingCycleService: IBillingCycleService = {
  async getCycles(filters): Promise<BillingCycle[]> {
    await delay();
    let result = [...mockStore.billingCycles];
    if (filters?.clientId) {
      result = result.filter((c) => c.clientId === filters.clientId);
    }
    if (filters?.month) {
      result = result.filter((c) => c.startDate.startsWith(filters.month!));
    }
    return result.sort((a, b) => a.cycleNumber - b.cycleNumber);
  },

  async getCycleById(id: string): Promise<BillingCycle | null> {
    await delay();
    const cycle = mockStore.billingCycles.find((c) => c.id === id);
    return cycle || null;
  },

  async getActiveCycle(clientId: string): Promise<BillingCycle | null> {
    await delay();
    const today = '2026-10-20';
    const clientCycles = mockStore.billingCycles
      .filter((c) => c.clientId === clientId)
      .sort((a, b) => b.cycleNumber - a.cycleNumber);

    if (clientCycles.length === 0) return null;

    // Active cycle where startDate <= today <= endDate
    const active = clientCycles.find((c) => today >= c.startDate && today <= c.endDate);
    if (active) return active;

    // Otherwise return latest cycle
    return clientCycles[0];
  },

  async createCycle(data): Promise<BillingCycle> {
    await delay();
    const newCycle: BillingCycle = {
      ...data,
      id: `cycle-${data.clientId}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: mockStore.currentUser.id,
    };
    mockStore.billingCycles.push(newCycle);

    const client = mockStore.clients.find((c) => c.id === data.clientId);
    if (client) {
      client.currentCycleId = newCycle.id;
    }

    mockStore.saveAll();
    return newCycle;
  },

  async updateCycle(id: string, data): Promise<BillingCycle> {
    await delay();
    const index = mockStore.billingCycles.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Billing cycle not found');
    const updated = {
      ...mockStore.billingCycles[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    mockStore.billingCycles[index] = updated;
    mockStore.saveAll();
    return updated;
  },

  async renewCycle(cycleId: string, options): Promise<BillingCycle> {
    await delay();
    const currentCycle = mockStore.billingCycles.find((c) => c.id === cycleId);
    if (!currentCycle) throw new Error('Current billing cycle not found');

    const client = mockStore.clients.find((c) => c.id === currentCycle.clientId);
    if (!client) throw new Error('Client not found');

    // Mark current cycle as renewed
    currentCycle.renewalDecision = 'renewed';
    currentCycle.updatedAt = new Date().toISOString();

    const nextStartDate = calculateNextCycleStartDate(currentCycle.endDate);
    const nextEndDate = calculateCycleEndDate(nextStartDate);
    const nextCycleNumber = currentCycle.cycleNumber + 1;

    let nextPackage: BillingCyclePackage = { ...currentCycle.package };
    let nextFee = currentCycle.feeAmount;

    if (!options.samePlan) {
      if (options.newPackage) {
        nextPackage = { ...options.newPackage };
      }
      if (options.newFee !== undefined) {
        nextFee = options.newFee;
      }
    }

    // Delivered deliverables for current cycle
    const cycleDeliverables = mockStore.deliverables.filter(
      (d) => d.clientId === client.id && d.cycleId === currentCycle.id && d.status === 'delivered'
    );

    const carriedForward: BillingCyclePackage = {};
    const creditedExtra: BillingCyclePackage = {};

    const typeEntries: [keyof BillingCyclePackage, DeliverableType][] = [
      ['videos', 'video'],
      ['posts', 'post'],
      ['reels', 'reel'],
      ['stories', 'story'],
    ];

    typeEntries.forEach(([pkgKey, dlvType]) => {
      const promised =
        (currentCycle.package[pkgKey] || 0) + (currentCycle.carriedForward?.[pkgKey] || 0);
      const done =
        cycleDeliverables.filter((d) => d.type === dlvType).length +
        (currentCycle.creditedExtra?.[pkgKey] || 0);

      if (options.carryForwardRemaining) {
        const remaining = Math.max(0, promised - done);
        if (remaining > 0) carriedForward[pkgKey] = remaining;
      }

      if (options.creditExtraDelivered) {
        const extra = Math.max(0, done - promised);
        if (extra > 0) creditedExtra[pkgKey] = extra;
      }
    });

    const newCycle: BillingCycle = {
      id: `cycle-${client.id}-${nextCycleNumber}-${Date.now()}`,
      clientId: client.id,
      cycleNumber: nextCycleNumber,
      startDate: nextStartDate,
      endDate: nextEndDate,
      package: nextPackage,
      feeAmount: nextFee,
      renewedFromCycleId: currentCycle.id,
      carriedForward: Object.keys(carriedForward).length > 0 ? carriedForward : undefined,
      creditedExtra: Object.keys(creditedExtra).length > 0 ? creditedExtra : undefined,
      renewalDecision: 'pending',
      notes: options.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: mockStore.currentUser.id,
    };

    mockStore.billingCycles.push(newCycle);

    // Update client currentCycleId and package/monthlyFee if plan changed
    client.currentCycleId = newCycle.id;
    if (!options.samePlan) {
      client.monthlyFee = nextFee;
      client.package = {
        id: client.package?.id || `pkg-${client.id}`,
        clientId: client.id,
        videosPerMonth: nextPackage.videos,
        postersPerMonth: nextPackage.posts,
        reelsPerMonth: nextPackage.reels,
        storiesPerMonth: nextPackage.stories,
        startDate: nextStartDate,
      };
    }

    // Auto-create pending payment for the new cycle so Pending to Collect stays correct!
    if (nextFee > 0) {
      const newPendingPayment: Payment = {
        id: `pay-${newCycle.id}-pending`,
        clientId: client.id,
        cycleId: newCycle.id,
        month: nextStartDate.slice(0, 7),
        amount: nextFee,
        date: nextStartDate,
        status: 'pending',
        mode: 'bank_transfer',
        notes: `Billing Cycle ${nextCycleNumber} Retainer`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: mockStore.currentUser.id,
      };
      mockStore.payments.unshift(newPendingPayment);
    }

    mockStore.saveAll();
    return newCycle;
  },
};

