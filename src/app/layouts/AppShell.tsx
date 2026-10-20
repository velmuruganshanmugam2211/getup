import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { NotificationDrawer } from '@/components/layout/NotificationDrawer';
import { useNotificationScanner } from '@/hooks/useNotificationScanner';

export const AppShell: React.FC = () => {
  useNotificationScanner();

  return (
    <div className="flex min-h-screen bg-background text-text">
      {/* Sidebar (desktop and mobile sheet) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-content w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Interactive Modals */}
      <CommandPalette />
      <NotificationDrawer />
    </div>
  );
};
