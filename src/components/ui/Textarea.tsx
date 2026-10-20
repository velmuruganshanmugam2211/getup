import React from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  isInvalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, isInvalid = false, disabled, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        aria-invalid={isInvalid}
        className={cn(
          'w-full px-3 py-2 bg-surface text-text text-sm rounded-control border border-border transition-colors duration-150',
          'placeholder:text-text-subtle',
          'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600',
          'disabled:bg-surface-subtle disabled:text-text-muted disabled:cursor-not-allowed disabled:opacity-60',
          isInvalid &&
            'border-semantic-danger focus:ring-semantic-danger focus:border-semantic-danger text-semantic-danger',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
