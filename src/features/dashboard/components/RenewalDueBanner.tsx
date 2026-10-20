import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { RenewalDueItem } from '../services/dashboardService';
import { Client, BillingCycle } from '@/types';
import { formatCycleDateRange } from '@/lib/cycleUtils';
import { AlertTriangle, RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface RenewalDueBannerProps {
  items: RenewalDueItem[];
  onOpenRenew: (client: Client, cycle: BillingCycle) => void;
}

export const RenewalDueBanner: React.FC<RenewalDueBannerProps> = ({
  items,
  onOpenRenew,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50/80 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-amber-500 text-white shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Billing Cycle Renewal Due ({items.length} client{items.length === 1 ? '' : 's'})
              </h4>
              <p className="text-[11px] text-amber-700">
                Action required: confirm continuation with the same plan or update scope for the upcoming cycle.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const { client, cycle, isExpired, statusLabel } = item;
            return (
              <div
                key={cycle.id}
                className="p-2.5 rounded-control bg-white/90 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isExpired
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {statusLabel}
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-text truncate block">
                      {client.business}{' '}
                      <span className="font-normal text-text-muted">({client.name})</span>
                    </span>
                    <span className="text-[11px] text-text-muted flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-text-subtle" />
                      Cycle {cycle.cycleNumber}: {formatCycleDateRange(cycle.startDate, cycle.endDate)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    className="h-7 text-xs px-3 bg-amber-600 hover:bg-amber-700 text-white border-none"
                    leftIcon={<RefreshCw className="w-3 h-3" />}
                    onClick={() => onOpenRenew(client, cycle)}
                  >
                    Renew Now
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RenewalDueBanner;
