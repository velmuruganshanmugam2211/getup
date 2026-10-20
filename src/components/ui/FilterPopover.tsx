import React, { useState, useRef, useEffect } from 'react';
import { Filter, X } from 'lucide-react';

export interface ActiveFilterChip {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

interface FilterPopoverProps {
  activeCount?: number;
  children: React.ReactNode;
  onClearAll?: () => void;
}

export const FilterPopover: React.FC<FilterPopoverProps> = ({
  activeCount = 0,
  children,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-control border transition-colors ${
          activeCount > 0
            ? 'bg-primary-50 text-primary-700 border-primary-300 shadow-sm'
            : 'bg-surface text-text-muted hover:text-text border-border hover:bg-surface-subtle'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] flex items-center justify-center font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-72 bg-surface rounded-card border border-border shadow-modal p-4 z-40 space-y-3.5 animate-in fade-in-50 zoom-in-95">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-bold text-text">Refine Results</span>
            {activeCount > 0 && onClearAll && (
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setIsOpen(false);
                }}
                className="text-[11px] text-primary-600 hover:text-primary-700 font-semibold"
              >
                Reset all
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">{children}</div>

          <div className="pt-2 border-t border-border flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-primary-600 text-white font-semibold text-xs rounded-control hover:bg-primary-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ActiveFilterChipsRow: React.FC<{
  chips: ActiveFilterChip[];
  onClearAll?: () => void;
}> = ({ chips, onClearAll }) => {
  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap pt-1">
      <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider mr-0.5">
        Active:
      </span>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-800 text-[11px] font-semibold rounded-pill border border-primary-200"
        >
          <span>
            {chip.label}: <span className="font-normal">{chip.value}</span>
          </span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="hover:text-primary-950 p-0.5 rounded-full"
            aria-label={`Remove filter ${chip.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {chips.length > 1 && onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] text-text-muted hover:text-text font-semibold underline ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
};
