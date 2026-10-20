import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Expense } from '@/types';
import { formatINR, formatDate } from '@/lib/format';
import { Receipt, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clientService } from '@/services';

export interface TopExpensesWidgetProps {
  topExpenses: Expense[];
}

export const TopExpensesWidget: React.FC<TopExpensesWidgetProps> = ({ topExpenses }) => {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', 'list'],
    queryFn: () => clientService.getClients(),
  });

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    return clients.find((c) => c.id === clientId)?.business || 'Client';
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-amber-500" />
          <CardTitle className="text-sm font-bold">Top Expenses This Month</CardTitle>
        </div>
        <Link to="/finance" className="text-xs text-primary-600 hover:underline font-medium">
          View All Expenses →
        </Link>
      </CardHeader>
      <CardContent>
        {topExpenses.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-text-muted">No expenses recorded yet.</p>
            <Link
              to="/finance"
              className="text-xs text-primary-600 hover:underline font-semibold mt-1 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Log first shoot or agency expense
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {topExpenses.slice(0, 5).map((exp) => {
              const clientName = getClientName(exp.clientId);

              return (
                <div key={exp.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-text truncate max-w-[180px]">
                        {exp.note}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          exp.type === 'client'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {exp.type === 'client' ? (clientName || 'Client') : 'Agency General'}
                      </span>
                    </div>
                    <span className="text-[11px] text-text-muted capitalize">
                      {exp.category} · {formatDate(exp.date)}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold font-mono text-text block">
                      {formatINR(exp.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
