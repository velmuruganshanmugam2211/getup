import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { AuthLayout } from '../layouts/AuthLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useAuth } from '@/features/auth';

// Lazy-loaded routes for code splitting
const LoginPage = lazy(() => import('@/features/auth').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() =>
  import('@/features/dashboard').then((m) => ({ default: m.DashboardPage }))
);
const ClientsPage = lazy(() =>
  import('@/features/clients').then((m) => ({ default: m.ClientsPage }))
);
const ClientDetailPage = lazy(() =>
  import('@/features/clients').then((m) => ({ default: m.ClientDetailPage }))
);
const TasksPage = lazy(() => import('@/features/tasks').then((m) => ({ default: m.TasksPage })));
const CalendarPage = lazy(() =>
  import('@/features/calendar').then((m) => ({ default: m.CalendarPage }))
);
const FinancePage = lazy(() =>
  import('@/features/finance').then((m) => ({ default: m.FinancePage }))
);
const TeamPage = lazy(() => import('@/features/team').then((m) => ({ default: m.TeamPage })));
const ReportsPage = lazy(() =>
  import('@/features/reports').then((m) => ({ default: m.ReportsPage }))
);
const CallsPage = lazy(() =>
  import('@/features/calls').then((m) => ({ default: m.CallsPage }))
);
const SettingsPage = lazy(() =>
  import('@/features/settings').then((m) => ({ default: m.SettingsPage }))
);

const SuspenseLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<LoadingState fullPage message="Loading module..." />}>
    {children}
  </Suspense>
);

const IndexRedirect: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'worker') {
    return <Navigate to="/tasks" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export const router = createBrowserRouter([
  // Public Auth Route
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: (
          <SuspenseLoader>
            <LoginPage />
          </SuspenseLoader>
        ),
      },
    ],
  },

  // Protected App Shell Routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <IndexRedirect />,
      },
      {
        path: 'dashboard',
        element: (
          <RoleRoute permission="dashboard.full">
            <SuspenseLoader>
              <DashboardPage />
            </SuspenseLoader>
          </RoleRoute>
        ),
      },
      {
        path: 'clients',
        element: (
          <RoleRoute permission="clients.read">
            <SuspenseLoader>
              <ClientsPage />
            </SuspenseLoader>
          </RoleRoute>
        ),
      },
      {
        path: 'clients/:id',
        element: (
          <RoleRoute permission="clients.read">
            <SuspenseLoader>
              <ClientDetailPage />
            </SuspenseLoader>
          </RoleRoute>
        ),
      },
      {
        path: 'tasks',
        element: (
          <RoleRoute permission="tasks.read">
            <SuspenseLoader>
              <TasksPage />
            </SuspenseLoader>
          </RoleRoute>
        ),
      },
      {
        path: 'calendar',
        element: (
          <RoleRoute permission="calendar.read">
            <SuspenseLoader>
              <CalendarPage />
            </SuspenseLoader>
          </RoleRoute>
        ),
      },
      {
        path: 'finance',
        element: (
          <RoleRoute permission="finance.read">
            <SuspenseLoader>
              <FinancePage />
            </SuspenseLoader>
          </RoleRoute>
        ),
      },
      {
        path: 'finance/payments',
        element: (
          <RoleRoute permission="finance.read">
            <SuspenseLoader>
              <FinancePage />
            </SuspenseLoader>
          </RoleRoute>
        ),
      },
      {
        path: 'finance/expenses',
        element: (
          <RoleRoute permission="finance.read">
            <SuspenseLoader>
              <FinancePage />
            </SuspenseLoader>
          </RoleRoute>
        ),
      },
      {
        path: 'team',
        element: (
          <RoleRoute permission="team.read">
            <SuspenseLoader>
              <TeamPage />
            </SuspenseLoader>
          </RoleRoute>
        ),
      },
      {
        path: 'calls',
        element: (
          <RoleRoute permission="calls.read">
            <SuspenseLoader>
              <CallsPage />
            </SuspenseLoader>
          </RoleRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <RoleRoute permission="reports.read">
            <SuspenseLoader>
              <ReportsPage />
            </SuspenseLoader>
          </RoleRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <RoleRoute permission="settings.read">
            <SuspenseLoader>
              <SettingsPage />
            </SuspenseLoader>
          </RoleRoute>
        ),
      },
      {
        path: '*',
        element: <IndexRedirect />,
      },
    ],
  },
]);
