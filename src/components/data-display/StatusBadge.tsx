import React from 'react';
import { Badge, BadgeProps } from '@/components/ui/Badge';

export type EntityStatus =
  | 'paid'
  | 'approved'
  | 'delivered'
  | 'done'
  | 'active'
  | 'in_progress'
  | 'scheduled'
  | 'review'
  | 'sent'
  | 'partial'
  | 'changes_requested'
  | 'due_soon'
  | 'pending'
  | 'overdue'
  | 'missed'
  | 'cancelled'
  | 'draft'
  | 'planned'
  | 'paused'
  | 'lead'
  | 'churned'
  | string;

export interface StatusBadgeProps {
  status: EntityStatus;
  size?: 'sm' | 'md';
  className?: string;
  customLabel?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className,
  customLabel,
}) => {
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_');

  let variant: BadgeProps['variant'] = 'slate';

  switch (normalized) {
    // Success: paid, approved, delivered, done, active
    case 'paid':
    case 'approved':
    case 'delivered':
    case 'done':
    case 'active':
      variant = 'success';
      break;

    // Info: in progress, scheduled, review, sent
    case 'in_progress':
    case 'scheduled':
    case 'review':
    case 'sent':
      variant = 'info';
      break;

    // Warning: partial, changes requested, due soon, pending
    case 'partial':
    case 'changes_requested':
    case 'due_soon':
    case 'pending':
      variant = 'warning';
      break;

    // Danger: overdue, missed, cancelled, churned
    case 'overdue':
    case 'missed':
    case 'cancelled':
    case 'churned':
      variant = 'danger';
      break;

    // Slate: draft, planned, paused, lead
    case 'draft':
    case 'planned':
    case 'paused':
    case 'lead':
    default:
      variant = 'slate';
      break;
  }

  // Label formatting
  const formatLabel = (str: string) => {
    return str
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const label = customLabel || formatLabel(status);

  return (
    <Badge variant={variant} size={size} hasDot className={className}>
      {label}
    </Badge>
  );
};
