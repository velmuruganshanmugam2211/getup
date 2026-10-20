export type Role = 'super_admin' | 'worker';

export type Month = string; // Format: 'YYYY-MM' e.g. '2026-10'
export type Money = number; // Integer in INR (e.g. 50000 for ₹50,000)

export type ClientStatus = 'active' | 'paused' | 'closed' | 'lead';
export type DeliverableType = 'video' | 'reel' | 'post' | 'story';
export type DeliverableStatus = 'planned' | 'in_progress' | 'delivered';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type PaymentMode = 'bank_transfer' | 'upi' | 'cheque' | 'cash';
export type ExpenseType = 'client' | 'agency';
export type ExpenseCategory =
  | 'editor'
  | 'shoot'
  | 'ads'
  | 'software'
  | 'travel'
  | 'equipment'
  | 'salary'
  | 'rent'
  | 'props'
  | 'other';
export type TaskStatus = 'todo' | 'doing' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  active: boolean;
  phone?: string;
  title?: string;
  username?: string;
  passwordHash?: string;
  lastLogin?: string;
  isFormerMember?: boolean;
}

export interface Package {
  id: string;
  clientId: string;
  videosPerMonth?: number;
  postersPerMonth?: number;
  reelsPerMonth?: number;
  storiesPerMonth?: number;
  startDate?: string;
}

export interface Client extends BaseEntity {
  name: string;
  business: string;
  vertical?: string;
  contactPerson: string;
  phone: string;
  email: string;
  status: ClientStatus;
  onboardedOn: string;
  monthlyFee: Money;
  notes?: string;
  package?: Package;
  assignedWorkerIds?: string[];
}

export interface Deliverable extends BaseEntity {
  clientId: string;
  type: DeliverableType;
  title: string;
  date: string;           // ISO date string
  month: Month;           // 'YYYY-MM'
  status: DeliverableStatus;
  link?: string;
  notes?: string;
  assigneeId?: string;
}

export interface Payment extends BaseEntity {
  clientId: string;
  month: Month;
  amount: Money;
  date: string;           // date paid / date of record
  mode?: PaymentMode;
  status: PaymentStatus;
  notes?: string;
}

export interface Expense extends BaseEntity {
  type: ExpenseType;
  category: ExpenseCategory;
  amount: Money;
  date: string;
  note: string;
  paidTo?: string;
  recurring?: boolean;
  clientId?: string;
  projectLabel?: string;
  userId?: string;
}

export interface Salary extends BaseEntity {
  userId: string;
  month: Month;
  amount: Money;
  paidOn?: string;
  status: 'paid' | 'pending';
}

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  clientId?: string;
  deliverableId?: string;
  deliverableType?: DeliverableType;
  assigneeId: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  timeSpent: number; // in minutes
}

export type CalendarItemType = 'meeting' | 'note';
export type MeetingReminder = 'at_time' | '10_min' | '30_min' | '1_hour' | '1_day';

export interface CalendarItem extends BaseEntity {
  type: CalendarItemType;
  title: string;
  date: string;           // 'YYYY-MM-DD'
  clientId?: string;
  startTime?: string;     // 'HH:mm' e.g. '14:30'
  endTime?: string;       // 'HH:mm' e.g. '15:30'
  location?: string;      // Video link or physical venue
  locationOrLink?: string;
  attendees?: string[];   // User IDs or names
  reminder?: MeetingReminder;
  notes?: string;
  text?: string;          // For notes
}

export interface Notification extends BaseEntity {
  userId: string;
  type:
    | 'meeting_reminder'
    | 'task_overdue'
    | 'payment_overdue'
    | 'task_assigned'
    | 'system'
    | 'deliverable_added'
    | 'client_added';
  title?: string;
  message: string;
  readAt?: string;
  link?: string;
  entityId?: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  at: string;
}

export interface AgencySettings {
  agencyName: string;
  logo?: string;
  address: string;
  gstNumber?: string;
  currency: string;
  defaultBillingDay: number;
  financialYearStart: string;
  browserNotificationsEnabled: boolean;
  defaultMeetingReminder: MeetingReminder;
  overdueAlertsEnabled: boolean;
  sidebarCollapsedDefault: boolean;
  dateFormat: string;
}

export type Permission =
  | 'dashboard.full'
  | 'dashboard.worker'
  | 'clients.read'
  | 'clients.write'
  | 'calendar.read'
  | 'calendar.write'
  | 'finance.read'
  | 'finance.write'
  | 'finance.salary'
  | 'tasks.read'
  | 'tasks.write'
  | 'tasks.all'
  | 'team.read'
  | 'team.write'
  | 'reports.read'
  | 'settings.read'
  | 'settings.write';
