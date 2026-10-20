import React from 'react';
import { cn } from '@/lib/cn';
import { Search, X } from 'lucide-react';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onChange, onClear, placeholder = 'Search...', disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <Search className="w-4 h-4 text-text-muted absolute left-3 pointer-events-none" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'w-full h-10 pl-9 pr-9 py-2 bg-surface text-text text-sm rounded-control border border-border transition-colors duration-150',
            'placeholder:text-text-subtle',
            'focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600',
            'disabled:bg-surface-subtle disabled:text-text-muted disabled:cursor-not-allowed disabled:opacity-60',
            className
          )}
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 p-1 rounded-control text-text-muted hover:text-text hover:bg-surface-subtle transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
