import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { financeService } from '@/services';
import { Payment, Expense } from '@/types';
import { formatINR } from '@/lib/format';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, PieChart as PieIcon } from 'lucide-react';

interface FinancialChartsWidgetProps {
  currentMonth: string;
}

const CATEGORY_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#059669',
  '#d97706',
  '#dc2626',
  '#0891b2',
  '#4f46e5',
  '#ea580c',
];

export const FinancialChartsWidget: React.FC<FinancialChartsWidgetProps> = ({ currentMonth }) => {
  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ['payments', 'all'],
    queryFn: () => financeService.getPayments(),
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['expenses', 'all'],
    queryFn: () => financeService.getExpenses(),
  });

  // Calculate Last 6 Months (inclusive of current month)
  const sixMonthsData = React.useMemo(() => {
    const months: string[] = [];
    const [yStr, mStr] = currentMonth.split('-');
    let curYear = parseInt(yStr, 10);
    let curMonth = parseInt(mStr, 10);

    for (let i = 5; i >= 0; i--) {
      let targetM = curMonth - i;
      let targetY = curYear;
      while (targetM <= 0) {
        targetM += 12;
        targetY -= 1;
      }
      months.push(`${targetY}-${String(targetM).padStart(2, '0')}`);
    }

    return months.map((m) => {
      const dateObj = new Date(parseInt(m.split('-')[0]), parseInt(m.split('-')[1]) - 1, 1);
      const label = dateObj.toLocaleDateString('en-US', { month: 'short' });

      const rev = payments
        .filter((p) => p.status === 'paid' && (p.month === m || p.date.startsWith(m)))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const exp = expenses
        .filter((e) => e.date.startsWith(m))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      return {
        month: label,
        Revenue: rev,
        Expenses: exp,
        Profit: rev - exp,
      };
    });
  }, [currentMonth, payments, expenses]);

  // Expenses by category this month
  const categoryData = React.useMemo(() => {
    const catMap: Record<string, number> = {};
    const relevantExpenses = expenses.filter((e) => e.date.startsWith(currentMonth));
    const list = relevantExpenses.length > 0 ? relevantExpenses : expenses;

    list.forEach((e) => {
      const cat = e.category ? e.category.charAt(0).toUpperCase() + e.category.slice(1) : 'Other';
      catMap[cat] = (catMap[cat] || 0) + (e.amount || 0);
    });

    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, currentMonth]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Revenue vs Expense Chart (Last 6 Months) */}
      <Card className="border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-control bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Revenue vs Expenses (Last 6 Months)</CardTitle>
              <p className="text-[11px] text-text-muted">Cash received vs operational expenses trend</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sixMonthsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <RechartsTooltip
                  formatter={(val: any) => formatINR(Number(val) || 0)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. Expense by Category Chart */}
      <Card className="border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-control bg-blue-50 text-blue-600">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Expenses by Category</CardTitle>
              <p className="text-[11px] text-text-muted">Spend breakdown for {currentMonth}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-text-muted">
              No expenses recorded for this period.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 h-64 pt-2">
              <div className="w-48 h-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {categoryData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: any) => formatINR(Number(val) || 0)}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend list */}
              <div className="flex-1 max-h-48 overflow-y-auto space-y-1.5 text-xs pr-2">
                {categoryData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                      />
                      <span className="text-text font-medium truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-text tabular-nums">{formatINR(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialChartsWidget;
