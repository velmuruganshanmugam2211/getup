import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface InlineMonthPickerProps {
  value?: string; // "YYYY-MM"
  month?: string;
  onChange: (value: string) => void;
  className?: string;
}

export const InlineMonthPicker: React.FC<InlineMonthPickerProps> = ({
  value,
  month: monthProp,
  onChange,
  className = '',
}) => {
  const activeValue = value || monthProp || '2026-10';
  // Parse year and month
  const [yearStr, monthStr] = activeValue.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  const dateObj = new Date(year, month - 1, 1);
  const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const handlePrev = () => {
    let newMonth = month - 1;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    onChange(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNext = () => {
    let newMonth = month + 1;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    onChange(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  return (
    <div className={`inline-flex items-center gap-1 bg-surface border border-border rounded-control px-1.5 py-1 select-none ${className}`}>
      <button
        type="button"
        onClick={handlePrev}
        className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-subtle transition-colors"
        aria-label="Previous Month"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <span className="text-xs font-bold text-text px-1 min-w-[72px] text-center tabular-nums">
        {formatted}
      </span>
      <button
        type="button"
        onClick={handleNext}
        className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-subtle transition-colors"
        aria-label="Next Month"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
