import React from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isInvalid?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, isInvalid = false, leftIcon, rightIcon, disabled, type = 'text', ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-text-muted">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          aria-invalid={isInvalid}
          className={cn(
            'w-full h-10 px-3 py-2 bg-surface text-text text-sm rounded-control border border-border transition-colors duration-150',
            'placeholder:text-text-subtle',
            'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600',
            'disabled:bg-surface-subtle disabled:text-text-muted disabled:cursor-not-allowed disabled:opacity-60',
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            isInvalid &&
              'border-semantic-danger focus:ring-semantic-danger focus:border-semantic-danger text-semantic-danger',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center pointer-events-none text-text-muted">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
