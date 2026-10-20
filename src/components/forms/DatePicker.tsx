import React from 'react';
import { cn } from '@/lib/cn';
import { Calendar as CalendarIcon } from 'lucide-react';

export interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  isInvalid?: boolean;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, isInvalid = false, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <input
          ref={ref}
          type="date"
          disabled={disabled}
          aria-invalid={isInvalid}
          className={cn(
            'w-full h-10 pl-3 pr-10 py-2 bg-surface text-text text-sm rounded-control border border-border transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600',
            'disabled:bg-surface-subtle disabled:text-text-muted disabled:cursor-not-allowed disabled:opacity-60',
            isInvalid && 'border-semantic-danger focus:ring-semantic-danger text-semantic-danger',
            className
          )}
          {...props}
        />
        <CalendarIcon className="w-4 h-4 text-text-muted absolute right-3 pointer-events-none" />
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
