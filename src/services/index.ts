import {
  mockAuthService,
  mockClientService,
  mockBillingCycleService,
  mockDeliverableService,
  mockFinanceService,
  mockTaskService,
  mockCalendarService,
  mockTeamService,
  mockNotificationService,
  mockActivityLogService,
  mockSettingsService,
  mockCallService,
} from './mock';
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
  ICallService,
} from './types';

export const authService: IAuthService = mockAuthService;
export const clientService: IClientService = mockClientService;
export const billingCycleService: IBillingCycleService = mockBillingCycleService;
export const deliverableService: IDeliverableService = mockDeliverableService;
export const financeService: IFinanceService = mockFinanceService;
export const taskService: ITaskService = mockTaskService;
export const calendarService: ICalendarService = mockCalendarService;
export const teamService: ITeamService = mockTeamService;
export const notificationService: INotificationService = mockNotificationService;
export const activityLogService: IActivityLogService = mockActivityLogService;
export const settingsService: ISettingsService = mockSettingsService;
export const callService: ICallService = mockCallService;

export * from './types';
export { mockStore } from './mock/mockStore';
