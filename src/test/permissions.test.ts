import { describe, it, expect } from 'vitest';
import { hasPermission } from '@/lib/permissions';
import { Role } from '@/types';

describe('Role Permission Enforcement Matrix (2 Roles: Super Admin & Worker)', () => {
  describe('Super Admin Role', () => {
    const role: Role = 'super_admin';

    it('has full access including dashboard, clients, calendar, finance, team, reports, and settings', () => {
      expect(hasPermission(role, 'dashboard.full')).toBe(true);
      expect(hasPermission(role, 'clients.read')).toBe(true);
      expect(hasPermission(role, 'clients.write')).toBe(true);
      expect(hasPermission(role, 'calendar.read')).toBe(true);
      expect(hasPermission(role, 'calendar.write')).toBe(true);
      expect(hasPermission(role, 'finance.read')).toBe(true);
      expect(hasPermission(role, 'finance.write')).toBe(true);
      expect(hasPermission(role, 'finance.salary')).toBe(true);
      expect(hasPermission(role, 'tasks.read')).toBe(true);
      expect(hasPermission(role, 'tasks.write')).toBe(true);
      expect(hasPermission(role, 'team.read')).toBe(true);
      expect(hasPermission(role, 'team.write')).toBe(true);
      expect(hasPermission(role, 'reports.read')).toBe(true);
      expect(hasPermission(role, 'settings.read')).toBe(true);
      expect(hasPermission(role, 'settings.write')).toBe(true);
    });
  });

  describe('Worker Role', () => {
    const role: Role = 'worker';

    it('has tasks permissions only', () => {
      expect(hasPermission(role, 'tasks.read')).toBe(true);
      expect(hasPermission(role, 'tasks.write')).toBe(true);
    });

    it('is strictly forbidden from dashboard, clients, calendar, finance, settings, team, and reports', () => {
      expect(hasPermission(role, 'dashboard.full')).toBe(false);
      expect(hasPermission(role, 'dashboard.worker')).toBe(false);
      expect(hasPermission(role, 'clients.read')).toBe(false);
      expect(hasPermission(role, 'clients.write')).toBe(false);
      expect(hasPermission(role, 'calendar.read')).toBe(false);
      expect(hasPermission(role, 'calendar.write')).toBe(false);
      expect(hasPermission(role, 'finance.read')).toBe(false);
      expect(hasPermission(role, 'finance.write')).toBe(false);
      expect(hasPermission(role, 'finance.salary')).toBe(false);
      expect(hasPermission(role, 'team.read')).toBe(false);
      expect(hasPermission(role, 'team.write')).toBe(false);
      expect(hasPermission(role, 'reports.read')).toBe(false);
      expect(hasPermission(role, 'settings.read')).toBe(false);
      expect(hasPermission(role, 'settings.write')).toBe(false);
    });
  });
});
