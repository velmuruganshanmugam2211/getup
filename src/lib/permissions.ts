import { Role, Permission } from '@/types';

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: [
    'dashboard.full',
    'dashboard.worker',
    'clients.read',
    'clients.write',
    'calendar.read',
    'calendar.write',
    'finance.read',
    'finance.write',
    'finance.salary',
    'tasks.read',
    'tasks.write',
    'tasks.all',
    'team.read',
    'team.write',
    'reports.read',
    'settings.read',
    'settings.write',
  ],
  worker: [
    'tasks.read',
    'tasks.write',
  ],
};

/**
 * Checks if a given role has a specific permission.
 */
export function hasPermission(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Checks if a given role has ANY of the specified permissions.
 */
export function hasAnyPermission(role: Role | undefined | null, permissions: Permission[]): boolean {
  return permissions.some((perm) => hasPermission(role, perm));
}

/**
 * Checks if a given role has ALL of the specified permissions.
 */
export function hasAllPermissions(role: Role | undefined | null, permissions: Permission[]): boolean {
  return permissions.every((perm) => hasPermission(role, perm));
}
