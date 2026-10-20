import {
  User,
  Client,
  Payment,
  Expense,
  Salary,
  Task,
  CalendarItem,
  Notification,
  ActivityLog,
} from '@/types';

import bcrypt from 'bcryptjs';

// Default salt/hash for seed accounts (password: 'password123')
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('password123', 10);

// Keep seed users so the app has login accounts (Super Admin & Worker only); no dummy business data.
export const SEED_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Velmurugan Shanmugam',
    email: 'velmurugan@getup.agency',
    username: 'velmurugan',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'super_admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    active: true,
    phone: '+91 98765 43210',
    title: 'Founder & CEO',
    lastLogin: '2026-10-20T10:30:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    createdBy: 'system',
  },
  {
    id: 'user-2',
    name: 'Rahul Sharma',
    email: 'rahul@getup.agency',
    username: 'rahul',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'worker',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    active: true,
    phone: '+91 98765 43212',
    title: 'Senior Video Editor',
    lastLogin: '2026-10-19T14:15:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    createdBy: 'user-1',
  },
  {
    id: 'user-3',
    name: 'Anita Desai',
    email: 'anita@getup.agency',
    username: 'anita',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'worker',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    active: true,
    phone: '+91 98765 43211',
    title: 'Motion Designer',
    lastLogin: '2026-10-18T09:45:00Z',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    createdBy: 'user-1',
  },
];

// All other entities start empty — users add real data via the UI.
export const SEED_CLIENTS: Client[] = [];
export const SEED_PAYMENTS: Payment[] = [];
export const SEED_EXPENSES: Expense[] = [];
export const SEED_SALARIES: Salary[] = [];
export const SEED_TASKS: Task[] = [];
export const SEED_CALENDAR_ITEMS: CalendarItem[] = [];
export const SEED_NOTIFICATIONS: Notification[] = [];
export const SEED_ACTIVITY_LOGS: ActivityLog[] = [];
