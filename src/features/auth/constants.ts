import { Role } from '@/types';

export interface DemoAccount {
  role: Role;
  name: string;
  email: string;
  title: string;
  badge: string;
  description: string;
  userId: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'super_admin',
    name: 'Velmurugan Shanmugam',
    email: 'velmurugan@getup.agency',
    title: 'Founder & CEO',
    badge: 'Super Admin',
    description: 'Full control over clients, deliverables, team, calendar & finance',
    userId: 'user-1',
  },
  {
    role: 'worker',
    name: 'Rahul Sharma',
    email: 'rahul@getup.agency',
    title: 'Senior Video Editor',
    badge: 'Worker',
    description: 'Tasks view: assigned deliverables and task tracking only',
    userId: 'user-2',
  },
];
