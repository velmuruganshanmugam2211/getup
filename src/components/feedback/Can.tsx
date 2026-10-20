import React from 'react';
import { Permission } from '@/types';
import { usePermission, usePermissions } from '@/hooks/usePermission';

export interface CanProps {
  permission?: Permission;
  permissions?: Permission[];
  mode?: 'any' | 'all';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Declarative component for conditional rendering based on user role permissions.
 *
 * @example
 * <Can permission="finance.read" fallback={<p>No permission to view finance</p>}>
 *   <FinanceOverview />
 * </Can>
 */
export const Can: React.FC<CanProps> = ({
  permission,
  permissions,
  mode = 'all',
  fallback = null,
  children,
}) => {
  const hasSingle = usePermission(permission || 'dashboard.full');
  const hasMultiple = usePermissions(permissions || [], mode);

  const isAllowed = permissions ? hasMultiple : permission ? hasSingle : true;

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
