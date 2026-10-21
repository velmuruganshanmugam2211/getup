import { Permission } from '@/types';
import { ROUTES } from './routes';

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  requiredPermission?: Permission;
  badge?: string;
  exact?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: ROUTES.DASHBOARD,
    icon: 'LayoutDashboard',
    requiredPermission: 'dashboard.full',
  },
  {
    title: 'Clients',
    href: ROUTES.CLIENTS,
    icon: 'Building2',
    requiredPermission: 'clients.read',
  },
  {
    title: 'Tasks',
    href: ROUTES.TASKS,
    icon: 'CheckSquare',
    requiredPermission: 'tasks.read',
  },
  {
    title: 'Calendar',
    href: ROUTES.CALENDAR,
    icon: 'Calendar',
    requiredPermission: 'calendar.read',
  },
  {
    title: 'Finance',
    href: ROUTES.FINANCE,
    icon: 'Wallet',
    requiredPermission: 'finance.read',
  },
  {
    title: 'Team',
    href: ROUTES.TEAM,
    icon: 'Users',
    requiredPermission: 'team.read',
  },
  {
    title: 'Calls',
    href: ROUTES.CALLS,
    icon: 'PhoneCall',
    requiredPermission: 'calls.read',
  },
  {
    title: 'Reports',
    href: ROUTES.REPORTS,
    icon: 'BarChart3',
    requiredPermission: 'reports.read',
  },
  {
    title: 'Settings',
    href: ROUTES.SETTINGS,
    icon: 'Settings',
    requiredPermission: 'settings.read',
  },
];
