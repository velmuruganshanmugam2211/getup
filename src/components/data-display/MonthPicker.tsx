import React from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { formatMonth } from '@/lib/format';

export interface MonthPickerProps {
  month: string; // e.g. "2026-10"
  onMonthChange: (month: string) => void;
  className?: string;
}

export const MonthPicker: React.FC<MonthPickerProps> = ({
  month,
  onMonthChange,
  className,
}) => {
  const handlePrev = () => {
    const [yearStr, monthStr] = month.split('-');
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    const newMonth = `${y}-${m.toString().padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  const handleNext = () => {
    const [yearStr, monthStr] = month.split('-');
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    const newMonth = `${y}-${m.toString().padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  const handleToday = () => {
    const now = new Date();
    const current = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    onMonthChange(current);
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5 bg-surface border border-border p-1 rounded-control shadow-sm', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrev}
        aria-label="Previous month"
        className="h-7 w-7 p-0"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-text tabular-nums select-none min-w-[110px] justify-center">
        <Calendar className="w-3.5 h-3.5 text-text-muted" />
        <span>{formatMonth(month)}</span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleNext}
        aria-label="Next month"
        className="h-7 w-7 p-0"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleToday}
        className="h-7 text-[11px] px-2 py-0 ml-1 text-text-muted hover:text-text"
      >
        This Month
      </Button>
    </div>
  );
};
