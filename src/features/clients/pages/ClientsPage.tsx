import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/data-display/StatCard';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/Modal';
import { FilterPopover, ActiveFilterChipsRow } from '@/components/ui/FilterPopover';
import { AddClientDrawer } from '../components/AddClientDrawer';
import { useClients, useDeleteClient } from '../hooks/useClients';
import { useQuery } from '@tanstack/react-query';
import { financeService, deliverableService } from '@/services';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useToast } from '@/components/feedback/Toast';
import { Can } from '@/components/feedback/Can';
import { Client, Payment, Expense, Deliverable } from '@/types';
import { formatINR, formatDate } from '@/lib/format';
import {
  computeClientFinancials,
  computeClientDeliverables,
  computeAgencyMetrics,
  ClientFinancialMetrics,
  ClientDeliverablesMetrics,
} from '@/lib/selectors';
import {
  Building2,
  Wallet,
  Video,
  CheckCircle2,
  AlertCircle,
  Plus,
  Mail,
  ExternalLink,
  Edit2,
  Trash2,
  Search,
  LayoutGrid,
  Table as TableIcon,
  MoreVertical,
  ArrowUpDown,
  TrendingUp,
  Receipt,
  Download,
} from 'lucide-react';
import { createPdfDoc, addHeader, addTable, savePdf, exportToCsv } from '@/utils/pdf';

interface ClientItemWithMetrics {
  client: Client;
  financials: ClientFinancialMetrics;
  deliverables: ClientDeliverablesMetrics;
}

export const ClientsPage: React.FC = () => {
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const deleteClientMutation = useDeleteClient();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const addDrawer = useDisclosure();
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // View state & filters
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'fee' | 'pending' | 'progress' | 'onboarded'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Shared data queries
  const { data: allPayments = [] } = useQuery<Payment[]>({
    queryKey: ['finance', 'payments'],
    queryFn: () => financeService.getPayments({}),
  });

  const { data: allExpenses = [] } = useQuery<Expense[]>({
    queryKey: ['finance', 'expenses'],
    queryFn: () => financeService.getExpenses({}),
  });

  const { data: allDeliverables = [] } = useQuery<Deliverable[]>({
    queryKey: ['deliverables'],
    queryFn: () => deliverableService.getDeliverables({}),
  });

  // Calculate metrics per client using central selectors
  const clientsWithMetrics = useMemo<ClientItemWithMetrics[]>(() => {
    return clients.map((client) => ({
      client,
      financials: computeClientFinancials(client, allPayments, allExpenses),
      deliverables: computeClientDeliverables(client, allDeliverables),
    }));
  }, [clients, allPayments, allExpenses, allDeliverables]);

  // Overall agency metrics from shared selectors (matches Dashboard & Finance!)
  const agencyMetrics = useMemo(() => {
    return computeAgencyMetrics(clients, allPayments, allExpenses, allDeliverables);
  }, [clients, allPayments, allExpenses, allDeliverables]);

  // Filtering & Sorting
  const filteredAndSortedClients = useMemo(() => {
    let result = [...clientsWithMetrics];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.client.name.toLowerCase().includes(q) ||
          item.client.business.toLowerCase().includes(q) ||
          item.client.contactPerson.toLowerCase().includes(q) ||
          item.client.phone.includes(q) ||
          item.client.email.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((item) => item.client.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.client.name.localeCompare(b.client.name);
          break;
        case 'fee':
          cmp = a.client.monthlyFee - b.client.monthlyFee;
          break;
        case 'pending':
          cmp = a.financials.pending - b.financials.pending;
          break;
        case 'progress':
          cmp = a.deliverables.percent - b.deliverables.percent;
          break;
        case 'onboarded':
          cmp = a.client.onboardedOn.localeCompare(b.client.onboardedOn);
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [clientsWithMetrics, searchQuery, statusFilter, sortBy, sortDirection]);

  const handleEdit = (client: Client, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setClientToEdit(client);
    addDrawer.onOpen();
  };

  const handleDeletePrompt = (client: Client, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setClientToDelete(client);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    try {
      await deleteClientMutation.mutateAsync(clientToDelete.id);
      success('Client Deleted', `${clientToDelete.name} and all linked records were removed.`);
      setClientToDelete(null);
    } catch {
      error('Delete Failed', 'Could not delete client record.');
    }
  };

  const handleExportClientsPdf = async () => {
    try {
      const doc = await createPdfDoc({
        title: 'Clients Portfolio',
        period: formatDate(new Date().toISOString()),
      });
      const startY = addHeader(doc, {
        title: 'Agency Client Portfolio & Retainers',
        period: formatDate(new Date().toISOString()),
      });
      const cols = [
        { header: 'Client', dataKey: 'name' },
        { header: 'Business', dataKey: 'business' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Retainer', dataKey: 'fee', align: 'right' as const },
        { header: 'Delivered', dataKey: 'delivered', align: 'right' as const },
        { header: 'Received', dataKey: 'received', align: 'right' as const },
        { header: 'Pending', dataKey: 'pending', align: 'right' as const },
      ];
      const rows = filteredAndSortedClients.map(({ client, financials, deliverables }) => [
        client.name,
        client.business,
        client.status.toUpperCase(),
        formatINR(client.monthlyFee),
        `${deliverables.totalDone} / ${deliverables.totalPromised}`,
        formatINR(financials.received),
        formatINR(financials.pending),
      ]);
      const totalRetainer = filteredAndSortedClients.reduce((sum, item) => sum + item.client.monthlyFee, 0);
      const totalReceived = filteredAndSortedClients.reduce((sum, item) => sum + item.financials.received, 0);
      const totalPending = filteredAndSortedClients.reduce((sum, item) => sum + item.financials.pending, 0);
      rows.push(['AGENCY TOTALS', '—', '—', formatINR(totalRetainer), '—', formatINR(totalReceived), formatINR(totalPending)]);
      addTable(doc, startY, cols, rows, { hasTotalsRow: true });
      savePdf(doc, `GetupAgency_Clients_${new Date().toISOString().split('T')[0]}.pdf`);
      success('PDF Downloaded', 'Client portfolio report downloaded.');
    } catch (err: any) {
      error('Export Error', err.message || 'Could not export clients PDF.');
    }
  };

  const handleExportClientsCsv = () => {
    const headers = ['Client Name', 'Business', 'Contact Person', 'Phone', 'Email', 'Status', 'Monthly Retainer', 'Total Received', 'Pending', 'Deliverables Done', 'Deliverables Total'];
    const rows = filteredAndSortedClients.map(({ client, financials, deliverables }) => [
      client.name,
      client.business,
      client.contactPerson,
      client.phone,
      client.email || '',
      client.status,
      client.monthlyFee,
      financials.received,
      financials.pending,
      deliverables.totalDone,
      deliverables.totalPromised,
    ]);
    exportToCsv(`GetupAgency_Clients_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    success('CSV Downloaded', 'Clients exported to CSV.');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Agency Clients"
        subtitle="Manage client retainer contracts, deliverable commitments, and billing collection health."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportClientsCsv}
              className="h-8 text-xs shrink-0"
            >
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportClientsPdf}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="h-8 text-xs shrink-0"
            >
              Export PDF
            </Button>
            <Can permission="clients.write">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setClientToEdit(null);
                  addDrawer.onOpen();
                }}
                leftIcon={<Plus className="w-4 h-4" />}
                className="h-8 text-xs shrink-0"
              >
                Add Client
              </Button>
            </Can>
          </div>
        }
      />

      {/* KPI Summary Strip with Synchronized Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <StatCard
          title="Total Clients"
          value={agencyMetrics.totalClients}
          subtitle={`${agencyMetrics.activeClients} active`}
          icon={<Building2 className="w-4 h-4 text-text-muted" />}
        />
        <StatCard
          title="Active Retainer"
          value={formatINR(agencyMetrics.totalMonthlyRetainer)}
          subtitle="Monthly contract value"
          icon={<Wallet className="w-4 h-4 text-emerald-600" />}
        />
        <StatCard
          title="Total Received"
          value={formatINR(agencyMetrics.totalReceived)}
          subtitle="Cleared revenue"
          icon={<CheckCircle2 className="w-4 h-4 text-semantic-success" />}
        />
        <StatCard
          title="Pending to Collect"
          value={formatINR(agencyMetrics.totalPending)}
          subtitle={`of ${formatINR(agencyMetrics.totalExpected)} expected`}
          icon={<AlertCircle className="w-4 h-4 text-semantic-danger" />}
        />
        <StatCard
          title="Client Expenses"
          value={formatINR(agencyMetrics.clientExpenses)}
          subtitle="Shoots & production"
          icon={<Receipt className="w-4 h-4 text-amber-600" />}
        />
        <StatCard
          title="Net Profit"
          value={formatINR(agencyMetrics.netProfit)}
          subtitle={`${agencyMetrics.profitMargin}% net margin`}
          icon={<TrendingUp className="w-4 h-4 text-primary-600" />}
        />
        <StatCard
          title="Videos Delivered"
          value={agencyMetrics.totalVideosDelivered}
          subtitle={`${agencyMetrics.totalVideosRemaining} remaining`}
          icon={<Video className="w-4 h-4 text-blue-600" />}
        />
      </div>

      {/* Slim Filter, Search & View Toolbar */}
      <div className="bg-surface p-2.5 rounded-card border border-border space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Left: Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-subtle border border-border rounded-control text-text placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

          {/* Right: Filters popover, Sort & View Mode */}
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <FilterPopover
              activeCount={statusFilter !== 'all' ? 1 : 0}
              onClearAll={() => setStatusFilter('all')}
            >
              <div>
                <label className="font-bold text-text block mb-1.5">Account Status</label>
                <div className="grid grid-cols-2 gap-1">
                  {(['all', 'active', 'paused', 'closed'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded capitalize transition-colors ${
                        statusFilter === st
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-surface-subtle text-text-muted hover:text-text'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </FilterPopover>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-surface-subtle border border-border rounded-control px-2 py-1.5 text-text font-medium"
              >
                <option value="name">Sort: Name</option>
                <option value="fee">Sort: Retainer</option>
                <option value="pending">Sort: Pending</option>
                <option value="progress">Sort: Progress %</option>
                <option value="onboarded">Sort: Onboarded</option>
              </select>

              <button
                type="button"
                onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="p-1.5 rounded-control border border-border bg-surface-subtle hover:bg-slate-200 text-text-muted"
                title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-0.5 bg-surface-subtle p-0.5 rounded-control border border-border">
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`p-1 rounded transition-colors ${
                  viewMode === 'card'
                    ? 'bg-surface text-primary-700 shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1 rounded transition-colors ${
                  viewMode === 'table'
                    ? 'bg-surface text-primary-700 shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
                title="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Removable Chips */}
        {statusFilter !== 'all' && (
          <ActiveFilterChipsRow
            chips={[
              {
                id: 'status',
                label: 'Status',
                value: statusFilter,
                onRemove: () => setStatusFilter('all'),
              },
            ]}
            onClearAll={() => setStatusFilter('all')}
          />
        )}
      </div>

      {/* Main Content: Card View (Default) or Table View */}
      {clientsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-card bg-surface border border-border animate-pulse p-5"
            />
          ))}
        </div>
      ) : filteredAndSortedClients.length === 0 ? (
        <Card className="p-12 text-center border-border">
          <Building2 className="w-12 h-12 mx-auto text-text-subtle mb-3" />
          <h3 className="text-sm font-bold text-text">No clients yet — Add your first client</h3>
          <p className="text-xs text-text-muted mt-1 mb-6 max-w-sm mx-auto">
            Onboard your agency clients to automatically track retainer contracts, deliverable
            commitments, shoot expenses, and pending collections.
          </p>
          <Can permission="clients.write">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setClientToEdit(null);
                addDrawer.onOpen();
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Your First Client
            </Button>
          </Can>
        </Card>
      ) : viewMode === 'card' ? (
        /* RESPONSIVE CARD GRID (1 col mobile, 2 col tablet, 3 col desktop) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedClients.map(({ client, financials, deliverables: dlv }) => (
            <Card
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="p-5 border-border hover:border-primary-300 hover:shadow-soft transition-all duration-150 flex flex-col justify-between cursor-pointer group"
            >
              <div className="space-y-4">
                {/* Header: Initial avatar, business, vertical, status & actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-card bg-primary-50 text-primary-700 flex items-center justify-center font-extrabold text-sm border border-primary-200 group-hover:bg-primary-600 group-hover:text-white transition-colors shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-text truncate group-hover:text-primary-700 transition-colors">
                        {client.name}
                      </h4>
                      <p className="text-[11px] text-text-muted truncate">{client.business}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <StatusBadge status={client.status} size="sm" />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded-control text-text-muted hover:text-text hover:bg-surface-subtle">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}>
                          <ExternalLink className="w-3.5 h-3.5 mr-2 text-primary-600" />
                          <span>View dossier</span>
                        </DropdownMenuItem>
                        <Can permission="clients.write">
                          <DropdownMenuItem onClick={(e) => handleEdit(client, e)}>
                            <Edit2 className="w-3.5 h-3.5 mr-2 text-text-muted" />
                            <span>Edit client</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => handleDeletePrompt(client, e)}
                            destructive
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </Can>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Contact row with Tooltip */}
                <div className="text-xs bg-surface-subtle p-2.5 rounded-control border border-border/60 space-y-1">
                  <div className="flex items-center justify-between text-text">
                    <span className="font-semibold">{client.contactPerson}</span>
                    <span className="text-[11px] text-text-muted font-mono">{client.phone}</span>
                  </div>
                  {client.email && (
                    <div
                      className="text-[11px] text-text-muted truncate flex items-center gap-1"
                      title={client.email}
                    >
                      <Mail className="w-3 h-3 text-text-subtle shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                </div>

                {/* Retainer & Onboarded Date */}
                <div className="flex items-baseline justify-between text-xs border-b border-border/60 pb-2">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase font-bold block">
                      Monthly Retainer
                    </span>
                    <span className="text-base font-bold text-text tabular-nums">
                      {formatINR(client.monthlyFee)}
                      <span className="text-[11px] font-normal text-text-muted">/mo</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-text-muted uppercase font-bold block">
                      Onboarded
                    </span>
                    <span className="text-[11px] text-text-muted tabular-nums">
                      {formatDate(client.onboardedOn)} ({financials.monthsElapsed} mos)
                    </span>
                  </div>
                </div>

                {/* Deliverables: Active Types Progress Only */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-primary-600" />
                      Deliverables Progress
                    </span>
                    {dlv.hasPackage && dlv.activeTypes.length > 0 ? (
                      <span className="font-bold text-xs tabular-nums text-primary-700">
                        {dlv.totalDone} / {dlv.totalPromised} ({dlv.percent}%)
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-muted italic">No package set</span>
                    )}
                  </div>

                  {dlv.hasPackage && dlv.activeTypes.length > 0 ? (
                    <>
                      {/* Progress bar */}
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-border/40">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            dlv.isBehind ? 'bg-amber-500' : 'bg-primary-600'
                          }`}
                          style={{ width: `${dlv.percent}%` }}
                        />
                      </div>

                      {/* Only Active Types Chips */}
                      <div
                        className={`grid gap-1.5 pt-0.5 text-center ${
                          dlv.activeTypes.length === 1
                            ? 'grid-cols-1'
                            : dlv.activeTypes.length === 2
                            ? 'grid-cols-2'
                            : dlv.activeTypes.length === 3
                            ? 'grid-cols-3'
                            : 'grid-cols-4'
                        }`}
                      >
                        {dlv.activeTypes.map((typeMetric) => (
                          <div
                            key={typeMetric.type}
                            className={`px-1.5 py-1 rounded text-[10px] font-bold border ${
                              typeMetric.remaining > 0
                                ? 'bg-surface-subtle text-text border-border'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                            title={`${typeMetric.label}: ${typeMetric.done} done, ${typeMetric.remaining} remaining`}
                          >
                            <span className="block text-[9px] text-text-muted font-normal uppercase">
                              {typeMetric.label}
                            </span>
                            {typeMetric.done} / {typeMetric.promised}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="py-2 text-center text-xs text-text-muted italic bg-surface-subtle rounded border border-border/60">
                      No package set
                    </div>
                  )}
                </div>

                {/* Money Row: Received, Pending, Client Expenses, Profit */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/60 text-center">
                  <div className="p-1.5 rounded bg-surface-subtle">
                    <span className="text-[9px] uppercase font-bold text-text-muted block">
                      Received
                    </span>
                    <span className="text-xs font-bold text-semantic-success tabular-nums">
                      {formatINR(financials.received)}
                    </span>
                  </div>

                  <div className="p-1.5 rounded bg-surface-subtle">
                    <span className="text-[9px] uppercase font-bold text-text-muted block">
                      Pending
                    </span>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        financials.pending > 0 ? 'text-semantic-danger' : 'text-text-muted'
                      }`}
                    >
                      {formatINR(financials.pending)}
                    </span>
                  </div>

                  <div className="p-1.5 rounded bg-surface-subtle">
                    <span className="text-[9px] uppercase font-bold text-text-muted block">
                      Expenses
                    </span>
                    <span className="text-xs font-bold text-amber-600 tabular-nums">
                      {formatINR(financials.clientExpenses)}
                    </span>
                  </div>

                  <div className="p-1.5 rounded bg-surface-subtle">
                    <span className="text-[9px] uppercase font-bold text-text-muted block">
                      Profit
                    </span>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        financials.profit >= 0 ? 'text-emerald-700' : 'text-semantic-danger'
                      }`}
                    >
                      {formatINR(financials.profit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Button */}
              <div className="pt-4 border-t border-border mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold group-hover:bg-primary-50 group-hover:text-primary-700 group-hover:border-primary-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/clients/${client.id}`);
                  }}
                  rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                >
                  View Client Dossier
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* TABLE VIEW (Fixed layout without horizontal clipping) */
        <Card className="overflow-hidden border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle border-b border-border text-text-muted font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Client / Business</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Monthly Fee</th>
                  <th className="py-3 px-4">Deliverables Progress</th>
                  <th className="py-3 px-4">Received</th>
                  <th className="py-3 px-4">Pending</th>
                  <th className="py-3 px-4">Client Expenses</th>
                  <th className="py-3 px-4">Profit</th>
                  <th className="py-3 px-4">Onboarded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAndSortedClients.map(({ client, financials, deliverables: dlv }) => (
                  <tr
                    key={client.id}
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="hover:bg-surface-subtle/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-bold text-text">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-control bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs shrink-0 border border-primary-200">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <p className="truncate max-w-[160px] text-text hover:text-primary-700">
                            {client.name}
                          </p>
                          <p className="text-[11px] font-normal text-text-muted truncate max-w-[160px]">
                            {client.business}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-medium text-text">{client.contactPerson}</p>
                      <p className="text-[11px] text-text-muted font-mono">{client.phone}</p>
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={client.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 font-bold tabular-nums text-text">
                      {formatINR(client.monthlyFee)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="w-28 space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-text">
                          <span>{dlv.totalDone}/{dlv.totalPromised}</span>
                          <span className="text-primary-700">{dlv.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-border/40">
                          <div
                            className="h-full bg-primary-600 rounded-full"
                            style={{ width: `${dlv.percent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-bold text-semantic-success tabular-nums">
                      {formatINR(financials.received)}
                    </td>

                    <td className="py-3 px-4 font-bold tabular-nums">
                      <span
                        className={
                          financials.pending > 0 ? 'text-semantic-danger' : 'text-text-muted'
                        }
                      >
                        {formatINR(financials.pending)}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-amber-600 tabular-nums">
                      {formatINR(financials.clientExpenses)}
                    </td>

                    <td className="py-3 px-4 font-bold tabular-nums">
                      <span
                        className={
                          financials.profit >= 0 ? 'text-emerald-700' : 'text-semantic-danger'
                        }
                      >
                        {formatINR(financials.profit)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-text-muted tabular-nums whitespace-nowrap">
                      {formatDate(client.onboardedOn)}
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="h-7 w-7 p-0 text-text-muted hover:text-primary-600"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                        <Can permission="clients.write">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleEdit(client, e)}
                            className="h-7 w-7 p-0 text-text-muted hover:text-text"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeletePrompt(client, e)}
                            className="h-7 w-7 p-0 text-text-muted hover:text-semantic-danger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Client Drawer */}
      <AddClientDrawer
        isOpen={addDrawer.isOpen}
        onClose={() => {
          addDrawer.onClose();
          setClientToEdit(null);
        }}
        clientToEdit={clientToEdit}
      />

      {/* Delete Confirmation Modal */}
      <Modal open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <ModalContent size="sm" variant="center">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2 text-semantic-danger">
              <Trash2 className="w-5 h-5" />
              Delete Client Record?
            </ModalTitle>
            <ModalDescription className="text-xs text-text-muted mt-2">
              Are you sure you want to permanently delete{' '}
              <strong className="text-text">{clientToDelete?.name}</strong>?
              <br />
              This will cascade delete all linked deliverables, payment transactions, and shoot
              expenses for this client.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClientToDelete(null)}
              disabled={deleteClientMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteConfirm}
              isLoading={deleteClientMutation.isPending}
            >
              Yes, Delete Client
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
