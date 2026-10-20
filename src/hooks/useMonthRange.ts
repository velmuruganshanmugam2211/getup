import { useState, useMemo, useCallback } from 'react';
import { format, addMonths, subMonths, parseISO, isSameMonth } from 'date-fns';
import { formatMonth } from '@/lib/format';

export interface UseMonthRangeReturn {
  month: string;
  setMonth: (month: string) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  formattedMonth: string;
  isCurrentMonth: boolean;
  date: Date;
}

export function useMonthRange(initialMonth?: string): UseMonthRangeReturn {
  const [month, setMonth] = useState<string>(() => {
    if (initialMonth) return initialMonth;
    return format(new Date(), 'yyyy-MM');
  });

  const date = useMemo(() => {
    try {
      return parseISO(`${month}-01`);
    } catch {
      return new Date();
    }
  }, [month]);

  const formattedMonth = useMemo(() => formatMonth(month), [month]);

  const isCurrentMonth = useMemo(() => {
    return isSameMonth(date, new Date());
  }, [date]);

  const nextMonth = useCallback(() => {
    setMonth((curr) => {
      const nextDate = addMonths(parseISO(`${curr}-01`), 1);
      return format(nextDate, 'yyyy-MM');
    });
  }, []);

  const prevMonth = useCallback(() => {
    setMonth((curr) => {
      const prevDate = subMonths(parseISO(`${curr}-01`), 1);
      return format(prevDate, 'yyyy-MM');
    });
  }, []);

  return {
    month,
    setMonth,
    nextMonth,
    prevMonth,
    formattedMonth,
    isCurrentMonth,
    date,
  };
}
