import React from 'react';
import { cn } from '@/lib/cn';

export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number | null;
  onChange: (value: number) => void;
  isInvalid?: boolean;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, value, onChange, isInvalid = false, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, '');
      const parsed = raw === '' ? 0 : parseInt(raw, 10);
      onChange(parsed);
    };

    const displayValue = !value || value === 0 ? '' : value.toLocaleString('en-IN');

    return (
      <div className="relative flex items-center w-full">
        <span className="absolute left-3 font-semibold text-text-muted pointer-events-none select-none text-sm">
          ₹
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={isInvalid}
          className={cn(
            'w-full h-10 pl-8 pr-3 py-2 bg-surface text-text text-sm rounded-control border border-border tabular-nums font-medium transition-colors duration-150',
            'placeholder:text-text-subtle',
            'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600',
            'disabled:bg-surface-subtle disabled:text-text-muted disabled:cursor-not-allowed disabled:opacity-60',
            isInvalid && 'border-semantic-danger focus:ring-semantic-danger text-semantic-danger',
            className
          )}
          placeholder="0"
          {...props}
        />
      </div>
    );
  }
);

MoneyInput.displayName = 'MoneyInput';
