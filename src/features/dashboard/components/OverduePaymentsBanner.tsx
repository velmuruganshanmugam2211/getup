import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Payment } from '@/types';
import { formatINR } from '@/lib/format';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface OverduePaymentsBannerProps {
  overduePayments: Payment[];
}

export const OverduePaymentsBanner: React.FC<OverduePaymentsBannerProps> = ({
  overduePayments,
}) => {
  if (overduePayments.length === 0) return null;

  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card className="border-semantic-danger/40 bg-[#FEF2F2] p-4 shadow-sm">
      <CardContent className="p-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-semantic-danger text-white shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-semantic-danger">
              Payment Alert: {formatINR(totalOverdue)} Overdue from {overduePayments.length} client(s)
            </h4>
            <p className="text-[11px] text-text-muted mt-0.5">
              Review overdue payments in Finance and follow up with clients.
            </p>
          </div>
        </div>

        <Link to="/finance" className="shrink-0">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-semantic-danger hover:underline">
            View Finance <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </CardContent>
    </Card>
  );
};
