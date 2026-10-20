import React from 'react';
import { StatCard } from '@/components/data-display/StatCard';
import { formatINR } from '@/lib/format';
import { DashboardSummary } from '../services/dashboardService';
import { Building2, Video, Wallet, TrendingUp, Users, Receipt, DollarSign, AlertCircle } from 'lucide-react';

export interface DashboardStatsProps {
  data: DashboardSummary;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
      {/* 1. Total Clients */}
      <StatCard
        title="Total Clients"
        value={data.totalClientsCount}
        subtitle={`${data.onboardedThisMonthCount} this month`}
        icon={<Building2 className="w-4 h-4 text-primary-600" />}
        className="p-3.5"
      />

      {/* 2. Active Clients */}
      <StatCard
        title="Active Clients"
        value={data.activeClientsCount}
        subtitle={`${data.totalClientsCount - data.activeClientsCount} inactive`}
        icon={<Users className="w-4 h-4 text-emerald-600" />}
        className="p-3.5"
      />

      {/* 3. Monthly Retainer */}
      <StatCard
        title="Retainer"
        value={formatINR(data.totalMonthlyRetainer)}
        subtitle="Active total"
        icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
        className="p-3.5"
      />

      {/* 4. Received */}
      <StatCard
        title="Received"
        value={formatINR(data.moneyReceived)}
        subtitle="Collections"
        icon={<Wallet className="w-4 h-4 text-emerald-600" />}
        className="p-3.5"
      />

      {/* 5. Pending to Collect */}
      <StatCard
        title="Pending"
        value={formatINR(data.moneyPending)}
        subtitle={data.moneyPending > 0 ? 'To collect' : 'Settled'}
        icon={<AlertCircle className={`w-4 h-4 ${data.moneyPending > 0 ? 'text-rose-500' : 'text-slate-400'}`} />}
        className="p-3.5"
      />

      {/* 6. Expenses */}
      <StatCard
        title="Expenses"
        value={formatINR(data.totalExpenses)}
        subtitle="Total spending"
        icon={<Receipt className="w-4 h-4 text-amber-500" />}
        className="p-3.5"
      />

      {/* 7. Net Profit */}
      <StatCard
        title="Net Profit"
        value={formatINR(data.profit)}
        subtitle={data.moneyReceived > 0 ? `${Math.round((data.profit / data.moneyReceived) * 100)}% margin` : '0% margin'}
        icon={<DollarSign className={`w-4 h-4 ${data.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />}
        className="p-3.5"
      />

      {/* 8. Deliverables Done vs Promised */}
      <StatCard
        title="Deliverables"
        value={`${data.totalDelivered} / ${data.totalDeliverablesPromised}`}
        subtitle={`${data.deliverablesPercent}% overall`}
        icon={<Video className="w-4 h-4 text-purple-600" />}
        className="p-3.5"
      />
    </div>
  );
};
