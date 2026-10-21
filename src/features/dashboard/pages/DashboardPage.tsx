import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { InlineMonthPicker } from '@/components/ui/InlineMonthPicker';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useMonthRange } from '@/hooks/useMonthRange';
import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardStats } from '../components/DashboardStats';
import { PackageUsageMeter } from '../components/PackageUsageMeter';
import { OverduePaymentsBanner } from '../components/OverduePaymentsBanner';
import { RenewalDueBanner } from '../components/RenewalDueBanner';
import { PendingCollectionsWidget } from '../components/PendingCollectionsWidget';
import { TopExpensesWidget } from '../components/TopExpensesWidget';
import { TodayAndTomorrowWidget } from '../components/TodayAndTomorrowWidget';
import { FinancialChartsWidget } from '../components/FinancialChartsWidget';
import { ClientProfitabilityWidget } from '../components/ClientProfitabilityWidget';
import { WorkerProductivityWidget } from '../components/WorkerProductivityWidget';
import { TasksDueWidget } from '../components/TasksDueWidget';
import { ActivityFeedWidget } from '../components/ActivityFeedWidget';
import { CallsDashboardWidget } from '../components/CallsDashboardWidget';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RenewCycleModal } from '@/features/clients/components/RenewCycleModal';
import { Client, BillingCycle } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

export const DashboardPage: React.FC = () => {
  const { month, setMonth, formattedMonth } = useMonthRange('2026-10');
  const { data, isLoading, isError, refetch } = useDashboardData(month);
  const queryClient = useQueryClient();

  // Renew modal state
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewClient, setRenewClient] = useState<Client | null>(null);
  const [renewCycle, setRenewCycle] = useState<BillingCycle | null>(null);

  const handleOpenRenew = (client: Client, cycle: BillingCycle) => {
    setRenewClient(client);
    setRenewCycle(cycle);
    setRenewModalOpen(true);
  };

  const handleRenewSuccess = () => {
    queryClient.invalidateQueries();
    refetch();
  };

  if (isLoading) {
    return <LoadingState message="Loading agency dashboard..." fullPage />;
  }

  if (isError || !data) {
    return (
      <div className="p-8 text-center bg-surface border border-border rounded-card my-8">
        <AlertCircle className="w-8 h-8 text-semantic-danger mx-auto mb-2" />
        <h3 className="text-sm font-bold text-text">Failed to load dashboard metrics</h3>
        <p className="text-xs text-text-muted mt-1 mb-4">Please try refreshing the metrics.</p>
        <Button variant="primary" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Title and Slim Inline Month Picker */}
      <PageHeader
        title="Agency Control Dashboard"
        subtitle={`Executive control panel for clients, deliverables, and finance — ${formattedMonth}`}
        actions={
          <div className="flex items-center gap-2">
            <InlineMonthPicker month={month} onChange={setMonth} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-8 px-2.5 text-xs text-text-muted hover:text-text"
              title="Refresh dashboard metrics"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        }
      />

      {/* Renewal Due Alert Banner */}
      {data.renewalDueClients && data.renewalDueClients.length > 0 && (
        <RenewalDueBanner items={data.renewalDueClients} onOpenRenew={handleOpenRenew} />
      )}

      {/* Overdue Payments Alert */}
      <OverduePaymentsBanner overduePayments={data.overduePayments} />

      {/* 8-Metric KPI Row */}
      <DashboardStats data={data} />

      {/* Calls Today, Follow-ups Due & 7-Day Trend Widget (Super Admin Only) */}
      <CallsDashboardWidget />

      {/* Grid Row 1: Today/Tomorrow Meetings & Notes + Client Package Delivery Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodayAndTomorrowWidget />
        <PackageUsageMeter clientUsage={data.clientUsage} />
      </div>

      {/* Grid Row 2: 6-Month Revenue vs Expense & Expense by Category */}
      <FinancialChartsWidget currentMonth={month} />

      {/* Grid Row 3: Pending Collections (Top 5, overdue highlighted) & Top Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingCollectionsWidget pendingClients={data.pendingClients} />
        <TopExpensesWidget topExpenses={data.topExpenses} />
      </div>

      {/* Grid Row 4: Client Profitability Ranking (Best/Worst) & Worker Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClientProfitabilityWidget currentMonth={month} />
        <WorkerProductivityWidget currentMonth={month} />
      </div>

      {/* Grid Row 5: Tasks Due & Overdue + Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TasksDueWidget />
        <ActivityFeedWidget />
      </div>

      {/* Renew Cycle Modal */}
      {renewClient && renewCycle && (
        <RenewCycleModal
          open={renewModalOpen}
          onOpenChange={setRenewModalOpen}
          client={renewClient}
          cycle={renewCycle}
          onSuccess={handleRenewSuccess}
        />
      )}
    </div>
  );
};
