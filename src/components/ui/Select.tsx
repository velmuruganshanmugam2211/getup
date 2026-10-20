import React from 'react';
import { cn } from '@/lib/cn';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  isInvalid?: boolean;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, isInvalid = false, placeholder, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          disabled={disabled}
          aria-invalid={isInvalid}
          className={cn(
            'w-full h-10 pl-3 pr-9 py-2 bg-surface text-text text-sm rounded-control border border-border appearance-none transition-colors duration-150 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600',
            'disabled:bg-surface-subtle disabled:text-text-muted disabled:cursor-not-allowed disabled:opacity-60',
            isInvalid && 'border-semantic-danger focus:ring-semantic-danger text-semantic-danger',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    );
  }
);

Select.displayName = 'Select';
