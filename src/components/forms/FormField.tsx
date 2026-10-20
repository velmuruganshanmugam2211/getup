import React from 'react';
import { cn } from '@/lib/cn';

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className,
  children,
}) => {
  return (
    <div className={cn('flex flex-col space-y-1.5 w-full', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-semibold text-text flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-semantic-danger">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-[11px] text-text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-[11px] font-medium text-semantic-danger flex items-center gap-1">
          {error}
        </p>
      )}
    </div>
  );
};
