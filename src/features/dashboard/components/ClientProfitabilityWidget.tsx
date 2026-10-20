import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { clientService, financeService } from '@/services';
import { Client, Payment, Expense } from '@/types';
import { computeClientFinancials } from '@/lib/selectors';
import { formatINR } from '@/lib/format';
import { TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ClientProfitabilityWidgetProps {
  currentMonth: string;
}

export const ClientProfitabilityWidget: React.FC<ClientProfitabilityWidgetProps> = ({ currentMonth }) => {
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients', 'list'],
    queryFn: () => clientService.getClients(),
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ['payments', 'all'],
    queryFn: () => financeService.getPayments(),
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['expenses', 'all'],
    queryFn: () => financeService.getExpenses(),
  });

  const rankedClients = React.useMemo(() => {
    return clients
      .map((client) => {
        const financials = computeClientFinancials(client, payments, expenses, currentMonth);
        return {
          client,
          financials,
        };
      })
      .sort((a, b) => b.financials.margin - a.financials.margin);
  }, [clients, payments, expenses, currentMonth]);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-control bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Client Profitability Ranking</CardTitle>
            <p className="text-[11px] text-text-muted">Best and worst operating margins across accounts</p>
          </div>
        </div>
        <Link to="/finance" className="text-xs text-primary-600 hover:underline font-semibold">
          Finance Dossier →
        </Link>
      </CardHeader>
      <CardContent className="pt-4">
        {rankedClients.length === 0 ? (
          <p className="text-xs text-text-muted py-6 text-center">No client records available.</p>
        ) : (
          <div className="divide-y divide-border">
            {rankedClients.map(({ client, financials }, idx) => {
              const isTop = idx < 2 && financials.margin > 40;
              const isLow = financials.margin < 20 || financials.profit < 0;

              return (
                <div key={client.id} className="py-2.5 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-bold text-text-muted text-[11px] w-4">#{idx + 1}</span>
                    <div className="min-w-0">
                      <Link
                        to={`/clients/${client.id}`}
                        className="font-bold text-text hover:text-primary-600 truncate block transition-colors"
                      >
                        {client.name}
                      </Link>
                      <p className="text-[11px] text-text-muted">
                        Received {formatINR(financials.received)} · Spent {formatINR(financials.clientExpenses)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1">
                      {isTop && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      {isLow && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                      <span
                        className={`font-bold tabular-nums text-xs px-2 py-0.5 rounded-pill border ${
                          financials.margin >= 40
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : financials.margin >= 20
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {financials.margin}% margin
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      Net profit: {formatINR(financials.profit)}
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

export default ClientProfitabilityWidget;
