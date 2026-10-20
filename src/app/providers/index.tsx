import React from 'react';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from '@/features/auth';
import { ToastProvider } from '@/components/feedback/Toast';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
};
