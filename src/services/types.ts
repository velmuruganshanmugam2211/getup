import {
  User,
  Client,
  Deliverable,
  Payment,
  Expense,
  Salary,
  Task,
  CalendarItem,
  CalendarItemType,
  Notification,
  ActivityLog,
  AgencySettings,
  BillingCycle,
  BillingCyclePackage,
  Money,
  RecurringFixedExpense,
  Lead,
  CallLog,
  LeadStage,
  CallOutcome,
} from '@/types';

export interface RenewCycleOptions {
  samePlan: boolean;
  newPackage?: BillingCyclePackage;
  newFee?: Money;
  carryForwardRemaining?: boolean;
  creditExtraDelivered?: boolean;
  notes?: string;
}

export interface IBillingCycleService {
  getCycles(filters?: { clientId?: string; month?: string }): Promise<BillingCycle[]>;
  getCycleById(id: string): Promise<BillingCycle | null>;
  getActiveCycle(clientId: string): Promise<BillingCycle | null>;
  createCycle(data: Omit<BillingCycle, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<BillingCycle>;
  updateCycle(id: string, data: Partial<BillingCycle>): Promise<BillingCycle>;
  renewCycle(cycleId: string, options: RenewCycleOptions): Promise<BillingCycle>;
}

export interface IAuthService {
  login(identifier: string, password?: string): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  switchUser(userId: string): Promise<User>;
}

export interface IClientService {
  getClients(filters?: { search?: string; status?: string }): Promise<Client[]>;
  getClientById(id: string): Promise<Client | null>;
  createClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Client>;
  updateClient(id: string, data: Partial<Client>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
}

export interface IDeliverableService {
  getDeliverables(filters?: { clientId?: string; month?: string; type?: string; status?: string }): Promise<Deliverable[]>;
  createDeliverable(data: Omit<Deliverable, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Deliverable>;
  updateDeliverable(id: string, data: Partial<Deliverable>): Promise<Deliverable>;
  deleteDeliverable(id: string): Promise<void>;
}

export interface MonthlyFinancialSummary {
  month: string;
  agreedAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  totalExpenses: number;
  profit: number;
  expensesByCategory: Record<string, number>;
}

export interface IFinanceService {
  getPayments(filters?: { clientId?: string; month?: string; status?: string }): Promise<Payment[]>;
  createPayment(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Payment>;
  updatePayment(id: string, data: Partial<Payment>): Promise<Payment>;
  deletePayment(id: string): Promise<void>;
  getExpenses(filters?: { month?: string; category?: string; clientId?: string; type?: string; expenseNature?: 'fixed' | 'variable' }): Promise<Expense[]>;
  createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Expense>;
  createExpensesBatch(items: Array<Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>): Promise<Expense[]>;
  updateExpense(id: string, data: Partial<Expense>): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
  getSalaries(month?: string): Promise<Salary[]>;
  getMonthlySummary(month: string): Promise<MonthlyFinancialSummary>;
  getRecurringFixedExpenses(): Promise<RecurringFixedExpense[]>;
  createRecurringFixedExpense(data: Omit<RecurringFixedExpense, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<RecurringFixedExpense>;
  updateRecurringFixedExpense(id: string, data: Partial<RecurringFixedExpense>): Promise<RecurringFixedExpense>;
  deleteRecurringFixedExpense(id: string): Promise<void>;
  markRecurringExpensePaid(recurringId: string, month: string): Promise<Expense>;
  processAutoAddFixedExpenses(month: string): Promise<Expense[]>;
}

export interface ICallService {
  getLeads(filters?: { search?: string; stage?: LeadStage }): Promise<Lead[]>;
  getLeadById(id: string): Promise<Lead | null>;
  createLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'stage'> & { stage?: LeadStage }): Promise<Lead>;
  updateLead(id: string, data: Partial<Lead>): Promise<Lead>;
  deleteLead(id: string): Promise<void>;
  getCallLogs(filters?: { leadId?: string; date?: string; calledBy?: string; outcome?: CallOutcome }): Promise<CallLog[]>;
  createCallLog(data: Omit<CallLog, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<CallLog>;
  updateCallLog(id: string, data: Partial<CallLog>): Promise<CallLog>;
  deleteCallLog(id: string): Promise<void>;
  markFollowUpDone(id: string): Promise<CallLog>;
}

export interface ITaskService {
  getTasks(filters?: { assigneeId?: string; status?: string; clientId?: string }): Promise<Task[]>;
  createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  logTime(taskId: string, minutes: number): Promise<Task>;
}

export interface ICalendarService {
  getItems(filters?: { month?: string; date?: string; clientId?: string; type?: CalendarItemType }): Promise<CalendarItem[]>;
  getItemById(id: string): Promise<CalendarItem | null>;
  createItem(data: Omit<CalendarItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<CalendarItem>;
  updateItem(id: string, data: Partial<CalendarItem>): Promise<CalendarItem>;
  deleteItem(id: string): Promise<void>;
}

export interface ITeamService {
  getUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | null>;
  createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> & { password?: string }): Promise<User>;
  updateUser(id: string, data: Partial<User> & { password?: string }): Promise<User>;
  deleteUser(id: string, options?: { reassignToUserId?: string; keepAsFormerMember?: boolean }): Promise<void>;
  checkUsernameUnique(username: string, excludeUserId?: string): Promise<boolean>;
}

export interface INotificationService {
  getNotifications(userId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<Notification>;
}

export interface IActivityLogService {
  getActivityLogs(limit?: number, entityId?: string): Promise<ActivityLog[]>;
  log(action: string, entity: string, entityId: string, after?: Record<string, unknown>): Promise<void>;
}

export interface ISettingsService {
  getSettings(): Promise<AgencySettings>;
  updateSettings(data: Partial<AgencySettings>): Promise<AgencySettings>;
  exportData(options?: { includeLogins?: boolean }): Promise<string>;
  importData(jsonData: string, mode?: 'replace' | 'merge'): Promise<{ importedCounts: Record<string, number> }>;
  importCsv(csvData: string, type: 'clients' | 'deliverables', mode?: 'replace' | 'merge'): Promise<{ importedCounts: Record<string, number> }>;
  undoImport(): Promise<boolean>;
  hasUndoSnapshot(): boolean;
  resetAllData(): Promise<void>;
}
