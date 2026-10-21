import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/feedback/Toast';
import { Payment, Expense, Client, AgencySettings } from '@/types';
import { formatINR, formatDate, formatMonth } from '@/lib/format';
import { computeCashFlow, CashFlowStatement } from '@/lib/selectors';
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { createPdfDoc, addHeader, addTable, savePdf, exportToCsv } from '@/utils/pdf';
import { format, addMonths, subMonths } from 'date-fns';

export interface CashFlowTabProps {
  payments: Payment[];
  expenses: Expense[];
  clients: Client[];
  settings?: AgencySettings;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export const CashFlowTab: React.FC<CashFlowTabProps> = ({
  payments,
  expenses,
  clients,
  settings,
  selectedMonth,
  onMonthChange,
}) => {
  const toast = useToast();

  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'in' | 'out_fixed' | 'out_variable'>('all');
  const [ledgerClientFilter, setLedgerClientFilter] = useState<string>('all');

  // Month navigation
  const currentDate = useMemo(() => {
    try {
      const [y, m] = selectedMonth.split('-').map(Number);
      return new Date(y, m - 1, 1);
    } catch {
      return new Date();
    }
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    const prev = subMonths(currentDate, 1);
    onMonthChange(format(prev, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const next = addMonths(currentDate, 1);
    onMonthChange(format(next, 'yyyy-MM'));
  };

  // Compute cash flow using pure selectors
  const cashFlow: CashFlowStatement = useMemo(() => {
    return computeCashFlow(selectedMonth, payments, expenses, settings?.initialOpeningBalance);
  }, [payments, expenses, selectedMonth, settings?.initialOpeningBalance]);

  // Filtered ledger entries
  const filteredLedger = useMemo(() => {
    return cashFlow.ledger.filter((entry) => {
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        const descMatch = entry.description.toLowerCase().includes(q);
        const refMatch = entry.reference?.toLowerCase().includes(q);
        const catMatch = entry.category?.toLowerCase().includes(q);
        if (!descMatch && !refMatch && !catMatch) return false;
      }
      if (ledgerTypeFilter === 'in' && entry.type !== 'inflow') return false;
      if (ledgerTypeFilter === 'out_fixed' && (entry.type !== 'outflow' || entry.nature !== 'fixed')) return false;
      if (ledgerTypeFilter === 'out_variable' && (entry.type !== 'outflow' || entry.nature !== 'variable')) return false;
      if (ledgerClientFilter !== 'all' && entry.clientId !== ledgerClientFilter) return false;
      return true;
    });
  }, [cashFlow.ledger, ledgerSearch, ledgerTypeFilter, ledgerClientFilter]);

  // Export handlers
  const handleExportPdf = async () => {
    try {
      const doc = await createPdfDoc({
        title: `Cash Flow Statement - ${formatMonth(selectedMonth)}`,
        period: formatMonth(selectedMonth),
      });

      const startY = addHeader(doc, {
        title: `Cash Flow & Transaction Ledger (${formatMonth(selectedMonth)})`,
        period: `Generated on ${formatDate(new Date())}`,
      });

      const cols = [
        { header: 'Date', dataKey: 'date' },
        { header: 'Description', dataKey: 'description' },
        { header: 'Nature', dataKey: 'nature' },
        { header: 'Money In (₹)', dataKey: 'in', align: 'right' as const },
        { header: 'Money Out (₹)', dataKey: 'out', align: 'right' as const },
        { header: 'Balance (₹)', dataKey: 'balance', align: 'right' as const },
      ];

      const rows: (string | number)[][] = [
        ['—', 'OPENING BALANCE', '—', '—', '—', formatINR(cashFlow.openingBalance)],
      ];

      filteredLedger.forEach((l) => {
        rows.push([
          formatDate(l.date),
          l.description,
          l.nature ? (l.nature === 'fixed' ? 'Fixed' : 'Variable') : 'Revenue',
          l.inflow > 0 ? formatINR(l.inflow) : '—',
          l.outflow > 0 ? formatINR(l.outflow) : '—',
          formatINR(l.runningBalance),
        ]);
      });

      rows.push([
        '—',
        'CLOSING BALANCE',
        '—',
        formatINR(cashFlow.moneyReceived),
        formatINR(cashFlow.fixedExpensesPaid + cashFlow.variableExpensesPaid),
        formatINR(cashFlow.closingBalance),
      ]);

      addTable(doc, startY, cols, rows, { hasTotalsRow: true });
      savePdf(doc, `GetupAgency_CashFlow_${selectedMonth}.pdf`);
      toast.success('PDF Exported', 'Cash flow statement saved.');
    } catch (err: any) {
      toast.error('Export Failed', err.message || 'Could not export PDF.');
    }
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Description', 'Nature', 'Money In', 'Money Out', 'Running Balance'];
    const rows: (string | number)[][] = [
      ['', 'OPENING BALANCE', '', '', '', cashFlow.openingBalance],
    ];

    filteredLedger.forEach((l) => {
      rows.push([
        l.date,
        l.description,
        l.nature || 'revenue',
        l.inflow,
        l.outflow,
        l.runningBalance,
      ]);
    });

    rows.push([
      '',
      'CLOSING BALANCE',
      '',
      cashFlow.moneyReceived,
      cashFlow.fixedExpensesPaid + cashFlow.variableExpensesPaid,
      cashFlow.closingBalance,
    ]);

    exportToCsv(`GetupAgency_CashFlow_${selectedMonth}.csv`, headers, rows);
    toast.success('CSV Exported', 'Cash flow ledger exported.');
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar: Month Picker & Export Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-card border border-border">
        {/* Month Selector: ‹ Oct 2026 › */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Statement Period:</span>
          <div className="flex items-center gap-1 border border-border rounded-control px-2 py-1 bg-surface-subtle">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-surface rounded text-text-muted hover:text-text transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-3 text-text min-w-[100px] text-center">
              {format(currentDate, 'MMM yyyy')}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-surface rounded text-text-muted hover:text-text transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            leftIcon={<FileText className="w-3.5 h-3.5 text-primary-600" />}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Month Cash Flow Reconciliation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {/* Card 1: Opening Balance */}
        <div className="p-4 rounded-card bg-surface border border-border">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
            1. Opening Balance
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-text">{formatINR(cashFlow.openingBalance)}</span>
          </div>
          <span className="text-[10px] text-text-muted mt-1 block">
            Prior month closing balance
          </span>
        </div>

        {/* Card 2: + Money Received */}
        <div className="p-4 rounded-card bg-emerald-50/50 border border-emerald-200">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" /> + Money Received
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-emerald-700">{formatINR(cashFlow.moneyReceived)}</span>
          </div>
          <span className="text-[10px] text-emerald-600 mt-1 block">
            Client retainers marked paid
          </span>
        </div>

        {/* Card 3: - Fixed Expenses Paid */}
        <div className="p-4 rounded-card bg-surface border border-border">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" /> − Fixed Expenses
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-text">{formatINR(cashFlow.fixedExpensesPaid)}</span>
          </div>
          <span className="text-[10px] text-text-muted mt-1 block">
            Salaries, rent, regular software
          </span>
        </div>

        {/* Card 4: - Variable Expenses Paid */}
        <div className="p-4 rounded-card bg-surface border border-border">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5 text-amber-500" /> − Variable Expenses
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-text">{formatINR(cashFlow.variableExpensesPaid)}</span>
          </div>
          <span className="text-[10px] text-text-muted mt-1 block">
            Shoots, petrol, ads, freelance
          </span>
        </div>

        {/* Card 5: = Closing Balance */}
        <div className="p-4 rounded-card bg-primary-50/70 border border-primary-200">
          <span className="text-[11px] font-bold text-primary-900 uppercase tracking-wider block flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5 text-primary-600" /> = Closing Balance
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-primary-700">{formatINR(cashFlow.closingBalance)}</span>
          </div>
          <span className="text-[10px] text-primary-700 mt-1 block">
            Net cash on hand end of month
          </span>
        </div>
      </div>

      {/* 6-Month Cash Flow Trend Chart */}
      <Card className="p-5 border-border">
        <h3 className="text-xs font-bold text-text uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-primary-600" />
          Last 6 Months: Opening vs Closing Cash Balance
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlow.trend} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(val: number) => formatINR(val)}
                labelFormatter={(lbl) => `Month: ${lbl}`}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="opening" name="Opening Balance" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="closing" name="Closing Balance" fill="#0284c7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Day-by-Day Entry Ledger */}
      <Card className="border-border overflow-hidden">
        {/* Ledger Toolbar */}
        <div className="p-3 border-b border-border bg-surface-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-text uppercase tracking-wider">
              Transaction Ledger ({filteredLedger.length} entries)
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search ledger..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-surface border border-border rounded-control text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-600"
              />
            </div>

            {/* Type filter */}
            <select
              value={ledgerTypeFilter}
              onChange={(e) => setLedgerTypeFilter(e.target.value as any)}
              className="text-xs bg-surface border border-border rounded-control px-2 py-1 text-text"
            >
              <option value="all">All Movements</option>
              <option value="in">Inflow (Payments Received)</option>
              <option value="out_fixed">Outflow: Fixed Expenses</option>
              <option value="out_variable">Outflow: Variable Expenses</option>
            </select>

            {/* Client filter */}
            <select
              value={ledgerClientFilter}
              onChange={(e) => setLedgerClientFilter(e.target.value)}
              className="text-xs bg-surface border border-border rounded-control px-2 py-1 text-text"
            >
              <option value="all">All Clients / Agency</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-subtle border-b border-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Category / Nature</th>
                <th className="py-2.5 px-3 text-right">Money In (+)</th>
                <th className="py-2.5 px-3 text-right">Money Out (−)</th>
                <th className="py-2.5 px-4 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Baseline Row: Opening Balance */}
              <tr className="bg-slate-50/60 font-semibold text-text-muted">
                <td className="py-2 px-4 font-mono">1st of Month</td>
                <td className="py-2 px-3 text-text">Opening Cash Balance</td>
                <td className="py-2 px-3">
                  <Badge variant="slate">Baseline</Badge>
                </td>
                <td className="py-2 px-3 text-right text-text-muted">—</td>
                <td className="py-2 px-3 text-right text-text-muted">—</td>
                <td className="py-2 px-4 text-right font-bold text-text font-mono">
                  {formatINR(cashFlow.openingBalance)}
                </td>
              </tr>

              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-text-muted">
                    No transactions recorded for this month matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((entry) => {
                  const isInflow = entry.type === 'inflow';
                  return (
                    <tr key={entry.id} className="hover:bg-surface-subtle/60 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-text-muted whitespace-nowrap">
                        {formatDate(entry.date)}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-text">
                        <span>{entry.description}</span>
                        {entry.reference && (
                          <span className="text-[10px] text-text-muted block">{entry.reference}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {isInflow ? (
                          <Badge variant="success">Payment In</Badge>
                        ) : entry.nature === 'fixed' ? (
                          <Badge variant="slate">Fixed Expense</Badge>
                        ) : (
                          <Badge variant="warning">Variable Expense</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-700">
                        {entry.inflow > 0 ? `+${formatINR(entry.inflow)}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-rose-700">
                        {entry.outflow > 0 ? `−${formatINR(entry.outflow)}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-text">
                        {formatINR(entry.runningBalance)}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Final Row: Closing Balance */}
              <tr className="bg-primary-50/50 font-bold border-t-2 border-border text-primary-900">
                <td className="py-3 px-4 font-mono">End of Month</td>
                <td className="py-3 px-3">Closing Cash Balance</td>
                <td className="py-3 px-3">
                  <Badge variant="primary">Net Cash</Badge>
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-800">
                  +{formatINR(cashFlow.moneyReceived)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-rose-800">
                  −{formatINR(cashFlow.fixedExpensesPaid + cashFlow.variableExpensesPaid)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-primary-700 text-sm">
                  {formatINR(cashFlow.closingBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
