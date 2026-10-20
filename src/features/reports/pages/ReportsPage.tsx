import React, { useState, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useQuery } from '@tanstack/react-query';
import {
  clientService,
  financeService,
  deliverableService,
  taskService,
  teamService,
  calendarService,
  activityLogService,
  authService,
} from '@/services';
import {
  computeAgencyMetrics,
  computeAllClientsMetrics,
} from '@/lib/selectors';
import { formatINR, formatDate, formatPercent } from '@/lib/format';
import { useToast } from '@/components/feedback/Toast';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Users,
  CheckSquare,
  Printer,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import {
  createPdfDoc,
  addHeader,
  addKpiRow,
  addTable,
  savePdf,
  exportToCsv,
} from '@/utils/pdf';
import { useNavigate } from 'react-router-dom';

type ReportTab =
  | 'overview'
  | 'revenue'
  | 'expense'
  | 'profitability'
  | 'deliverables'
  | 'team'
  | 'tasks'
  | 'meetings'
  | 'statement';

type PeriodRange = 'this_month' | 'last_month' | 'quarter' | 'fy' | 'custom';

export const ReportsPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');

  // Period state: default October 2026
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonthNum, setCurrentMonthNum] = useState<number>(10); // 1-12
  const [rangeMode, setRangeMode] = useState<PeriodRange>('this_month');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [statementClientId, setStatementClientId] = useState<string>('');
  const [activityEntityFilter, setActivityEntityFilter] = useState<string>('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Chart DOM refs for PDF capture
  const revenueExpenseChartRef = useRef<HTMLDivElement>(null);
  const profitTrendChartRef = useRef<HTMLDivElement>(null);
  const expenseCatChartRef = useRef<HTMLDivElement>(null);
  const deliverablesTypeChartRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => clientService.getClients() });
  const { data: payments = [] } = useQuery({ queryKey: ['payments'], queryFn: () => financeService.getPayments() });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => financeService.getExpenses() });
  const { data: deliverables = [] } = useQuery({ queryKey: ['deliverables'], queryFn: () => deliverableService.getDeliverables() });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => taskService.getTasks() });
  const { data: teamUsers = [] } = useQuery({ queryKey: ['team'], queryFn: () => teamService.getUsers() });
  const { data: calendarItems = [] } = useQuery({ queryKey: ['calendar'], queryFn: () => calendarService.getItems() });
  const { data: activityLogs = [] } = useQuery({ queryKey: ['activity'], queryFn: () => activityLogService.getActivityLogs(50) });
  const { data: currentUser } = useQuery({ queryKey: ['auth', 'currentUser'], queryFn: () => authService.getCurrentUser() });

  // Period Range Calculation
  const periodDetails = useMemo(() => {
    const monthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
    const dateObj = new Date(currentYear, currentMonthNum - 1, 1);
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    let startMonth = monthStr;
    let endMonth = monthStr;
    let label = monthName;

    if (rangeMode === 'last_month') {
      const prevDate = new Date(currentYear, currentMonthNum - 2, 1);
      const prevYear = prevDate.getFullYear();
      const prevMo = prevDate.getMonth() + 1;
      startMonth = `${prevYear}-${String(prevMo).padStart(2, '0')}`;
      endMonth = startMonth;
      label = prevDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else if (rangeMode === 'quarter') {
      // Quarter: 3 months ending in currentMonth
      const qStartMo = Math.max(1, currentMonthNum - 2);
      startMonth = `${currentYear}-${String(qStartMo).padStart(2, '0')}`;
      endMonth = monthStr;
      label = `Q (${startMonth} to ${endMonth})`;
    } else if (rangeMode === 'fy') {
      // Indian Financial Year: Apr to Mar
      const fyStartYear = currentMonthNum >= 4 ? currentYear : currentYear - 1;
      startMonth = `${fyStartYear}-04`;
      endMonth = `${fyStartYear + 1}-03`;
      label = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
    }

    return {
      selectedMonth: monthStr,
      startMonth,
      endMonth,
      label,
    };
  }, [currentYear, currentMonthNum, rangeMode]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonthNum === 1) {
      setCurrentMonthNum(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthNum((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthNum === 12) {
      setCurrentMonthNum(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthNum((m) => m + 1);
    }
  };

  // Filtered collections based on period & client
  const filteredData = useMemo(() => {
    const { startMonth, endMonth } = periodDetails;

    // Filter clients
    let clis = [...clients];
    if (clientFilter !== 'all') {
      clis = clis.filter((c) => c.id === clientFilter);
    }

    // Filter payments in range
    const pmts = payments.filter((p) => {
      const matchPeriod = p.month >= startMonth && p.month <= endMonth;
      const matchClient = clientFilter === 'all' || p.clientId === clientFilter;
      return matchPeriod && matchClient;
    });

    // Filter expenses in range
    const exps = expenses.filter((e) => {
      const eMonth = e.date.substring(0, 7);
      const matchPeriod = eMonth >= startMonth && eMonth <= endMonth;
      const matchClient = clientFilter === 'all' || !e.clientId || e.clientId === clientFilter;
      return matchPeriod && matchClient;
    });

    // Filter deliverables in range
    const dels = deliverables.filter((d) => {
      const matchPeriod = d.month >= startMonth && d.month <= endMonth;
      const matchClient = clientFilter === 'all' || d.clientId === clientFilter;
      return matchPeriod && matchClient;
    });

    // Combined client metrics & agency totals from shared selectors
    const clientMetrics = computeAllClientsMetrics(clis, pmts, exps, dels, new Date(currentYear, currentMonthNum - 1, 28));
    const agencyMetrics = computeAgencyMetrics(clis, pmts, exps, dels, new Date(currentYear, currentMonthNum - 1, 28));

    return {
      clients: clis,
      payments: pmts,
      expenses: exps,
      deliverables: dels,
      clientMetrics,
      agencyMetrics,
    };
  }, [clients, payments, expenses, deliverables, periodDetails, clientFilter, currentYear, currentMonthNum]);

  // Auto-set statement client
  React.useEffect(() => {
    if (clients.length > 0 && !statementClientId) {
      setStatementClientId(clients[0].id);
    }
  }, [clients, statementClientId]);

  // Derived Month Close Checklist
  const monthCloseChecklist = useMemo(() => {
    const { agencyMetrics, expenses } = filteredData;
    const overdueTasks = tasks.filter((t) => t.status !== 'done' && t.dueDate < new Date().toISOString().split('T')[0]);

    const items = [
      {
        id: 'deliverables',
        title: 'All promised deliverables delivered',
        pass: agencyMetrics.totalDeliverablesRemaining === 0 && agencyMetrics.totalDeliverablesPromised > 0,
        statusText: `${agencyMetrics.totalDeliverablesDelivered} of ${agencyMetrics.totalDeliverablesPromised} delivered (${agencyMetrics.totalDeliverablesRemaining} remaining)`,
        fixUrl: '/clients',
        fixLabel: 'Review Deliverables',
      },
      {
        id: 'payments',
        title: 'All client payments for month recorded',
        pass: agencyMetrics.totalReceived > 0 && agencyMetrics.totalPending === 0,
        statusText: `${formatINR(agencyMetrics.totalReceived)} collected, ${formatINR(agencyMetrics.totalPending)} pending`,
        fixUrl: '/finance',
        fixLabel: 'Record Payments',
      },
      {
        id: 'expenses',
        title: 'Operating expenses logged & reconciled',
        pass: expenses.length > 0,
        statusText: `${expenses.length} expenses logged (${formatINR(agencyMetrics.totalExpenses)})`,
        fixUrl: '/finance',
        fixLabel: 'Log Expenses',
      },
      {
        id: 'tasks',
        title: 'No overdue tasks across active accounts',
        pass: overdueTasks.length === 0,
        statusText: overdueTasks.length === 0 ? 'All tasks on schedule' : `${overdueTasks.length} tasks overdue`,
        fixUrl: '/tasks',
        fixLabel: 'Resolve Tasks',
      },
      {
        id: 'contracts',
        title: 'Client retainer contracts active',
        pass: agencyMetrics.activeClients > 0,
        statusText: `${agencyMetrics.activeClients} active agency retainers (${formatINR(agencyMetrics.totalMonthlyRetainer)}/mo)`,
        fixUrl: '/clients',
        fixLabel: 'Manage Clients',
      },
    ];

    const passedCount = items.filter((i) => i.pass).length;
    return { items, passedCount, totalCount: items.length };
  }, [filteredData, tasks]);

  // Tab definitions
  const tabs: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'revenue', label: 'Revenue Report', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'expense', label: 'Expense Report', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'profitability', label: 'Client Profitability', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'deliverables', label: 'Deliverables Report', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'team', label: 'Team Performance', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'tasks', label: 'Tasks Report', icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { id: 'meetings', label: 'Meetings & Activity', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'statement', label: 'Client Statement', icon: <Printer className="w-3.5 h-3.5" /> },
  ];

  // -------------------------------------------------------------
  // EXPORT GENERATORS (PDF & CSV for Current Tab)
  // -------------------------------------------------------------
  const handleExportTabPdf = async () => {
    setIsExportingPdf(true);
    try {
      const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label || 'Report';
      const doc = await createPdfDoc({
        title: `${activeTabLabel} — Getup Agency`,
        period: periodDetails.label,
        clientFilter: clientFilter !== 'all' ? clients.find((c) => c.id === clientFilter)?.name : 'All Clients',
        generatedBy: currentUser?.name || 'Super Admin',
      });

      let startY = addHeader(doc, {
        title: activeTabLabel,
        period: periodDetails.label,
        clientFilter: clientFilter !== 'all' ? clients.find((c) => c.id === clientFilter)?.name : 'All Clients',
        generatedBy: currentUser?.name || 'Super Admin',
      });

      if (activeTab === 'overview') {
        // Overview KPIs
        const kpis = [
          { label: 'Agreed Retainer', value: formatINR(filteredData.agencyMetrics.totalMonthlyRetainer) },
          { label: 'Total Received', value: formatINR(filteredData.agencyMetrics.totalReceived), isPositive: true },
          { label: 'Pending Collections', value: formatINR(filteredData.agencyMetrics.totalPending), isNegative: filteredData.agencyMetrics.totalPending > 0 },
          { label: 'Operating Expenses', value: formatINR(filteredData.agencyMetrics.totalExpenses) },
          { label: 'Net Profit', value: formatINR(filteredData.agencyMetrics.netProfit), isPositive: filteredData.agencyMetrics.netProfit >= 0, isNegative: filteredData.agencyMetrics.netProfit < 0 },
        ];
        startY = addKpiRow(doc, startY, kpis);

        // Checklist Table
        const checklistCols = [
          { header: 'Month Close Verification Item', dataKey: 'title' },
          { header: 'Status Details', dataKey: 'status' },
          { header: 'Result', dataKey: 'result', align: 'center' as const },
        ];
        const checklistRows = monthCloseChecklist.items.map((i) => [
          i.title,
          i.statusText,
          i.pass ? 'PASS' : 'ACTION NEEDED',
        ]);
        startY = addTable(doc, startY + 4, checklistCols, checklistRows);
      } else if (activeTab === 'revenue') {
        const revCols = [
          { header: 'Client', dataKey: 'name' },
          { header: 'Expected Fee', dataKey: 'expected', align: 'right' as const },
          { header: 'Received', dataKey: 'received', align: 'right' as const },
          { header: 'Pending', dataKey: 'pending', align: 'right' as const },
          { header: 'Overdue', dataKey: 'overdue', align: 'right' as const },
          { header: 'Advance', dataKey: 'advance', align: 'right' as const },
          { header: 'Last Paid', dataKey: 'lastPaid' },
        ];
        const revRows = filteredData.clientMetrics.map((cm) => [
          cm.client.name,
          formatINR(cm.financials.expected),
          formatINR(cm.financials.received),
          formatINR(cm.financials.pending),
          formatINR(cm.financials.overdue),
          formatINR(cm.financials.advance),
          cm.financials.lastPaymentDate ? formatDate(cm.financials.lastPaymentDate) : '—',
        ]);
        // Totals row
        revRows.push([
          'TOTALS',
          formatINR(filteredData.agencyMetrics.totalExpected),
          formatINR(filteredData.agencyMetrics.totalReceived),
          formatINR(filteredData.agencyMetrics.totalPending),
          formatINR(filteredData.agencyMetrics.totalOverdue),
          formatINR(filteredData.agencyMetrics.totalAdvance),
          '—',
        ]);
        startY = addTable(doc, startY, revCols, revRows, { hasTotalsRow: true });
      } else if (activeTab === 'expense') {
        const expCols = [
          { header: 'Date', dataKey: 'date' },
          { header: 'Category', dataKey: 'cat' },
          { header: 'Type / Client', dataKey: 'type' },
          { header: 'Description Note', dataKey: 'note' },
          { header: 'Amount', dataKey: 'amount', align: 'right' as const },
        ];
        const expRows = filteredData.expenses.map((e) => [
          formatDate(e.date),
          e.category.toUpperCase(),
          e.clientId ? `Client: ${clients.find((c) => c.id === e.clientId)?.name || 'Account'}` : 'Agency Operational',
          e.note,
          formatINR(e.amount),
        ]);
        expRows.push(['TOTAL EXPENSES', '—', '—', '—', formatINR(filteredData.agencyMetrics.totalExpenses)]);
        startY = addTable(doc, startY, expCols, expRows, { hasTotalsRow: true });
      } else if (activeTab === 'profitability') {
        const profCols = [
          { header: 'Client Account', dataKey: 'name' },
          { header: 'Collections Received', dataKey: 'received', align: 'right' as const },
          { header: 'Direct Client Expenses', dataKey: 'expenses', align: 'right' as const },
          { header: 'Net Profit', dataKey: 'profit', align: 'right' as const },
          { header: 'Margin %', dataKey: 'margin', align: 'right' as const },
        ];
        const sorted = [...filteredData.clientMetrics].sort((a, b) => b.financials.margin - a.financials.margin);
        const profRows = sorted.map((cm) => [
          cm.client.name,
          formatINR(cm.financials.received),
          formatINR(cm.financials.clientExpenses),
          formatINR(cm.financials.profit),
          formatPercent(cm.financials.margin),
        ]);
        startY = addTable(doc, startY, profCols, profRows);
      } else if (activeTab === 'deliverables') {
        const delCols = [
          { header: 'Client', dataKey: 'name' },
          { header: 'Active Package Types', dataKey: 'types' },
          { header: 'Promised', dataKey: 'promised', align: 'center' as const },
          { header: 'Delivered', dataKey: 'delivered', align: 'center' as const },
          { header: 'Remaining', dataKey: 'remaining', align: 'center' as const },
          { header: 'Fulfillment Status', dataKey: 'status' },
        ];
        const delRows = filteredData.clientMetrics.map((cm) => [
          cm.client.name,
          cm.deliverables.activeTypes.map((t) => `${t.label}: ${t.done}/${t.promised}`).join(', ') || 'No Package',
          cm.deliverables.totalPromised,
          cm.deliverables.totalDone,
          cm.deliverables.totalRemaining,
          cm.deliverables.isBehind ? 'Behind Schedule' : 'On Track (Fulfilled)',
        ]);
        startY = addTable(doc, startY, delCols, delRows);
      } else if (activeTab === 'team') {
        const teamCols = [
          { header: 'Team Member', dataKey: 'name' },
          { header: 'Role', dataKey: 'role' },
          { header: 'Deliverables Done', dataKey: 'dels', align: 'center' as const },
          { header: 'Tasks Done', dataKey: 'tasksDone', align: 'center' as const },
          { header: 'Tasks Overdue', dataKey: 'overdue', align: 'center' as const },
          { header: 'On-Time Rate', dataKey: 'rate', align: 'center' as const },
        ];
        const teamRows = teamUsers.map((u) => {
          const userTasks = tasks.filter((t) => t.assigneeId === u.id);
          const completed = userTasks.filter((t) => t.status === 'done').length;
          const overdue = userTasks.filter((t) => t.status !== 'done' && t.dueDate < new Date().toISOString().split('T')[0]).length;
          const totalT = userTasks.length;
          const rate = totalT > 0 ? Math.round(((totalT - overdue) / totalT) * 100) : 100;
          const delsCount = deliverables.filter((d) => d.assigneeId === u.id && d.status === 'delivered').length;
          return [
            u.name,
            u.role === 'super_admin' ? 'Super Admin' : 'Worker',
            delsCount,
            completed,
            overdue,
            `${rate}%`,
          ];
        });
        startY = addTable(doc, startY, teamCols, teamRows);
      } else if (activeTab === 'tasks') {
        const taskCols = [
          { header: 'Task Title', dataKey: 'title' },
          { header: 'Assignee', dataKey: 'assignee' },
          { header: 'Client', dataKey: 'client' },
          { header: 'Due Date', dataKey: 'due' },
          { header: 'Status', dataKey: 'status' },
          { header: 'Priority', dataKey: 'priority' },
        ];
        const taskRows = tasks.map((t) => [
          t.title,
          teamUsers.find((u) => u.id === t.assigneeId)?.name || 'Unassigned',
          clients.find((c) => c.id === t.clientId)?.name || 'Internal Agency',
          formatDate(t.dueDate),
          t.status.toUpperCase(),
          t.priority.toUpperCase(),
        ]);
        startY = addTable(doc, startY, taskCols, taskRows);
      } else if (activeTab === 'statement') {
        const statementClient = clients.find((c) => c.id === statementClientId) || clients[0];
        const clientMetric = filteredData.clientMetrics.find((m) => m.client.id === statementClient?.id);

        if (statementClient && clientMetric) {
          const kpis = [
            { label: 'Monthly Retainer', value: formatINR(statementClient.monthlyFee) },
            { label: 'Total Received', value: formatINR(clientMetric.financials.received), isPositive: true },
            { label: 'Pending Balance', value: formatINR(clientMetric.financials.pending), isNegative: clientMetric.financials.pending > 0 },
            { label: 'Client Expenses', value: formatINR(clientMetric.financials.clientExpenses) },
            { label: 'Net Margin', value: formatPercent(clientMetric.financials.margin) },
          ];
          startY = addKpiRow(doc, startY, kpis);

          const pmtCols = [
            { header: 'Payment Date', dataKey: 'date' },
            { header: 'Month Billed', dataKey: 'month' },
            { header: 'Mode', dataKey: 'mode' },
            { header: 'Amount Received', dataKey: 'amount', align: 'right' as const },
          ];
          const clientPmts = payments.filter((p) => p.clientId === statementClient.id);
          const pmtRows = clientPmts.map((p) => [
            formatDate(p.date),
            p.month,
            (p.mode || 'bank_transfer').replace('_', ' ').toUpperCase(),
            formatINR(p.amount),
          ]);
          pmtRows.push(['TOTAL RECEIVED', '—', '—', formatINR(clientMetric.financials.received)]);
          startY = addTable(doc, startY + 4, pmtCols, pmtRows, { hasTotalsRow: true });
        }
      }

      savePdf(doc, `GetupAgency_${activeTab.toUpperCase()}_${periodDetails.label.replace(/\s+/g, '-')}.pdf`);
      toast.success('PDF Downloaded', `Exported ${activeTabLabel} directly as PDF.`);
    } catch (err: any) {
      toast.error('PDF Export Error', err.message || 'Could not generate PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportTabCsv = () => {
    const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label || 'Report';
    const cleanPeriod = periodDetails.label.replace(/\s+/g, '-');

    if (activeTab === 'revenue') {
      const headers = ['Client', 'Expected', 'Received', 'Pending', 'Overdue', 'Advance', 'Last Payment Date'];
      const rows = filteredData.clientMetrics.map((cm) => [
        cm.client.name,
        cm.financials.expected,
        cm.financials.received,
        cm.financials.pending,
        cm.financials.overdue,
        cm.financials.advance,
        cm.financials.lastPaymentDate ? formatDate(cm.financials.lastPaymentDate) : '—',
      ]);
      exportToCsv(`GetupAgency_Revenue_${cleanPeriod}.csv`, headers, rows);
    } else if (activeTab === 'expense') {
      const headers = ['Date', 'Category', 'Type', 'Description', 'Amount'];
      const rows = filteredData.expenses.map((e) => [
        e.date,
        e.category,
        e.clientId ? `Client: ${clients.find((c) => c.id === e.clientId)?.name || e.clientId}` : 'Agency',
        e.note,
        e.amount,
      ]);
      exportToCsv(`GetupAgency_Expenses_${cleanPeriod}.csv`, headers, rows);
    } else if (activeTab === 'profitability') {
      const headers = ['Client', 'Monthly Fee', 'Received', 'Client Expenses', 'Net Profit', 'Margin %'];
      const rows = filteredData.clientMetrics.map((cm) => [
        cm.client.name,
        cm.client.monthlyFee,
        cm.financials.received,
        cm.financials.clientExpenses,
        cm.financials.profit,
        `${cm.financials.margin}%`,
      ]);
      exportToCsv(`GetupAgency_Profitability_${cleanPeriod}.csv`, headers, rows);
    } else if (activeTab === 'deliverables') {
      const headers = ['Client', 'Active Packages', 'Total Promised', 'Total Done', 'Total Remaining', 'Status'];
      const rows = filteredData.clientMetrics.map((cm) => [
        cm.client.name,
        cm.deliverables.activeTypes.map((t) => `${t.label}:${t.done}/${t.promised}`).join(' | '),
        cm.deliverables.totalPromised,
        cm.deliverables.totalDone,
        cm.deliverables.totalRemaining,
        cm.deliverables.isBehind ? 'Behind' : 'On Track',
      ]);
      exportToCsv(`GetupAgency_Deliverables_${cleanPeriod}.csv`, headers, rows);
    } else if (activeTab === 'team') {
      const headers = ['Team Member', 'Role', 'Tasks Completed', 'Tasks Overdue', 'Deliverables Done'];
      const rows = teamUsers.map((u) => {
        const userTasks = tasks.filter((t) => t.assigneeId === u.id);
        const completed = userTasks.filter((t) => t.status === 'done').length;
        const overdue = userTasks.filter((t) => t.status !== 'done' && t.dueDate < new Date().toISOString().split('T')[0]).length;
        const dels = deliverables.filter((d) => d.assigneeId === u.id && d.status === 'delivered').length;
        return [u.name, u.role, completed, overdue, dels];
      });
      exportToCsv(`GetupAgency_Team_${cleanPeriod}.csv`, headers, rows);
    } else {
      toast.info('Export CSV', 'Exporting current report view data.');
      const headers = ['Metric', 'Value'];
      const rows = [
        ['Agreed Retainer', filteredData.agencyMetrics.totalMonthlyRetainer],
        ['Total Received', filteredData.agencyMetrics.totalReceived],
        ['Pending Collections', filteredData.agencyMetrics.totalPending],
        ['Total Operating Expenses', filteredData.agencyMetrics.totalExpenses],
        ['Net Agency Profit', filteredData.agencyMetrics.netProfit],
      ];
      exportToCsv(`GetupAgency_${activeTabLabel}_${cleanPeriod}.csv`, headers, rows);
    }
    toast.success('CSV Exported', 'Data exported to CSV format.');
  };

  // Full Combined PDF Report Generator (All Tabs)
  const handleExportFullReport = async () => {
    setIsExportingPdf(true);
    try {
      const doc = await createPdfDoc({
        title: 'Executive Agency Master Intelligence Report',
        period: periodDetails.label,
        generatedBy: currentUser?.name || 'Super Admin',
      });

      let startY = addHeader(doc, {
        title: 'Executive Master Intelligence Report',
        period: periodDetails.label,
        generatedBy: currentUser?.name || 'Super Admin',
      });

      // Cover / Executive Summary KPI block
      const kpis = [
        { label: 'Retainer Billing', value: formatINR(filteredData.agencyMetrics.totalMonthlyRetainer) },
        { label: 'Total Received', value: formatINR(filteredData.agencyMetrics.totalReceived), isPositive: true },
        { label: 'Pending to Collect', value: formatINR(filteredData.agencyMetrics.totalPending), isNegative: filteredData.agencyMetrics.totalPending > 0 },
        { label: 'Expenses', value: formatINR(filteredData.agencyMetrics.totalExpenses) },
        { label: 'Net Agency Profit', value: formatINR(filteredData.agencyMetrics.netProfit), isPositive: filteredData.agencyMetrics.netProfit >= 0, isNegative: filteredData.agencyMetrics.netProfit < 0 },
      ];
      startY = addKpiRow(doc, startY, kpis);

      // Section 1: Revenue Table
      const revCols = [
        { header: 'Client Account', dataKey: 'name' },
        { header: 'Expected', dataKey: 'expected', align: 'right' as const },
        { header: 'Received', dataKey: 'received', align: 'right' as const },
        { header: 'Pending', dataKey: 'pending', align: 'right' as const },
        { header: 'Overdue', dataKey: 'overdue', align: 'right' as const },
      ];
      const revRows = filteredData.clientMetrics.map((cm) => [
        cm.client.name,
        formatINR(cm.financials.expected),
        formatINR(cm.financials.received),
        formatINR(cm.financials.pending),
        formatINR(cm.financials.overdue),
      ]);
      startY = addTable(doc, startY + 4, revCols, revRows);

      // Section 2: Deliverables Summary
      const delCols = [
        { header: 'Client', dataKey: 'name' },
        { header: 'Promised', dataKey: 'prom', align: 'center' as const },
        { header: 'Delivered', dataKey: 'del', align: 'center' as const },
        { header: 'Remaining', dataKey: 'rem', align: 'center' as const },
        { header: 'Status', dataKey: 'status' },
      ];
      const delRows = filteredData.clientMetrics.map((cm) => [
        cm.client.name,
        cm.deliverables.totalPromised,
        cm.deliverables.totalDone,
        cm.deliverables.totalRemaining,
        cm.deliverables.isBehind ? 'Behind' : 'Fulfilled',
      ]);
      startY = addTable(doc, startY + 4, delCols, delRows);

      // Section 3: Month Close Checklist Status
      const chkCols = [
        { header: 'Audit Item', dataKey: 'title' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Result', dataKey: 'res', align: 'center' as const },
      ];
      const chkRows = monthCloseChecklist.items.map((i) => [
        i.title,
        i.statusText,
        i.pass ? 'PASS' : 'ACTION NEEDED',
      ]);
      addTable(doc, startY + 4, chkCols, chkRows);

      savePdf(doc, `GetupAgency_FullMasterReport_${periodDetails.label.replace(/\s+/g, '-')}.pdf`);
      toast.success('Master PDF Downloaded', 'Full executive report compiled and saved.');
    } catch (err: any) {
      toast.error('Master Export Failed', err.message || 'Could not compile master PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // -------------------------------------------------------------
  // CHART DATASETS
  // -------------------------------------------------------------
  // 1. Last 6 Months Revenue vs Expense
  const revenueVsExpenseData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonthNum - 1 - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = d.toLocaleDateString('en-US', { month: 'short' });

      const mReceived = payments
        .filter((p) => p.month === mStr && p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      const mExpense = expenses
        .filter((e) => e.date.substring(0, 7) === mStr)
        .reduce((sum, e) => sum + e.amount, 0);

      data.push({
        month: mLabel,
        Received: mReceived,
        Expenses: mExpense,
        Profit: mReceived - mExpense,
      });
    }
    return data;
  }, [currentYear, currentMonthNum, payments, expenses]);

  // 2. Expense by Category
  const expenseByCategoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredData.expenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });

    return Object.entries(catMap).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
    }));
  }, [filteredData.expenses]);

  const PIE_COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

  // 3. Deliverables per type
  const deliverablesTypeData = useMemo(() => {
    const counts = { video: 0, reel: 0, post: 0, story: 0 };
    filteredData.deliverables.forEach((d) => {
      if (counts[d.type] !== undefined) counts[d.type]++;
    });
    return [
      { name: 'Videos', count: counts.video, fill: '#059669' },
      { name: 'Reels', count: counts.reel, fill: '#3b82f6' },
      { name: 'Posts', count: counts.post, fill: '#f59e0b' },
      { name: 'Stories', count: counts.story, fill: '#ec4899' },
    ];
  }, [filteredData.deliverables]);

  return (
    <div className="space-y-6 pb-16">
      {/* Page Title */}
      <PageHeader
        title="Agency Reporting Hub"
        subtitle={`Audit deliverables, collection health, client margins, and team throughput for ${periodDetails.label}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportFullReport}
              disabled={isExportingPdf}
              leftIcon={<Download className="w-3.5 h-3.5 text-primary-600" />}
            >
              Export Full Report (All Tabs)
            </Button>
          </div>
        }
      />

      {/* TOP SLIM TOOLBAR (One Slim Row) */}
      <div className="p-2.5 rounded-card bg-surface border border-border shadow-soft flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Period Month Navigation */}
        <div className="flex items-center gap-1.5 bg-surface-subtle p-1 rounded-control border border-border">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-surface text-text-muted hover:text-text transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-text px-2 min-w-[90px] text-center select-none">
            {periodDetails.label}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-surface text-text-muted hover:text-text transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-control border border-border">
          {(
            [
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'quarter', label: 'Quarter' },
              { id: 'fy', label: 'Financial Year' },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRangeMode(r.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                rangeMode === r.id
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-text-muted hover:text-text hover:bg-surface'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Client Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted hidden sm:inline">Client:</span>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="text-xs p-1.5 rounded-control border border-border bg-surface text-text font-medium min-w-[140px]"
          >
            <option value="all">All Clients ({clients.length})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Export Split Buttons for Current Tab */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTabCsv}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="h-8 px-2.5 text-xs"
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportTabPdf}
            disabled={isExportingPdf}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="h-8 px-2.5 text-xs"
          >
            {isExportingPdf ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* TABS NAVIGATION BAR */}
      <div className="border-b border-border">
        <nav className="flex space-x-1 overflow-x-auto pb-px">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 py-2.5 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-primary-600 text-primary-700 bg-primary-50/40'
                    : 'border-transparent text-text-muted hover:text-text hover:border-border'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW                                                           */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-3 border-border">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Agreed Billing</span>
              <span className="text-base font-bold text-text tabular-nums block mt-1">
                {formatINR(filteredData.agencyMetrics.totalMonthlyRetainer)}
              </span>
              <span className="text-[10px] text-text-muted">{filteredData.clients.length} accounts</span>
            </Card>

            <Card className="p-3 border-border bg-emerald-50/20">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Received Cash</span>
              <span className="text-base font-bold text-emerald-700 tabular-nums block mt-1">
                {formatINR(filteredData.agencyMetrics.totalReceived)}
              </span>
              <span className="text-[10px] text-emerald-700">Collections recorded</span>
            </Card>

            <Card className="p-3 border-border bg-rose-50/20">
              <span className="text-[10px] uppercase font-bold text-rose-800 block">Pending to Collect</span>
              <span className="text-base font-bold text-rose-700 tabular-nums block mt-1">
                {formatINR(filteredData.agencyMetrics.totalPending)}
              </span>
              <span className="text-[10px] text-rose-700">Outstanding balance</span>
            </Card>

            <Card className="p-3 border-border">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Total Expenses</span>
              <span className="text-base font-bold text-text tabular-nums block mt-1">
                {formatINR(filteredData.agencyMetrics.totalExpenses)}
              </span>
              <span className="text-[10px] text-text-muted">{filteredData.expenses.length} records</span>
            </Card>

            <Card className="p-3 border-border bg-primary-50/20">
              <span className="text-[10px] uppercase font-bold text-primary-800 block">Net Profit</span>
              <span
                className={`text-base font-bold tabular-nums block mt-1 ${
                  filteredData.agencyMetrics.netProfit >= 0 ? 'text-primary-700' : 'text-rose-600'
                }`}
              >
                {formatINR(filteredData.agencyMetrics.netProfit)}
              </span>
              <span className="text-[10px] text-primary-700">Margin: {filteredData.agencyMetrics.profitMargin}%</span>
            </Card>

            <Card className="p-3 border-border">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Deliverables Done</span>
              <span className="text-base font-bold text-text tabular-nums block mt-1">
                {filteredData.agencyMetrics.totalDeliverablesDelivered} / {filteredData.agencyMetrics.totalDeliverablesPromised}
              </span>
              <span className="text-[10px] text-text-muted">{filteredData.agencyMetrics.totalDeliverablesPercent}% complete</span>
            </Card>
          </div>

          {/* Month Close Checklist & Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Computed Month Close Checklist */}
            <div className="lg:col-span-5">
              <Card className="border-border p-5 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Month Close Checklist
                    </CardTitle>
                    <Badge variant={monthCloseChecklist.passedCount === monthCloseChecklist.totalCount ? 'success' : 'slate'}>
                      {monthCloseChecklist.passedCount}/{monthCloseChecklist.totalCount} Passed
                    </Badge>
                  </div>

                  <p className="text-[11px] text-text-muted mt-2 mb-4">
                    Computed live against real database records for {periodDetails.label}.
                  </p>

                  <div className="space-y-3">
                    {monthCloseChecklist.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-control border border-border bg-surface-subtle flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          {item.pass ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-bold text-text block leading-tight">{item.title}</span>
                            <span className="text-[11px] text-text-muted block mt-0.5">{item.statusText}</span>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(item.fixUrl)}
                          className="text-[11px] h-6 px-2 text-primary-700 hover:text-primary-800 shrink-0"
                        >
                          {item.fixLabel} <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
                  <span>Reconciled as of {formatDate(new Date().toISOString())}</span>
                  <span className="font-semibold text-text">Real Computed Status</span>
                </div>
              </Card>
            </div>

            {/* Right: Revenue vs Expense Chart */}
            <div className="lg:col-span-7">
              <Card className="border-border p-5">
                <CardTitle className="text-sm font-bold mb-4">Revenue vs Expense Trend (Last 6 Months)</CardTitle>
                <div ref={revenueExpenseChartRef} className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueVsExpenseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                      <RechartsTooltip formatter={(val: number) => formatINR(val)} />
                      <Legend />
                      <Bar dataKey="Received" fill="#059669" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>

          {/* Bottom Grid: Net Profit & Category breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border p-5">
              <CardTitle className="text-sm font-bold mb-4">Net Profit Distribution</CardTitle>
              <div ref={profitTrendChartRef} className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueVsExpenseData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                    <RechartsTooltip formatter={(val: number) => formatINR(val)} />
                    <Line type="monotone" dataKey="Profit" stroke="#059669" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="border-border p-5">
              <CardTitle className="text-sm font-bold mb-4">Expenses by Category</CardTitle>
              <div ref={expenseCatChartRef} className="h-56 w-full flex items-center justify-center">
                {expenseByCategoryData.length === 0 ? (
                  <span className="text-xs text-text-muted italic">No expenses recorded for this period.</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseByCategoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        label={(entry) => `${entry.name}: ${formatINR(entry.value)}`}
                      >
                        {expenseByCategoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: number) => formatINR(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REVENUE REPORT                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Aging Buckets Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-card bg-surface border border-border">
              <span className="text-[10px] uppercase font-bold text-text-muted block">0 - 30 Days Aging</span>
              <span className="text-lg font-bold text-text tabular-nums block mt-1">
                {formatINR(filteredData.agencyMetrics.totalPending)}
              </span>
              <span className="text-[10px] text-text-muted">Current billing period collections</span>
            </div>

            <div className="p-3.5 rounded-card bg-surface border border-border">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">31 - 60 Days Aging</span>
              <span className="text-lg font-bold text-amber-600 tabular-nums block mt-1">
                {formatINR(filteredData.agencyMetrics.totalOverdue)}
              </span>
              <span className="text-[10px] text-text-muted">Overdue by 1 month</span>
            </div>

            <div className="p-3.5 rounded-card bg-surface border border-border">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">60+ Days Delinquent</span>
              <span className="text-lg font-bold text-rose-600 tabular-nums block mt-1">₹0</span>
              <span className="text-[10px] text-text-muted">Critical collection follow-up</span>
            </div>
          </div>

          {/* Client-wise Revenue Table */}
          <Card className="border-border overflow-hidden">
            <CardHeader className="p-4 border-b border-border flex items-center justify-between">
              <CardTitle className="text-sm font-bold">Client-Wise Revenue & Collections</CardTitle>
              <Badge variant="primary">{filteredData.clientMetrics.length} Accounts</Badge>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-subtle text-text-muted uppercase text-[10px] font-bold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3 text-right">Expected</th>
                    <th className="py-2.5 px-3 text-right">Received</th>
                    <th className="py-2.5 px-3 text-right">Pending</th>
                    <th className="py-2.5 px-3 text-right">Overdue</th>
                    <th className="py-2.5 px-3 text-right">Advance/Credit</th>
                    <th className="py-2.5 px-3">Last Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredData.clientMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-text-muted italic">
                        No clients found for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredData.clientMetrics.map((cm) => (
                      <tr key={cm.client.id} className="hover:bg-surface-subtle/50">
                        <td className="py-2.5 px-3 font-bold text-text">{cm.client.name}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{formatINR(cm.financials.expected)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700 font-semibold">
                          {formatINR(cm.financials.received)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-rose-600">
                          {formatINR(cm.financials.pending)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-rose-700">
                          {formatINR(cm.financials.overdue)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-text-muted">
                          {formatINR(cm.financials.advance)}
                        </td>
                        <td className="py-2.5 px-3 text-text-muted">
                          {cm.financials.lastPaymentDate ? formatDate(cm.financials.lastPaymentDate) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                  {/* Totals Row */}
                  <tr className="bg-surface-subtle font-bold text-text border-t-2 border-border">
                    <td className="py-2.5 px-3">TOTALS</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {formatINR(filteredData.agencyMetrics.totalExpected)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700">
                      {formatINR(filteredData.agencyMetrics.totalReceived)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-rose-600">
                      {formatINR(filteredData.agencyMetrics.totalPending)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-rose-700">
                      {formatINR(filteredData.agencyMetrics.totalOverdue)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {formatINR(filteredData.agencyMetrics.totalAdvance)}
                    </td>
                    <td className="py-2.5 px-3">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EXPENSE REPORT                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'expense' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-3.5 border-border">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Total Operating Expenses</span>
              <span className="text-lg font-bold text-text tabular-nums block mt-1">
                {formatINR(filteredData.agencyMetrics.totalExpenses)}
              </span>
              <span className="text-[10px] text-text-muted">{filteredData.expenses.length} expense items</span>
            </Card>

            <Card className="p-3.5 border-border">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Direct Client Expenses</span>
              <span className="text-lg font-bold text-text tabular-nums block mt-1">
                {formatINR(filteredData.agencyMetrics.clientExpenses)}
              </span>
              <span className="text-[10px] text-text-muted">Tagged to specific accounts</span>
            </Card>

            <Card className="p-3.5 border-border">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Agency Overhead</span>
              <span className="text-lg font-bold text-text tabular-nums block mt-1">
                {formatINR(filteredData.agencyMetrics.agencyExpenses)}
              </span>
              <span className="text-[10px] text-text-muted">Software, rent, equipment</span>
            </Card>
          </div>

          {/* Top 10 Expenses Table */}
          <Card className="border-border overflow-hidden">
            <CardHeader className="p-4 border-b border-border">
              <CardTitle className="text-sm font-bold">Top Expense Records</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-subtle text-text-muted uppercase text-[10px] font-bold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Account Scope</th>
                    <th className="py-2.5 px-3">Description Note</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredData.expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-text-muted italic">
                        No expenses logged for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredData.expenses.slice(0, 10).map((e) => (
                      <tr key={e.id} className="hover:bg-surface-subtle/50">
                        <td className="py-2 px-3 text-text-muted">{formatDate(e.date)}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-subtle border border-border">
                            {e.category}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {e.clientId ? (
                            <Badge variant="primary" size="sm">
                              Client: {clients.find((c) => c.id === e.clientId)?.name || 'Account'}
                            </Badge>
                          ) : (
                            <Badge variant="slate" size="sm">Agency Overhead</Badge>
                          )}
                        </td>
                        <td className="py-2 px-3 font-medium text-text">{e.note}</td>
                        <td className="py-2 px-3 text-right font-bold text-text tabular-nums">
                          {formatINR(e.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CLIENT PROFITABILITY                                               */}
      {/* ========================================================================= */}
      {activeTab === 'profitability' && (
        <div className="space-y-6">
          {/* Unprofitable Accounts Warning */}
          {filteredData.clientMetrics.some((cm) => cm.financials.profit < 0) && (
            <div className="p-4 rounded-card bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-xs block">Attention: Negative Margin Detected</span>
                <span className="text-[11px] text-rose-700 block mt-0.5">
                  One or more client accounts incur higher operating expenses than payments received. Review team workload or increase retainer fees.
                </span>
              </div>
            </div>
          )}

          <Card className="border-border overflow-hidden">
            <CardHeader className="p-4 border-b border-border flex items-center justify-between">
              <CardTitle className="text-sm font-bold">Client Profitability Ranking (Best to Worst Margin)</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-subtle text-text-muted uppercase text-[10px] font-bold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Rank & Client</th>
                    <th className="py-2.5 px-3 text-right">Collections Received</th>
                    <th className="py-2.5 px-3 text-right">Direct Expenses</th>
                    <th className="py-2.5 px-3 text-right">Net Profit</th>
                    <th className="py-2.5 px-3 text-right">Profit Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...filteredData.clientMetrics]
                    .sort((a, b) => b.financials.margin - a.financials.margin)
                    .map((cm, idx) => {
                      const isNegative = cm.financials.profit < 0;
                      return (
                        <tr key={cm.client.id} className="hover:bg-surface-subtle/50">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-text-muted mr-2 tabular-nums">#{idx + 1}</span>
                            <span className="font-bold text-text">{cm.client.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700 font-semibold">
                            {formatINR(cm.financials.received)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-rose-600">
                            {formatINR(cm.financials.clientExpenses)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right tabular-nums font-bold ${
                              isNegative ? 'text-rose-600' : 'text-primary-700'
                            }`}
                          >
                            {formatINR(cm.financials.profit)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right tabular-nums font-bold ${
                              isNegative ? 'text-rose-600' : 'text-primary-700'
                            }`}
                          >
                            {formatPercent(cm.financials.margin)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DELIVERABLES REPORT                                                */}
      {/* ========================================================================= */}
      {activeTab === 'deliverables' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <Card className="border-border overflow-hidden">
                <CardHeader className="p-4 border-b border-border">
                  <CardTitle className="text-sm font-bold">Client Deliverables Fulfillment</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-subtle text-text-muted uppercase text-[10px] font-bold border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3">Client</th>
                        <th className="py-2.5 px-3">Active Deliverables</th>
                        <th className="py-2.5 px-3 text-center">Promised</th>
                        <th className="py-2.5 px-3 text-center">Done</th>
                        <th className="py-2.5 px-3 text-center">Remaining</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredData.clientMetrics.map((cm) => (
                        <tr key={cm.client.id} className="hover:bg-surface-subtle/50">
                          <td className="py-2.5 px-3 font-bold text-text">{cm.client.name}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {cm.deliverables.activeTypes.map((t) => (
                                <span
                                  key={t.type}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-subtle border border-border"
                                >
                                  {t.label}: {t.done}/{t.promised}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold tabular-nums">
                            {cm.deliverables.totalPromised}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold tabular-nums text-emerald-700">
                            {cm.deliverables.totalDone}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold tabular-nums text-rose-600">
                            {cm.deliverables.totalRemaining}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant={cm.deliverables.isBehind ? 'danger' : 'success'} size="sm">
                              {cm.deliverables.isBehind ? 'Behind Schedule' : 'On Track'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4">
              <Card className="border-border p-5">
                <CardTitle className="text-sm font-bold mb-4">Completed by Type</CardTitle>
                <div ref={deliverablesTypeChartRef} className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deliverablesTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: TEAM PERFORMANCE                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'team' && (
        <Card className="border-border overflow-hidden">
          <CardHeader className="p-4 border-b border-border">
            <CardTitle className="text-sm font-bold">Team Member Throughput & On-Time Rate</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-subtle text-text-muted uppercase text-[10px] font-bold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Team Member</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3 text-center">Deliverables Done</th>
                  <th className="py-2.5 px-3 text-center">Tasks Completed</th>
                  <th className="py-2.5 px-3 text-center">Tasks Overdue</th>
                  <th className="py-2.5 px-3 text-center">On-Time %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teamUsers.map((u) => {
                  const userTasks = tasks.filter((t) => t.assigneeId === u.id);
                  const completed = userTasks.filter((t) => t.status === 'done').length;
                  const overdue = userTasks.filter((t) => t.status !== 'done' && t.dueDate < new Date().toISOString().split('T')[0]).length;
                  const totalT = userTasks.length;
                  const onTimeRate = totalT > 0 ? Math.round(((totalT - overdue) / totalT) * 100) : 100;
                  const userDeliverablesDone = deliverables.filter((d) => d.assigneeId === u.id && d.status === 'delivered').length;

                  return (
                    <tr key={u.id} className="hover:bg-surface-subtle/50">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={u.name} src={u.avatar} size="sm" />
                          <span className="font-bold text-text">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={u.role === 'super_admin' ? 'primary' : 'success'} size="sm">
                          {u.role === 'super_admin' ? 'Super Admin' : 'Worker'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold tabular-nums">{userDeliverablesDone}</td>
                      <td className="py-2.5 px-3 text-center font-bold tabular-nums text-emerald-700">{completed}</td>
                      <td className="py-2.5 px-3 text-center font-bold tabular-nums text-rose-600">{overdue}</td>
                      <td className="py-2.5 px-3 text-center font-bold tabular-nums text-primary-700">{onTimeRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: TASKS REPORT                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                { label: 'To Do', count: tasks.filter((t) => t.status === 'todo').length, color: 'text-text' },
                { label: 'In Progress', count: tasks.filter((t) => t.status === 'doing' || t.status === 'in_progress').length, color: 'text-blue-600' },
                { label: 'Review', count: tasks.filter((t) => t.status === 'review').length, color: 'text-amber-600' },
                { label: 'Completed', count: tasks.filter((t) => t.status === 'done').length, color: 'text-emerald-600' },
              ] as const
            ).map((s) => (
              <div key={s.label} className="p-3.5 rounded-card bg-surface border border-border text-center">
                <span className="text-[10px] uppercase font-bold text-text-muted block">{s.label}</span>
                <span className={`text-xl font-bold tabular-nums block mt-1 ${s.color}`}>{s.count}</span>
              </div>
            ))}
          </div>

          <Card className="border-border overflow-hidden">
            <CardHeader className="p-4 border-b border-border">
              <CardTitle className="text-sm font-bold">Active & Overdue Tasks</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-subtle text-text-muted uppercase text-[10px] font-bold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Task Title</th>
                    <th className="py-2.5 px-3">Assignee</th>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.slice(0, 15).map((t) => {
                    const isOverdue = t.status !== 'done' && t.dueDate < new Date().toISOString().split('T')[0];
                    return (
                      <tr key={t.id} className="hover:bg-surface-subtle/50">
                        <td className="py-2.5 px-3 font-semibold text-text">{t.title}</td>
                        <td className="py-2.5 px-3 text-text-muted">
                          {teamUsers.find((u) => u.id === t.assigneeId)?.name || 'Unassigned'}
                        </td>
                        <td className="py-2.5 px-3 text-text-muted">
                          {clients.find((c) => c.id === t.clientId)?.name || 'Internal'}
                        </td>
                        <td className={`py-2.5 px-3 ${isOverdue ? 'text-rose-600 font-bold' : 'text-text-muted'}`}>
                          {formatDate(t.dueDate)} {isOverdue && '(Overdue)'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-subtle border border-border">
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={t.status === 'done' ? 'success' : 'slate'} size="sm">
                            {t.status.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: MEETINGS AND ACTIVITY                                              */}
      {/* ========================================================================= */}
      {activeTab === 'meetings' && (
        <div className="space-y-6">
          <Card className="border-border overflow-hidden">
            <CardHeader className="p-4 border-b border-border flex items-center justify-between">
              <CardTitle className="text-sm font-bold">Meetings Held in Period</CardTitle>
              <Badge variant="primary">{calendarItems.filter((i) => i.type === 'meeting').length} Total Meetings</Badge>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-subtle text-text-muted uppercase text-[10px] font-bold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Meeting Title</th>
                    <th className="py-2.5 px-3">Client Account</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Location / Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {calendarItems.filter((i) => i.type === 'meeting').length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-text-muted italic">
                        No meetings recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    calendarItems
                      .filter((i) => i.type === 'meeting')
                      .map((m) => (
                        <tr key={m.id} className="hover:bg-surface-subtle/50">
                          <td className="py-2.5 px-3 text-text-muted">{formatDate(m.date)}</td>
                          <td className="py-2.5 px-3 font-bold text-text">{m.title}</td>
                          <td className="py-2.5 px-3 text-text-muted">
                            {clients.find((c) => c.id === m.clientId)?.name || 'Internal Team'}
                          </td>
                          <td className="py-2.5 px-3 text-text-muted">
                            {m.startTime || '—'} - {m.endTime || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-text-muted">{m.location || m.locationOrLink || 'Video Meet'}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Activity Log */}
          <Card className="border-border p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <CardTitle className="text-sm font-bold">Recent System Activity Audit</CardTitle>
              <select
                value={activityEntityFilter}
                onChange={(e) => setActivityEntityFilter(e.target.value)}
                className="text-xs p-1 rounded-control border border-border bg-surface"
              >
                <option value="all">All Activities</option>
                <option value="client">Clients</option>
                <option value="payment">Payments</option>
                <option value="expense">Expenses</option>
                <option value="task">Tasks</option>
              </select>
            </div>

            <div className="space-y-2">
              {activityLogs
                .filter((l) => activityEntityFilter === 'all' || l.entity === activityEntityFilter)
                .slice(0, 10)
                .map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-control bg-surface-subtle border border-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-text">{log.actorName}</span>{' '}
                      <span className="text-text-muted">{log.action}</span>{' '}
                      <span className="font-semibold text-primary-700">{log.entity}</span>
                    </div>
                    <span className="text-[10px] text-text-muted">{formatDate(log.at)}</span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: CLIENT STATEMENT (PRINTABLE & EXPORTABLE)                          */}
      {/* ========================================================================= */}
      {activeTab === 'statement' && (
        <div className="space-y-6">
          {/* Statement Toolbar */}
          <div className="p-4 rounded-card bg-surface border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-text">Select Client Account:</span>
              <select
                value={statementClientId}
                onChange={(e) => setStatementClientId(e.target.value)}
                className="text-xs p-2 rounded-control border border-border bg-surface text-text font-bold min-w-[200px]"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.business})
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleExportTabPdf}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              Export Statement PDF
            </Button>
          </div>

          {/* Statement View Layout */}
          {(() => {
            const stClient = clients.find((c) => c.id === statementClientId) || clients[0];
            const stMetric = filteredData.clientMetrics.find((m) => m.client.id === stClient?.id);
            if (!stClient || !stMetric) {
              return <div className="text-center py-8 text-xs text-text-muted">Please select an account.</div>;
            }

            const clientPmts = payments.filter((p) => p.clientId === stClient.id);
            const clientExps = expenses.filter((e) => e.clientId === stClient.id);

            return (
              <Card className="border-border p-8 bg-surface space-y-6">
                {/* Statement Header */}
                <div className="flex items-start justify-between pb-6 border-b-2 border-primary-600">
                  <div>
                    <h2 className="text-xl font-black text-text tracking-tight">GETUP AGENCY</h2>
                    <p className="text-xs text-text-muted mt-0.5">Monthly Client Account Statement & Audit</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-primary-700 block">Statement Period</span>
                    <span className="text-sm font-black text-text">{periodDetails.label}</span>
                  </div>
                </div>

                {/* Account Details Box */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-card bg-surface-subtle border border-border text-xs">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase block">Client Name</span>
                    <strong className="text-text font-bold block mt-0.5">{stClient.name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase block">Brand / Business</span>
                    <strong className="text-text font-bold block mt-0.5">{stClient.business}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase block">Monthly Retainer</span>
                    <strong className="text-primary-700 font-bold block mt-0.5">{formatINR(stClient.monthlyFee)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase block">Contract Onboarded</span>
                    <strong className="text-text font-bold block mt-0.5">{formatDate(stClient.onboardedOn)}</strong>
                  </div>
                </div>

                {/* Deliverables Delivered in Statement */}
                <div>
                  <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-2">Deliverables Fulfillment</h4>
                  <div className="border border-border rounded-control overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-surface-subtle text-[10px] uppercase font-bold text-text-muted border-b border-border">
                        <tr>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3 text-center">Promised/Month</th>
                          <th className="py-2 px-3 text-center">Delivered</th>
                          <th className="py-2 px-3 text-center">Remaining</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {stMetric.deliverables.activeTypes.map((t) => (
                          <tr key={t.type}>
                            <td className="py-2 px-3 font-bold text-text">{t.label}</td>
                            <td className="py-2 px-3 text-center tabular-nums">{t.promised}</td>
                            <td className="py-2 px-3 text-center tabular-nums font-bold text-emerald-700">{t.done}</td>
                            <td className="py-2 px-3 text-center tabular-nums text-rose-600">{t.remaining}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Ledger (Payments Received & Balance) */}
                <div>
                  <h4 className="text-xs font-bold text-text uppercase tracking-wider mb-2">Collections & Invoices</h4>
                  <div className="border border-border rounded-control overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-surface-subtle text-[10px] uppercase font-bold text-text-muted border-b border-border">
                        <tr>
                          <th className="py-2 px-3">Payment Date</th>
                          <th className="py-2 px-3">Month Billed</th>
                          <th className="py-2 px-3">Mode</th>
                          <th className="py-2 px-3 text-right">Amount Received</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {clientPmts.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-text-muted italic">
                              No payments recorded for this account.
                            </td>
                          </tr>
                        ) : (
                          clientPmts.map((p) => (
                            <tr key={p.id}>
                              <td className="py-2 px-3 text-text-muted">{formatDate(p.date)}</td>
                              <td className="py-2 px-3">{p.month}</td>
                              <td className="py-2 px-3 uppercase text-[10px] font-semibold">{p.mode || 'Bank Transfer'}</td>
                              <td className="py-2 px-3 text-right tabular-nums font-bold text-emerald-700">
                                {formatINR(p.amount)}
                              </td>
                            </tr>
                          ))
                        )}
                        <tr className="bg-surface-subtle font-bold border-t border-border">
                          <td colSpan={3} className="py-2 px-3">Total Paid Collections</td>
                          <td className="py-2 px-3 text-right tabular-nums text-emerald-700">
                            {formatINR(stMetric.financials.received)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Direct Account Expenses Incurred */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-text uppercase tracking-wider">Direct Client Expenses Incurred</h4>
                  <div className="overflow-x-auto border border-border rounded-card">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-subtle text-[10px] uppercase font-bold text-text-muted border-b border-border">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">Paid To / Note</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {clientExps.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-text-muted italic">
                              No shoot or production expenses logged for this account.
                            </td>
                          </tr>
                        ) : (
                          clientExps.map((e) => (
                            <tr key={e.id}>
                              <td className="py-2 px-3 text-text-muted">{formatDate(e.date)}</td>
                              <td className="py-2 px-3 uppercase text-[10px] font-semibold">{e.category}</td>
                              <td className="py-2 px-3 text-text-muted">{e.note || e.paidTo || '—'}</td>
                              <td className="py-2 px-3 text-right tabular-nums font-bold text-amber-700">
                                {formatINR(e.amount)}
                              </td>
                            </tr>
                          ))
                        )}
                        <tr className="bg-surface-subtle font-bold border-t border-border">
                          <td colSpan={3} className="py-2 px-3">Total Direct Expenses</td>
                          <td className="py-2 px-3 text-right tabular-nums text-amber-700">
                            {formatINR(stMetric.financials.clientExpenses)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Account Balance Summary */}
                <div className="p-4 rounded-card bg-surface-subtle border border-border flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-text-muted block">Outstanding Pending Balance</span>
                    <span className="text-base font-black text-rose-600 tabular-nums">
                      {formatINR(stMetric.financials.pending)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-text-muted block">Direct Expenses Incurred</span>
                    <span className="text-base font-black text-text tabular-nums">
                      {formatINR(stMetric.financials.clientExpenses)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-text-muted block">Net Account Profit</span>
                    <span
                      className={`text-base font-black tabular-nums ${
                        stMetric.financials.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatINR(stMetric.financials.profit)} ({formatPercent(stMetric.financials.margin)})
                    </span>
                  </div>
                </div>

                {/* Statement Footer */}
                <div className="pt-4 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
                  <span>Getup Agency — Generated for {stClient.name}</span>
                  <span>Confidential Business Statement</span>
                </div>
              </Card>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
