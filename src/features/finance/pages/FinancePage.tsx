import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/data-display/StatCard';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { MoneyInput } from '@/components/forms/MoneyInput';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/Modal';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { useQuery } from '@tanstack/react-query';
import { financeService, deliverableService, billingCycleService } from '@/services';
import {
  useClients,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  useDeleteExpense,
} from '@/features/clients/hooks/useClients';
import { useToast } from '@/components/feedback/Toast';
import { Can } from '@/components/feedback/Can';
import {
  Payment,
  Expense,
  Deliverable,
  PaymentMode,
  PaymentStatus,
  BillingCycle,
} from '@/types';
import { formatINR, formatDate } from '@/lib/format';
import {
  computeAgencyMetrics,
  computeClientFinancials,
} from '@/lib/selectors';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  Receipt,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Search,
  Download,
} from 'lucide-react';
import { FilterPopover, ActiveFilterChipsRow } from '@/components/ui/FilterPopover';
import { createPdfDoc, addHeader, addTable, savePdf, exportToCsv } from '@/utils/pdf';

export const FinancePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  // Queries
  const { data: clients = [] } = useClients();

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ['finance', 'payments'],
    queryFn: () => financeService.getPayments({}),
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['finance', 'expenses'],
    queryFn: () => financeService.getExpenses({}),
  });

  const { data: deliverables = [] } = useQuery<Deliverable[]>({
    queryKey: ['deliverables'],
    queryFn: () => deliverableService.getDeliverables({}),
  });

  const { data: allCycles = [] } = useQuery<BillingCycle[]>({
    queryKey: ['billingCycles'],
    queryFn: () => billingCycleService.getCycles(),
  });

  // Central selectors for agency & client financials
  const agencyMetrics = useMemo(() => {
    return computeAgencyMetrics(clients, payments, expenses, deliverables, allCycles);
  }, [clients, payments, expenses, deliverables, allCycles]);

  const clientSummaries = useMemo(() => {
    return clients.map((c) => ({
      client: c,
      fin: computeClientFinancials(c, payments, expenses, undefined, allCycles),
    }));
  }, [clients, payments, expenses, allCycles]);

  // Payment modal state - opens empty with no pre-selected values
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  const [payClientId, setPayClientId] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payMonth, setPayMonth] = useState('');
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [payMode, setPayMode] = useState<PaymentMode | ''>('');
  const [payStatus, setPayStatus] = useState<PaymentStatus | ''>('');
  const [payNotes, setPayNotes] = useState('');
  const [payFormErrors, setPayFormErrors] = useState<Record<string, string>>({});

  // Expense modal state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Filters for Payments
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentClientFilter, setPaymentClientFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentMonthFilter, setPaymentMonthFilter] = useState('all');

  // Filters for Expenses
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState('all');
  const [expenseClientFilter, setExpenseClientFilter] = useState('all');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [expenseMonthFilter, setExpenseMonthFilter] = useState('all');

  // Mutations
  const createPaymentMutation = useCreatePayment();
  const updatePaymentMutation = useUpdatePayment();
  const deletePaymentMutation = useDeletePayment();
  const deleteExpenseMutation = useDeleteExpense();

  const getClientName = (cId?: string) => {
    if (!cId) return 'General Agency';
    return clients.find((c) => c.id === cId)?.name || 'Client';
  };

  // Payment modal handlers
  const handleOpenAddPayment = () => {
    setEditingPayment(null);
    setPayClientId('');
    setPayDate('');
    setPayMonth('');
    setPayAmount(null);
    setPayMode('');
    setPayStatus('');
    setPayNotes('');
    setPayFormErrors({});
    setPaymentModalOpen(true);
  };

  const handleOpenEditPayment = (p: Payment) => {
    setEditingPayment(p);
    setPayClientId(p.clientId);
    setPayDate(p.date);
    setPayMonth(p.month);
    setPayAmount(p.amount);
    setPayMode(p.mode || 'bank_transfer');
    setPayStatus(p.status);
    setPayNotes(p.notes || '');
    setPayFormErrors({});
    setPaymentModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!payClientId) errs.payClientId = 'Please select a client';
    if (!payDate) errs.payDate = 'Payment date is required';
    if (payAmount === null || payAmount === undefined || payAmount <= 0) {
      errs.payAmount = 'Valid amount is required (greater than 0)';
    }
    if (!payMode) errs.payMode = 'Please select payment mode';
    if (!payStatus) errs.payStatus = 'Please select payment status';

    if (Object.keys(errs).length > 0) {
      setPayFormErrors(errs);
      error('Validation Error', 'Please complete all required fields.');
      return;
    }

    try {
      const computedMonth = payMonth.trim() || (payDate ? payDate.substring(0, 7) : '2026-10');
      if (editingPayment) {
        await updatePaymentMutation.mutateAsync({
          id: editingPayment.id,
          data: {
            clientId: payClientId,
            date: payDate,
            month: computedMonth,
            amount: Number(payAmount),
            mode: payMode as PaymentMode,
            status: payStatus as PaymentStatus,
            notes: payNotes.trim() || undefined,
          },
        });
        success('Payment Updated', 'Payment record has been updated.');
      } else {
        await createPaymentMutation.mutateAsync({
          clientId: payClientId,
          date: payDate,
          month: computedMonth,
          amount: Number(payAmount),
          mode: payMode as PaymentMode,
          status: payStatus as PaymentStatus,
          notes: payNotes.trim() || undefined,
        });
        success('Payment Recorded', `Recorded payment of ${formatINR(Number(payAmount))}.`);
      }
      setPaymentModalOpen(false);
    } catch {
      error('Payment Failed', 'Could not save payment. Please try again.');
    }
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      await deletePaymentMutation.mutateAsync({
        id: paymentToDelete.id,
        clientId: paymentToDelete.clientId,
      });
      success('Payment Deleted', 'Payment transaction was removed.');
      setPaymentToDelete(null);
    } catch {
      error('Delete Failed', 'Could not delete payment.');
    }
  };

  // Expense modal handlers
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpenseModalOpen(true);
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpenseMutation.mutateAsync({
        id: expenseToDelete.id,
        clientId: expenseToDelete.clientId,
      });
      success('Expense Removed', 'Expense item was removed.');
      setExpenseToDelete(null);
    } catch {
      error('Delete Failed', 'Could not delete expense.');
    }
  };

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (paymentSearch.trim()) {
        const q = paymentSearch.toLowerCase();
        const client = clients.find((c) => c.id === p.clientId);
        const matchNote = p.notes && p.notes.toLowerCase().includes(q);
        const matchClient = client && client.name.toLowerCase().includes(q);
        const matchAmount = p.amount.toString().includes(q);
        if (!matchNote && !matchClient && !matchAmount) return false;
      }
      if (paymentClientFilter !== 'all' && p.clientId !== paymentClientFilter) return false;
      if (paymentStatusFilter !== 'all' && p.status !== paymentStatusFilter) return false;
      if (paymentMonthFilter !== 'all' && p.month !== paymentMonthFilter) return false;
      return true;
    });
  }, [payments, paymentSearch, clients, paymentClientFilter, paymentStatusFilter, paymentMonthFilter]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (expenseSearch.trim()) {
        const q = expenseSearch.toLowerCase();
        const matchNote = e.note && e.note.toLowerCase().includes(q);
        const matchProject = e.projectLabel && e.projectLabel.toLowerCase().includes(q);
        const matchAmount = e.amount.toString().includes(q);
        if (!matchNote && !matchProject && !matchAmount) return false;
      }
      const expType = e.type || (e.clientId ? 'client' : 'agency');
      if (expenseTypeFilter !== 'all' && expType !== expenseTypeFilter) return false;
      if (expenseClientFilter !== 'all' && e.clientId !== expenseClientFilter) return false;
      if (expenseCategoryFilter !== 'all' && e.category !== expenseCategoryFilter) return false;
      if (expenseMonthFilter !== 'all' && !e.date.startsWith(expenseMonthFilter)) return false;
      return true;
    });
  }, [expenses, expenseSearch, expenseTypeFilter, expenseClientFilter, expenseCategoryFilter, expenseMonthFilter]);

  // Unique Months for filter dropdowns
  const availablePaymentMonths = useMemo(() => {
    return Array.from(new Set(payments.map((p) => p.month))).filter(Boolean).sort().reverse();
  }, [payments]);

  const availableExpenseMonths = useMemo(() => {
    return Array.from(new Set(expenses.map((e) => e.date.substring(0, 7)))).filter(Boolean).sort().reverse();
  }, [expenses]);

  // Chart Data: Monthly Revenue vs Expense
  const monthlyChartData = useMemo(() => {
    const monthsSet = new Set<string>();
    payments.forEach((p) => monthsSet.add(p.month));
    expenses.forEach((e) => monthsSet.add(e.date.substring(0, 7)));

    const monthsArr = Array.from(monthsSet).filter(Boolean).sort();
    return monthsArr.map((m) => {
      const monthReceived = payments
        .filter((p) => p.month === m && p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      const monthClientExp = expenses
        .filter((e) => e.date.startsWith(m) && (e.type === 'client' || !!e.clientId))
        .reduce((sum, e) => sum + e.amount, 0);

      const monthAgencyExp = expenses
        .filter((e) => e.date.startsWith(m) && (e.type === 'agency' || !e.clientId))
        .reduce((sum, e) => sum + e.amount, 0);

      const monthTotalExp = monthClientExp + monthAgencyExp;
      const profit = monthReceived - monthTotalExp;

      return {
        month: m,
        Revenue: monthReceived,
        Expenses: monthTotalExp,
        'Client Exp': monthClientExp,
        'Agency Exp': monthAgencyExp,
        Profit: profit,
      };
    });
  }, [payments, expenses]);

  // Chart Data: Expense by Category
  const categoryChartData = useMemo(() => {
    const catMap: Record<string, { client: number; agency: number }> = {};
    expenses.forEach((e) => {
      const cat = e.category;
      if (!catMap[cat]) catMap[cat] = { client: 0, agency: 0 };
      if (e.type === 'agency' || !e.clientId) {
        catMap[cat].agency += e.amount;
      } else {
        catMap[cat].client += e.amount;
      }
    });

    return Object.entries(catMap).map(([category, vals]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      'Client Expenses': vals.client,
      'Agency Expenses': vals.agency,
      Total: vals.client + vals.agency,
    }));
  }, [expenses]);

  // Export handlers
  const handleExportPaymentsPdf = async () => {
    try {
      const doc = await createPdfDoc({
        title: 'Payments Ledger',
        period: formatDate(new Date().toISOString()),
      });
      const startY = addHeader(doc, {
        title: 'Client Payments Ledger',
        period: formatDate(new Date().toISOString()),
      });
      const cols = [
        { header: 'Client', dataKey: 'client' },
        { header: 'Month', dataKey: 'month' },
        { header: 'Date', dataKey: 'date' },
        { header: 'Mode', dataKey: 'mode' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Notes', dataKey: 'notes' },
        { header: 'Amount', dataKey: 'amount', align: 'right' as const },
      ];
      const rows = filteredPayments.map((p) => [
        clients.find((c) => c.id === p.clientId)?.name || 'Unknown',
        p.month,
        formatDate(p.date),
        (p.mode || 'bank_transfer').replace('_', ' ').toUpperCase(),
        p.status.toUpperCase(),
        p.notes || '',
        formatINR(p.amount),
      ]);
      const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
      rows.push(['TOTAL RECEIVED', '—', '—', '—', '—', '—', formatINR(totalAmount)]);
      addTable(doc, startY, cols, rows, { hasTotalsRow: true });
      savePdf(doc, `GetupAgency_Payments_${new Date().toISOString().split('T')[0]}.pdf`);
      success('PDF Downloaded', 'Payments ledger downloaded.');
    } catch (err: any) {
      error('Export Error', err.message || 'Could not export PDF.');
    }
  };

  const handleExportPaymentsCsv = () => {
    const headers = ['Client', 'Month', 'Date', 'Mode', 'Status', 'Notes', 'Amount'];
    const rows = filteredPayments.map((p) => [
      clients.find((c) => c.id === p.clientId)?.name || 'Unknown',
      p.month,
      p.date,
      p.mode || 'bank_transfer',
      p.status,
      p.notes || '',
      p.amount,
    ]);
    exportToCsv(`GetupAgency_Payments_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    success('CSV Downloaded', 'Payments exported to CSV.');
  };

  const handleExportExpensesPdf = async () => {
    try {
      const doc = await createPdfDoc({
        title: 'Expenses Audit Log',
        period: formatDate(new Date().toISOString()),
      });
      const startY = addHeader(doc, {
        title: 'Operating & Shoot Expenses Log',
        period: formatDate(new Date().toISOString()),
      });
      const cols = [
        { header: 'Date', dataKey: 'date' },
        { header: 'Category', dataKey: 'cat' },
        { header: 'Scope / Client', dataKey: 'scope' },
        { header: 'Paid To', dataKey: 'paidTo' },
        { header: 'Note', dataKey: 'note' },
        { header: 'Amount', dataKey: 'amount', align: 'right' as const },
      ];
      const rows = filteredExpenses.map((e) => [
        formatDate(e.date),
        e.category.toUpperCase(),
        e.clientId ? `Client: ${clients.find((c) => c.id === e.clientId)?.name || e.clientId}` : 'Agency Operational',
        e.paidTo || '—',
        e.note,
        formatINR(e.amount),
      ]);
      const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
      rows.push(['TOTAL EXPENSES', '—', '—', '—', '—', formatINR(totalAmount)]);
      addTable(doc, startY, cols, rows, { hasTotalsRow: true });
      savePdf(doc, `GetupAgency_Expenses_${new Date().toISOString().split('T')[0]}.pdf`);
      success('PDF Downloaded', 'Expenses log downloaded.');
    } catch (err: any) {
      error('Export Error', err.message || 'Could not export PDF.');
    }
  };

  const handleExportExpensesCsv = () => {
    const headers = ['Date', 'Category', 'Scope', 'Paid To', 'Note', 'Amount'];
    const rows = filteredExpenses.map((e) => [
      e.date,
      e.category,
      e.clientId ? `Client: ${clients.find((c) => c.id === e.clientId)?.name || e.clientId}` : 'Agency',
      e.paidTo || '',
      e.note,
      e.amount,
    ]);
    exportToCsv(`GetupAgency_Expenses_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    success('CSV Downloaded', 'Expenses exported to CSV.');
  };

  const handleExportClientSummaryPdf = async () => {
    try {
      const doc = await createPdfDoc({
        title: 'Client Financial Summary',
        period: formatDate(new Date().toISOString()),
      });
      const startY = addHeader(doc, {
        title: 'Client-Wise Financial Position & Margin',
        period: formatDate(new Date().toISOString()),
      });
      const cols = [
        { header: 'Client', dataKey: 'name' },
        { header: 'Retainer', dataKey: 'fee', align: 'right' as const },
        { header: 'Expected', dataKey: 'expected', align: 'right' as const },
        { header: 'Received', dataKey: 'received', align: 'right' as const },
        { header: 'Pending', dataKey: 'pending', align: 'right' as const },
        { header: 'Expenses', dataKey: 'expenses', align: 'right' as const },
        { header: 'Net Profit', dataKey: 'profit', align: 'right' as const },
        { header: 'Margin', dataKey: 'margin', align: 'right' as const },
      ];
      const rows = clientSummaries.map(({ client, fin }) => [
        client.name,
        formatINR(fin.monthlyFee),
        formatINR(fin.expected),
        formatINR(fin.received),
        formatINR(fin.pending),
        formatINR(fin.clientExpenses),
        formatINR(fin.profit),
        `${fin.margin}%`,
      ]);
      rows.push([
        'AGENCY TOTALS',
        formatINR(agencyMetrics.totalMonthlyRetainer),
        formatINR(agencyMetrics.totalExpected),
        formatINR(agencyMetrics.totalReceived),
        formatINR(agencyMetrics.totalPending),
        formatINR(agencyMetrics.clientExpenses),
        formatINR(agencyMetrics.netProfit),
        `${agencyMetrics.profitMargin}%`,
      ]);
      addTable(doc, startY, cols, rows, { hasTotalsRow: true });
      savePdf(doc, `GetupAgency_ClientFinanceSummary_${new Date().toISOString().split('T')[0]}.pdf`);
      success('PDF Downloaded', 'Client financial summary downloaded.');
    } catch (err: any) {
      error('Export Error', err.message || 'Could not export PDF.');
    }
  };

  const handleExportClientSummaryCsv = () => {
    const headers = ['Client', 'Retainer', 'Expected', 'Received', 'Pending', 'Expenses', 'Net Profit', 'Margin %'];
    const rows = clientSummaries.map(({ client, fin }) => [
      client.name,
      fin.monthlyFee,
      fin.expected,
      fin.received,
      fin.pending,
      fin.clientExpenses,
      fin.profit,
      `${fin.margin}%`,
    ]);
    exportToCsv(`GetupAgency_ClientFinanceSummary_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    success('CSV Downloaded', 'Client financial summary exported to CSV.');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Agency Finance & Profit"
        subtitle="Live reconciliation of client retainer billing, shoot expenses, operating overhead, and net margin."
        actions={
          <div className="flex items-center gap-2">
            <Can permission="finance.write">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAddExpense}
                leftIcon={<Receipt className="w-4 h-4 text-amber-600" />}
              >
                Add Expense
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddPayment}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Record Payment
              </Button>
            </Can>
          </div>
        }
      />

      {/* Top KPI Strip (Synchronized from Central Selectors) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue Received"
          value={formatINR(agencyMetrics.totalReceived)}
          subtitle={`From ${agencyMetrics.activeClients} active clients`}
          icon={<Wallet className="w-5 h-5 text-semantic-success" />}
        />
        <StatCard
          title="Pending to Collect"
          value={formatINR(agencyMetrics.totalPending)}
          subtitle={`of ${formatINR(agencyMetrics.totalExpected)} expected`}
          icon={<AlertCircle className="w-5 h-5 text-semantic-danger" />}
        />
        <StatCard
          title="Total Expenses"
          value={formatINR(agencyMetrics.totalExpenses)}
          subtitle={`Client: ${formatINR(agencyMetrics.clientExpenses)} · Agency: ${formatINR(agencyMetrics.agencyExpenses)}`}
          icon={<Receipt className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title="Net Profit"
          value={formatINR(agencyMetrics.netProfit)}
          subtitle={`Net margin: ${agencyMetrics.profitMargin}%`}
          icon={<TrendingUp className="w-5 h-5 text-primary-600" />}
        />
      </div>

      {/* Tabs: Client Payments | Expenses | Client-wise Summary */}
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList className="bg-surface border border-border p-1 rounded-card flex flex-wrap gap-1">
          <TabsTrigger value="payments" className="text-xs font-semibold px-4 py-2">
            Client Payments ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs font-semibold px-4 py-2">
            Expenses Log ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="client-summary" className="text-xs font-semibold px-4 py-2">
            Client-wise Summary ({clients.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs font-semibold px-4 py-2">
            Financial Charts
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CLIENT PAYMENTS */}
        <TabsContent value="payments" className="space-y-4">
          {/* Slim Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-surface p-2.5 rounded-card border border-border">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search payments by client, note, amount..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-subtle border border-border rounded-control text-text placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>

              <FilterPopover
                activeCount={
                  (paymentClientFilter !== 'all' ? 1 : 0) +
                  (paymentStatusFilter !== 'all' ? 1 : 0) +
                  (paymentMonthFilter !== 'all' ? 1 : 0)
                }
                onClearAll={() => {
                  setPaymentClientFilter('all');
                  setPaymentStatusFilter('all');
                  setPaymentMonthFilter('all');
                }}
              >
                <div>
                  <label className="font-bold text-text block mb-1">Client</label>
                  <select
                    value={paymentClientFilter}
                    onChange={(e) => setPaymentClientFilter(e.target.value)}
                    className="w-full text-xs bg-surface-subtle border border-border rounded-control p-1.5 text-text"
                  >
                    <option value="all">All Clients</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-text block mb-1">Status</label>
                  <div className="grid grid-cols-2 gap-1">
                    {['all', 'paid', 'pending', 'partial', 'overdue'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setPaymentStatusFilter(st)}
                        className={`px-2 py-1 text-xs font-semibold rounded capitalize transition-colors ${
                          paymentStatusFilter === st
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-surface-subtle text-text-muted hover:text-text'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {availablePaymentMonths.length > 0 && (
                  <div>
                    <label className="font-bold text-text block mb-1">Month</label>
                    <select
                      value={paymentMonthFilter}
                      onChange={(e) => setPaymentMonthFilter(e.target.value)}
                      className="w-full text-xs bg-surface-subtle border border-border rounded-control p-1.5 text-text"
                    >
                      <option value="all">All Months</option>
                      {availablePaymentMonths.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </FilterPopover>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPaymentsCsv}
                className="h-8 text-xs shrink-0"
              >
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPaymentsPdf}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                className="h-8 text-xs shrink-0"
              >
                Export PDF
              </Button>
              <Can permission="finance.write">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenAddPayment}
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="h-8 text-xs shrink-0"
                >
                  Record Payment
                </Button>
              </Can>
            </div>
          </div>

          {/* Active Payment Chips */}
          {((paymentClientFilter !== 'all') || (paymentStatusFilter !== 'all') || (paymentMonthFilter !== 'all')) && (
            <ActiveFilterChipsRow
              chips={[
                ...(paymentClientFilter !== 'all'
                  ? [
                      {
                        id: 'client',
                        label: 'Client',
                        value: clients.find((c) => c.id === paymentClientFilter)?.name || paymentClientFilter,
                        onRemove: () => setPaymentClientFilter('all'),
                      },
                    ]
                  : []),
                ...(paymentStatusFilter !== 'all'
                  ? [
                      {
                        id: 'status',
                        label: 'Status',
                        value: paymentStatusFilter,
                        onRemove: () => setPaymentStatusFilter('all'),
                      },
                    ]
                  : []),
                ...(paymentMonthFilter !== 'all'
                  ? [
                      {
                        id: 'month',
                        label: 'Month',
                        value: paymentMonthFilter,
                        onRemove: () => setPaymentMonthFilter('all'),
                      },
                    ]
                  : []),
              ]}
              onClearAll={() => {
                setPaymentClientFilter('all');
                setPaymentStatusFilter('all');
                setPaymentMonthFilter('all');
              }}
            />
          )}

          {/* Table */}
          <Card className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle border-b border-border text-text-muted font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Covers Month</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Note / Ref</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-text-muted text-xs">
                        <Wallet className="w-8 h-8 mx-auto mb-2 text-text-subtle" />
                        No payments found matching the selected filters.
                        <div className="mt-3">
                          <Button variant="outline" size="sm" onClick={handleOpenAddPayment}>
                            Record First Payment
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-subtle/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-text">
                          <button
                            onClick={() => navigate(`/clients/${p.clientId}`)}
                            className="hover:text-primary-700 hover:underline text-left"
                          >
                            {getClientName(p.clientId)}
                          </button>
                        </td>
                        <td className="py-3 px-4 tabular-nums text-text-muted">
                          {formatDate(p.date)}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-text">
                          {p.month}
                        </td>
                        <td className="py-3 px-4 font-bold text-sm text-text tabular-nums">
                          {formatINR(p.amount)}
                        </td>
                        <td className="py-3 px-4 capitalize text-text-muted">
                          {p.mode?.replace('_', ' ') || 'Bank transfer'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={p.status} size="sm" />
                        </td>
                        <td className="py-3 px-4 text-text-muted max-w-xs truncate">
                          {p.notes || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditPayment(p)}
                              className="h-7 w-7 p-0 text-text-muted hover:text-text"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPaymentToDelete(p)}
                              className="h-7 w-7 p-0 text-text-muted hover:text-semantic-danger"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: EXPENSES */}
        <TabsContent value="expenses" className="space-y-4">
          {/* Slim Filter Toolbar for Expenses */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-surface p-2.5 rounded-card border border-border">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search expenses by note, group, amount..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-subtle border border-border rounded-control text-text placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>

              <FilterPopover
                activeCount={
                  (expenseTypeFilter !== 'all' ? 1 : 0) +
                  (expenseClientFilter !== 'all' ? 1 : 0) +
                  (expenseCategoryFilter !== 'all' ? 1 : 0) +
                  (expenseMonthFilter !== 'all' ? 1 : 0)
                }
                onClearAll={() => {
                  setExpenseTypeFilter('all');
                  setExpenseClientFilter('all');
                  setExpenseCategoryFilter('all');
                  setExpenseMonthFilter('all');
                }}
              >
                <div>
                  <label className="font-bold text-text block mb-1">Expense Type</label>
                  <select
                    value={expenseTypeFilter}
                    onChange={(e) => setExpenseTypeFilter(e.target.value)}
                    className="w-full text-xs bg-surface-subtle border border-border rounded-control p-1.5 text-text"
                  >
                    <option value="all">All Types</option>
                    <option value="client">Client Shoot Only</option>
                    <option value="agency">Agency General Overhead</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-text block mb-1">Client</label>
                  <select
                    value={expenseClientFilter}
                    onChange={(e) => setExpenseClientFilter(e.target.value)}
                    className="w-full text-xs bg-surface-subtle border border-border rounded-control p-1.5 text-text"
                  >
                    <option value="all">All Clients</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-text block mb-1">Category</label>
                  <select
                    value={expenseCategoryFilter}
                    onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                    className="w-full text-xs bg-surface-subtle border border-border rounded-control p-1.5 text-text"
                  >
                    <option value="all">All Categories</option>
                    <option value="travel">Petrol / Travel</option>
                    <option value="equipment">Camera / Equipment</option>
                    <option value="editor">Editor / Freelance</option>
                    <option value="shoot">Shoot Production</option>
                    <option value="props">Props</option>
                    <option value="salary">Salary</option>
                    <option value="rent">Studio Rent</option>
                    <option value="software">Software</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {availableExpenseMonths.length > 0 && (
                  <div>
                    <label className="font-bold text-text block mb-1">Month</label>
                    <select
                      value={expenseMonthFilter}
                      onChange={(e) => setExpenseMonthFilter(e.target.value)}
                      className="w-full text-xs bg-surface-subtle border border-border rounded-control p-1.5 text-text"
                    >
                      <option value="all">All Months</option>
                      {availableExpenseMonths.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </FilterPopover>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExpensesCsv}
                className="h-8 text-xs shrink-0"
              >
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExpensesPdf}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                className="h-8 text-xs shrink-0"
              >
                Export PDF
              </Button>
              <Can permission="finance.write">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenAddExpense}
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="h-8 text-xs shrink-0"
                >
                  Add Expense
                </Button>
              </Can>
            </div>
          </div>

          {/* Active Expense Chips */}
          {((expenseTypeFilter !== 'all') || (expenseClientFilter !== 'all') || (expenseCategoryFilter !== 'all') || (expenseMonthFilter !== 'all')) && (
            <ActiveFilterChipsRow
              chips={[
                ...(expenseTypeFilter !== 'all'
                  ? [{ id: 'type', label: 'Type', value: expenseTypeFilter, onRemove: () => setExpenseTypeFilter('all') }]
                  : []),
                ...(expenseClientFilter !== 'all'
                  ? [
                      {
                        id: 'client',
                        label: 'Client',
                        value: clients.find((c) => c.id === expenseClientFilter)?.name || expenseClientFilter,
                        onRemove: () => setExpenseClientFilter('all'),
                      },
                    ]
                  : []),
                ...(expenseCategoryFilter !== 'all'
                  ? [{ id: 'category', label: 'Category', value: expenseCategoryFilter, onRemove: () => setExpenseCategoryFilter('all') }]
                  : []),
                ...(expenseMonthFilter !== 'all'
                  ? [{ id: 'month', label: 'Month', value: expenseMonthFilter, onRemove: () => setExpenseMonthFilter('all') }]
                  : []),
              ]}
              onClearAll={() => {
                setExpenseTypeFilter('all');
                setExpenseClientFilter('all');
                setExpenseCategoryFilter('all');
                setExpenseMonthFilter('all');
              }}
            />
          )}

          {/* Table */}
          <Card className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle border-b border-border text-text-muted font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Item Note & Shoot Group</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-text-muted text-xs">
                        <Receipt className="w-8 h-8 mx-auto mb-2 text-text-subtle" />
                        No expenses logged matching the current filters.
                        <div className="mt-3">
                          <Button variant="outline" size="sm" onClick={handleOpenAddExpense}>
                            Add First Expense
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => {
                      const isClientExp = exp.type === 'client' || !!exp.clientId;
                      return (
                        <tr key={exp.id} className="hover:bg-surface-subtle/50 transition-colors">
                          <td className="py-3 px-4 tabular-nums text-text-muted">
                            {formatDate(exp.date)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-text max-w-xs">
                            <p className="truncate">{exp.note}</p>
                            {exp.projectLabel && (
                              <p className="text-[11px] font-normal text-primary-700 truncate">
                                Group: {exp.projectLabel}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="capitalize px-2 py-0.5 rounded bg-surface-subtle border border-border text-[11px] font-medium">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={isClientExp ? 'warning' : 'slate'}
                              className="text-[10px] uppercase font-bold"
                            >
                              {isClientExp ? 'Client' : 'Agency'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {exp.clientId ? (
                              <button
                                onClick={() => navigate(`/clients/${exp.clientId}`)}
                                className="font-semibold text-text hover:text-primary-600 hover:underline text-left truncate max-w-[140px] block"
                              >
                                {getClientName(exp.clientId)}
                              </button>
                            ) : (
                              <span className="text-text-muted italic">Agency General</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-sm text-semantic-danger tabular-nums">
                            {formatINR(exp.amount)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditExpense(exp)}
                                className="h-7 w-7 p-0 text-text-muted hover:text-text"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpenseToDelete(exp)}
                                className="h-7 w-7 p-0 text-text-muted hover:text-semantic-danger"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: CLIENT-WISE SUMMARY */}
        <TabsContent value="client-summary" className="space-y-4">
          <div className="flex items-center justify-between gap-2.5 bg-surface p-2.5 rounded-card border border-border">
            <span className="text-xs font-semibold text-text-muted">
              Summary of all {clientSummaries.length} client financial positions
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportClientSummaryCsv}
                className="h-8 text-xs shrink-0"
              >
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportClientSummaryPdf}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                className="h-8 text-xs shrink-0"
              >
                Export PDF
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle border-b border-border text-text-muted font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Expected Contract</th>
                    <th className="py-3 px-4">Received</th>
                    <th className="py-3 px-4">Pending</th>
                    <th className="py-3 px-4">Client Expenses</th>
                    <th className="py-3 px-4">Client Profit</th>
                    <th className="py-3 px-4">Margin %</th>
                    <th className="py-3 px-4">Last Payment</th>
                    <th className="py-3 px-4 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clientSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-text-muted text-xs">
                        No clients available to summarize.
                      </td>
                    </tr>
                  ) : (
                    clientSummaries.map(({ client, fin }) => (
                      <tr
                        key={client.id}
                        onClick={() => navigate(`/clients/${client.id}`)}
                        className="hover:bg-surface-subtle/50 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 font-bold text-text">
                          <p className="truncate max-w-[180px]">{client.name}</p>
                          <p className="text-[11px] font-normal text-text-muted truncate">
                            {client.business}
                          </p>
                        </td>
                        <td className="py-3 px-4 tabular-nums font-semibold text-text">
                          {formatINR(fin.expected)}
                          <span className="text-[10px] font-normal text-text-muted block">
                            {formatINR(client.monthlyFee)} × {fin.monthsElapsed} mos
                          </span>
                        </td>
                        <td className="py-3 px-4 tabular-nums font-bold text-semantic-success">
                          {formatINR(fin.received)}
                        </td>
                        <td className="py-3 px-4 tabular-nums font-bold">
                          <span
                            className={
                              fin.pending > 0 ? 'text-semantic-danger' : 'text-text-muted'
                            }
                          >
                            {formatINR(fin.pending)}
                          </span>
                        </td>
                        <td className="py-3 px-4 tabular-nums font-semibold text-amber-600">
                          {formatINR(fin.clientExpenses)}
                        </td>
                        <td className="py-3 px-4 tabular-nums font-bold">
                          <span
                            className={
                              fin.profit >= 0 ? 'text-emerald-700' : 'text-semantic-danger'
                            }
                          >
                            {formatINR(fin.profit)}
                          </span>
                        </td>
                        <td className="py-3 px-4 tabular-nums font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              fin.margin >= 40
                                ? 'bg-emerald-50 text-emerald-700'
                                : fin.margin >= 0
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-semantic-danger'
                            }`}
                          >
                            {fin.margin}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-text-muted tabular-nums whitespace-nowrap">
                          {fin.lastPaymentDate ? formatDate(fin.lastPaymentDate) : 'No payments yet'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <ExternalLink className="w-3.5 h-3.5 text-text-muted inline-block" />
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Summary Totals & Final Net Profit Row */}
                  <tr className="bg-surface-subtle font-bold border-t-2 border-border text-xs">
                    <td className="py-3.5 px-4 text-text uppercase tracking-wider font-extrabold">
                      Agency General Overhead
                    </td>
                    <td colSpan={3} className="py-3.5 px-4 text-text-muted italic">
                      Rent, salaries, software, general admin
                    </td>
                    <td className="py-3.5 px-4 tabular-nums text-semantic-danger">
                      {formatINR(agencyMetrics.agencyExpenses)}
                    </td>
                    <td colSpan={4} className="py-3.5 px-4 text-text-muted text-[11px]">
                      General non-client agency expenses
                    </td>
                  </tr>

                  <tr className="bg-primary-50/60 font-bold border-t border-primary-200 text-xs">
                    <td className="py-4 px-4 text-primary-900 uppercase font-extrabold">
                      Final Net Profit
                    </td>
                    <td className="py-4 px-4 tabular-nums text-text">
                      {formatINR(agencyMetrics.totalExpected)}
                    </td>
                    <td className="py-4 px-4 tabular-nums text-semantic-success">
                      {formatINR(agencyMetrics.totalReceived)}
                    </td>
                    <td className="py-4 px-4 tabular-nums text-semantic-danger">
                      {formatINR(agencyMetrics.totalPending)}
                    </td>
                    <td className="py-4 px-4 tabular-nums text-amber-700">
                      {formatINR(agencyMetrics.totalExpenses)}
                    </td>
                    <td
                      colSpan={4}
                      className={`py-4 px-4 text-sm font-extrabold tabular-nums ${
                        agencyMetrics.netProfit >= 0
                          ? 'text-primary-700'
                          : 'text-semantic-danger'
                      }`}
                    >
                      {formatINR(agencyMetrics.netProfit)}{' '}
                      <span className="text-xs font-normal text-text-muted">
                        ({agencyMetrics.profitMargin}% margin)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: FINANCIAL CHARTS */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue vs Expense */}
            <Card className="p-5 border-border space-y-4">
              <div>
                <CardTitle className="text-sm font-bold">Monthly Revenue vs Expenses</CardTitle>
                <p className="text-xs text-text-muted">
                  Comparison of cleared cash collections and total expenditures.
                </p>
              </div>

              {monthlyChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs text-text-muted">
                  No monthly transactions to graph.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(val: number) => formatINR(val)} />
                      <Legend />
                      <Bar dataKey="Revenue" fill="#16A34A" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Expenses" fill="#DC2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Expenses by Category */}
            <Card className="p-5 border-border space-y-4">
              <div>
                <CardTitle className="text-sm font-bold">Expenses by Category</CardTitle>
                <p className="text-xs text-text-muted">
                  Client shoot & production costs vs general agency overhead.
                </p>
              </div>

              {categoryChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs text-text-muted">
                  No expense records categorized yet.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="category" type="category" tick={{ fontSize: 10 }} width={80} />
                      <RechartsTooltip formatter={(val: number) => formatINR(val)} />
                      <Legend />
                      <Bar dataKey="Client Expenses" fill="#F59E0B" stackId="a" />
                      <Bar dataKey="Agency Expenses" fill="#64748B" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Payment Modal */}
      <Modal open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <ModalContent size="md">
          <form onSubmit={handleSavePayment} autoComplete="off" className="flex flex-col flex-1 h-full">
            <ModalHeader>
              <ModalTitle>
                {editingPayment ? 'Edit Client Payment' : 'Record Client Payment'}
              </ModalTitle>
              <ModalDescription className="text-xs text-text-muted">
                Record cleared invoice collection. Updates client balance and agency cash flow.
              </ModalDescription>
            </ModalHeader>

            <div className="space-y-4 py-4 flex-1 overflow-y-auto">
              <FormField label="Client" required error={payFormErrors.payClientId}>
                <Select
                  value={payClientId}
                  placeholder="Select client..."
                  onChange={(e) => {
                    setPayClientId(e.target.value);
                    if (payFormErrors.payClientId) setPayFormErrors((prev) => ({ ...prev, payClientId: '' }));
                  }}
                  options={clients.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.business})`,
                  }))}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Payment Date" required error={payFormErrors.payDate}>
                  <Input
                    type="date"
                    value={payDate}
                    onChange={(e) => {
                      setPayDate(e.target.value);
                      if (payFormErrors.payDate) setPayFormErrors((prev) => ({ ...prev, payDate: '' }));
                    }}
                    className={payFormErrors.payDate ? 'border-rose-500' : ''}
                  />
                </FormField>

                <FormField label="Month Covered (YYYY-MM)" hint="Auto-filled from date if empty">
                  <Input
                    placeholder="e.g. 2026-10"
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField label="Amount (₹)" required error={payFormErrors.payAmount}>
                  <MoneyInput
                    value={payAmount}
                    placeholder="0"
                    onChange={(val) => {
                      setPayAmount(val);
                      if (payFormErrors.payAmount) setPayFormErrors((prev) => ({ ...prev, payAmount: '' }));
                    }}
                  />
                </FormField>

                <FormField label="Payment Mode" required error={payFormErrors.payMode}>
                  <Select
                    value={payMode}
                    placeholder="Select mode..."
                    onChange={(e) => {
                      setPayMode(e.target.value as PaymentMode);
                      if (payFormErrors.payMode) setPayFormErrors((prev) => ({ ...prev, payMode: '' }));
                    }}
                    options={[
                      { value: 'bank_transfer', label: 'Bank Transfer' },
                      { value: 'upi', label: 'UPI' },
                      { value: 'cheque', label: 'Cheque' },
                      { value: 'cash', label: 'Cash' },
                    ]}
                  />
                </FormField>

                <FormField label="Payment Status" required error={payFormErrors.payStatus}>
                  <Select
                    value={payStatus}
                    placeholder="Select status..."
                    onChange={(e) => {
                      setPayStatus(e.target.value as PaymentStatus);
                      if (payFormErrors.payStatus) setPayFormErrors((prev) => ({ ...prev, payStatus: '' }));
                    }}
                    options={[
                      { value: 'paid', label: 'Paid' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'partial', label: 'Partial' },
                      { value: 'overdue', label: 'Overdue' },
                    ]}
                  />
                </FormField>
              </div>

              <FormField label="Notes & Reference">
                <Input
                  placeholder="e.g. Axis NEFT ref #98218172"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </FormField>
            </div>

            <ModalFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={createPaymentMutation.isPending || updatePaymentMutation.isPending}
              >
                {editingPayment ? 'Save Payment' : 'Record Payment'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Delete Payment Modal */}
      <Modal open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
        <ModalContent size="sm" variant="center">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2 text-semantic-danger">
              <Trash2 className="w-5 h-5" />
              Delete Payment Transaction?
            </ModalTitle>
            <ModalDescription className="text-xs text-text-muted mt-2">
              Are you sure you want to permanently delete the payment record for{' '}
              <strong className="text-text">{formatINR(paymentToDelete?.amount || 0)}</strong>?
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaymentToDelete(null)}
              disabled={deletePaymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeletePayment}
              isLoading={deletePaymentMutation.isPending}
            >
              Yes, Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add / Edit Expense Modal (Supports multi-line items batch & client switch) */}
      <AddExpenseModal
        open={expenseModalOpen}
        onOpenChange={setExpenseModalOpen}
        editingExpense={editingExpense}
      />

      {/* Delete Expense Modal */}
      <Modal open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <ModalContent size="sm" variant="center">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2 text-semantic-danger">
              <Trash2 className="w-5 h-5" />
              Delete Expense Record?
            </ModalTitle>
            <ModalDescription className="text-xs text-text-muted mt-2">
              Are you sure you want to delete the expense for{' '}
              <strong className="text-text">{formatINR(expenseToDelete?.amount || 0)}</strong> (
              {expenseToDelete?.note})?
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpenseToDelete(null)}
              disabled={deleteExpenseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteExpense}
              isLoading={deleteExpenseMutation.isPending}
            >
              Yes, Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
