import React from 'react';
import { Navigate } from 'react-router-dom';
import { Permission } from '@/types';
import { usePermission } from '@/hooks/usePermission';

export interface RoleRouteProps {
  permission: Permission;
  children: React.ReactNode;
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ permission, children }) => {
  const isAllowed = usePermission(permission);

  if (!isAllowed) {
    return <Navigate to="/tasks" replace />;
  }

  return <>{children}</>;
};
