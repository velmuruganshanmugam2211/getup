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

export interface BillingCyclePackage {
  videos?: number;
  posts?: number;
  reels?: number;
  stories?: number;
}

export type BillingCycleStatus = 'upcoming' | 'active' | 'renewal_pending' | 'completed';

export interface BillingCycle extends BaseEntity {
  clientId: string;
  cycleNumber: number;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD' (startDate + 1 month - 1 day)
  package: BillingCyclePackage; // snapshot of active package deliverables
  feeAmount: Money;             // snapshot of monthly fee
  renewedFromCycleId?: string;
  carriedForward?: BillingCyclePackage; // unfinished deliverables added to this cycle
  creditedExtra?: BillingCyclePackage;  // over-deliveries credited towards this cycle
  renewalDecision?: 'renewed' | 'closed' | 'paused' | 'pending';
  notes?: string;
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
  currentCycleId?: string;
}

export interface Deliverable extends BaseEntity {
  clientId: string;
  cycleId?: string;       // billing cycle reference
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
  cycleId?: string;       // billing cycle reference
  month: Month;
  amount: Money;
  date: string;           // date paid / date of record
  mode?: PaymentMode;
  status: PaymentStatus;
  notes?: string;
}

export type ExpenseNature = 'fixed' | 'variable';

export interface Expense extends BaseEntity {
  type: ExpenseType;
  expenseNature: ExpenseNature;
  category: ExpenseCategory;
  amount: Money;
  date: string;
  note: string;
  paidTo?: string;
  recurring?: boolean;
  clientId?: string;
  cycleId?: string;       // billing cycle reference
  projectLabel?: string;
  userId?: string;
}

export interface RecurringFixedExpense extends BaseEntity {
  name: string;
  category: ExpenseCategory;
  amount: Money;
  startMonth: Month; // 'YYYY-MM'
  teamMemberId?: string;
  active: boolean;
  autoAdd: boolean; // auto add on 1st of month (off by default)
  notes?: string;
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
export type MeetingReminder = 'at_time' | '10_min' | '30_min' | '1_hour' | '1_day' | '2_days';

export interface CalendarItem extends BaseEntity {
  type: CalendarItemType;
  title: string;
  date: string;           // 'YYYY-MM-DD'
  clientId?: string;
  leadId?: string;
  startTime?: string;     // 'HH:mm' e.g. '14:30'
  endTime?: string;       // 'HH:mm' e.g. '15:30'
  location?: string;      // Video link or physical venue
  locationOrLink?: string;
  attendees?: string[];   // User IDs or names
  reminder?: MeetingReminder;
  reminders?: MeetingReminder[];
  notes?: string;
  text?: string;          // For notes
}

export type LeadStage =
  | 'New'
  | 'Contacted'
  | 'Follow-up'
  | 'Meeting Fixed'
  | 'Converted'
  | 'Not Interested';

export type CallOutcome =
  | 'Not answered'
  | 'Busy'
  | 'Callback requested'
  | 'Interested'
  | 'Meeting fixed'
  | 'Not interested'
  | 'Wrong number';

export interface Lead extends BaseEntity {
  businessName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  source?: string;
  notes?: string;
  stage: LeadStage;
  convertedClientId?: string;
}

export interface CallLog extends BaseEntity {
  leadId: string;
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:mm'
  calledBy: string; // User name or ID
  outcome: CallOutcome;
  notes?: string;
  followUpDate?: string; // 'YYYY-MM-DD'
  followUpTime?: string; // 'HH:mm'
  followUpNote?: string;
  followUpDone?: boolean;
  meetingId?: string; // Links to calendar item
  meetingDate?: string;
  meetingTime?: string;
  meetingLocation?: string;
  reminders?: MeetingReminder[];
}

export interface Notification extends BaseEntity {
  userId: string;
  type:
    | 'meeting_reminder'
    | 'task_overdue'
    | 'task_due_today'
    | 'task_due_tomorrow'
    | 'payment_overdue'
    | 'cycle_ending'
    | 'cycle_expired'
    | 'cycle_payment_due'
    | 'task_assigned'
    | 'system'
    | 'deliverable_added'
    | 'client_added'
    | 'follow_up_due'
    | 'follow_up_overdue';
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
  taskDueNotificationTime?: string; // e.g. "09:00"
  followUpNotificationTime?: string; // e.g. "09:00"
  initialOpeningBalance?: Money; // Initial cash opening balance
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
  | 'settings.write'
  | 'calls.read'
  | 'calls.write';

