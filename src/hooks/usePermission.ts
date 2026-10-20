import { Permission } from '@/types';
import { useAuth } from '@/features/auth';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/permissions';

/**
 * Checks if the currently authenticated user has the specified permission.
 * @example const canReadFinance = usePermission('finance.read');
 */
export function usePermission(permission: Permission): boolean {
  const { role } = useAuth();
  return hasPermission(role, permission);
}

/**
 * Checks if the currently authenticated user has ANY or ALL of the given permissions.
 */
export function usePermissions(
  permissions: Permission[],
  mode: 'any' | 'all' = 'all'
): boolean {
  const { role } = useAuth();
  if (mode === 'any') {
    return hasAnyPermission(role, permissions);
  }
  return hasAllPermissions(role, permissions);
}
