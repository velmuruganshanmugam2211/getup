import React from 'react';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
  fullPage?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  className,
  fullPage = false,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-8 text-center text-text-muted',
        fullPage && 'min-h-[50vh] w-full',
        className
      )}
    >
      <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      <span className="text-xs font-medium text-text-muted">{message}</span>
    </div>
  );
};
