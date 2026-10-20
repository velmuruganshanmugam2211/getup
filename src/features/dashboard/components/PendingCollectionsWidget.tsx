import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PendingClientItem } from '../services/dashboardService';
import { formatINR } from '@/lib/format';
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface PendingCollectionsWidgetProps {
  pendingClients: PendingClientItem[];
}

export const PendingCollectionsWidget: React.FC<PendingCollectionsWidgetProps> = ({ pendingClients }) => {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <CardTitle className="text-sm font-bold">Pending Collections by Client</CardTitle>
        </div>
        <Link to="/finance" className="text-xs text-primary-600 hover:underline font-medium">
          Manage Finance →
        </Link>
      </CardHeader>
      <CardContent>
        {pendingClients.length === 0 ? (
          <div className="py-6 text-center">
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-text">All accounts fully collected!</p>
            <p className="text-[11px] text-text-muted mt-0.5">No pending retainer balances from any active clients.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {pendingClients.slice(0, 5).map(({ client, pending, expected, received, isOverdue }) => (
              <div
                key={client.id}
                className={`py-2.5 px-2 rounded -mx-2 first:pt-1.5 last:pb-1.5 flex items-center justify-between gap-3 ${
                  isOverdue ? 'bg-rose-50/60 border border-rose-200/80 my-1' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/clients/${client.id}`}
                      className="text-xs font-bold text-text hover:text-primary-600 truncate block"
                    >
                      {client.business}
                    </Link>
                    {isOverdue && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded shrink-0">
                        Overdue
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-text-muted">
                    Billed {formatINR(expected)} · Paid {formatINR(received)}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold font-mono text-rose-600 block">
                    {formatINR(pending)}
                  </span>
                  <Link
                    to={`/clients/${client.id}?tab=payments`}
                    className="text-[10px] text-primary-600 hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    Collect <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
