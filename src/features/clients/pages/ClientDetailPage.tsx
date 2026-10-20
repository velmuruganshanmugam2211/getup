import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
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
import { LoadingState } from '@/components/feedback/LoadingState';
import { AddClientDrawer } from '../components/AddClientDrawer';
import { AddExpenseModal } from '@/features/finance/components/AddExpenseModal';
import {
  useClient,
  useClientDeliverables,
  useCreateDeliverable,
  useUpdateDeliverable,
  useDeleteDeliverable,
  useClientPayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  useClientTasks,
  useClientExpenses,
  useDeleteExpense,
} from '../hooks/useClients';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityLogService, taskService, teamService, calendarService } from '@/services';
import { useToast } from '@/components/feedback/Toast';
import { Can } from '@/components/feedback/Can';
import {
  Deliverable,
  DeliverableType,
  DeliverableStatus,
  Payment,
  PaymentMode,
  PaymentStatus,
  Expense,
  Task,
  TaskPriority,
  ActivityLog,
  User,
  CalendarItem,
} from '@/types';
import { formatINR, formatDate, formatDateTime } from '@/lib/format';
import {
  computeClientFinancials,
  computeClientDeliverables,
} from '@/lib/selectors';
import {
  Phone,
  Mail,
  Calendar,
  Wallet,
  Video,
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  AlertCircle,
  Activity,
  CheckSquare,
  Sparkles,
  Receipt,
  Download,
} from 'lucide-react';
import { createPdfDoc, addHeader, addTable, addKpiRow, savePdf } from '@/utils/pdf';

export const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const { data: client, isLoading: clientLoading } = useClient(id || '');
  const { data: deliverables = [] } = useClientDeliverables(id);
  const { data: payments = [] } = useClientPayments(id);
  const { data: expenses = [] } = useClientExpenses(id);
  const { data: tasks = [] } = useClientTasks(id);

  const { data: teamMembers = [] } = useQuery<User[]>({
    queryKey: ['team', 'list'],
    queryFn: () => teamService.getUsers(),
  });

  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ['activity-logs', 'client', id],
    queryFn: () => (id ? activityLogService.getActivityLogs(50, id) : Promise.resolve([])),
    enabled: !!id,
  });

  const { data: clientCalendarItems = [] } = useQuery<CalendarItem[]>({
    queryKey: ['calendar-items', 'client', id],
    queryFn: async () => {
      const all = await calendarService.getItems({ clientId: id });
      return all;
    },
    enabled: !!id,
  });

  // Client Drawer edit state
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  // Deliverable modal state
  const [deliverableModalOpen, setDeliverableModalOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);
  const [deliverableToDelete, setDeliverableToDelete] = useState<Deliverable | null>(null);

  const [dlvType, setDlvType] = useState<DeliverableType>('video');
  const [dlvTitle, setDlvTitle] = useState('');
  const [dlvDate, setDlvDate] = useState(new Date().toISOString().split('T')[0]);
  const [dlvMonth, setDlvMonth] = useState(new Date().toISOString().substring(0, 7));
  const [dlvStatus, setDlvStatus] = useState<DeliverableStatus>('planned');
  const [dlvLink, setDlvLink] = useState('');
  const [dlvNotes, setDlvNotes] = useState('');

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMonth, setPayMonth] = useState(new Date().toISOString().substring(0, 7));
  const [payAmount, setPayAmount] = useState<number>(50000);
  const [payMode, setPayMode] = useState<PaymentMode>('bank_transfer');
  const [payStatus, setPayStatus] = useState<PaymentStatus>('paid');
  const [payNotes, setPayNotes] = useState('');

  // Expense modal state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Task modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split('T')[0]);

  // Mutations
  const createDeliverableMutation = useCreateDeliverable();
  const updateDeliverableMutation = useUpdateDeliverable();
  const deleteDeliverableMutation = useDeleteDeliverable();

  const createPaymentMutation = useCreatePayment();
  const updatePaymentMutation = useUpdatePayment();
  const deletePaymentMutation = useDeletePayment();
  const deleteExpenseMutation = useDeleteExpense();

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
      const created = await taskService.createTask(taskData);
      await activityLogService.log('added', 'task', created.id, {
        clientId: id,
        title: created.title,
      });
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'client', id] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });

  // Calculate synchronized financial & deliverable metrics from central selectors
  const financials = useMemo(() => {
    if (!client) {
      return {
        monthlyFee: 0,
        monthsElapsed: 1,
        expected: 0,
        received: 0,
        pending: 0,
        advance: 0,
        overdue: 0,
        clientExpenses: 0,
        profit: 0,
        margin: 0,
        hasPending: false,
      };
    }
    return computeClientFinancials(client, payments, expenses);
  }, [client, payments, expenses]);

  const deliverablesMetrics = useMemo(() => {
    if (!client) {
      return {
        videosPerMonth: 0,
        postsPerMonth: 0,
        reelsPerMonth: 0,
        storiesPerMonth: 0,
        monthlyPromised: 0,
        totalPromised: 0,
        videosDone: 0,
        postsDone: 0,
        reelsDone: 0,
        storiesDone: 0,
        totalDone: 0,
        videosRemaining: 0,
        postsRemaining: 0,
        reelsRemaining: 0,
        storiesRemaining: 0,
        totalRemaining: 0,
        percent: 0,
        isBehind: false,
        hasPackage: false,
        activeTypes: [],
        activeTypeKeys: [],
      };
    }
    return computeClientDeliverables(client, deliverables);
  }, [client, deliverables]);

  if (clientLoading) {
    return <LoadingState message="Loading client dossier..." fullPage />;
  }

  if (!client) {
    return (
      <div className="p-12 text-center bg-surface border border-border rounded-card my-8 max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 mx-auto text-semantic-danger mb-3" />
        <h3 className="text-base font-bold text-text">Client Record Not Found</h3>
        <p className="text-xs text-text-muted mt-1 mb-6">
          This client record may have been removed or does not exist.
        </p>
        <Button variant="primary" size="sm" onClick={() => navigate('/clients')}>
          Back to Clients Directory
        </Button>
      </div>
    );
  }

  // Deliverable Handlers
  const handleOpenAddDeliverable = () => {
    setEditingDeliverable(null);
    setDlvType('video');
    setDlvTitle('');
    setDlvDate(new Date().toISOString().split('T')[0]);
    setDlvMonth(new Date().toISOString().substring(0, 7));
    setDlvStatus('planned');
    setDlvLink('');
    setDlvNotes('');
    setDeliverableModalOpen(true);
  };

  const handleOpenEditDeliverable = (dlv: Deliverable) => {
    setEditingDeliverable(dlv);
    setDlvType(dlv.type);
    setDlvTitle(dlv.title);
    setDlvDate(dlv.date);
    setDlvMonth(dlv.month || dlv.date.substring(0, 7));
    setDlvStatus(dlv.status);
    setDlvLink(dlv.link || '');
    setDlvNotes(dlv.notes || '');
    setDeliverableModalOpen(true);
  };

  const handleSaveDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dlvTitle.trim()) {
      error('Title Required', 'Please enter a title for the deliverable.');
      return;
    }

    try {
      if (editingDeliverable) {
        await updateDeliverableMutation.mutateAsync({
          id: editingDeliverable.id,
          data: {
            type: dlvType,
            title: dlvTitle.trim(),
            date: dlvDate,
            month: dlvMonth,
            status: dlvStatus,
            link: dlvLink.trim() || undefined,
            notes: dlvNotes.trim() || undefined,
          },
        });
        success('Deliverable Updated', `"${dlvTitle}" was successfully updated.`);
      } else {
        await createDeliverableMutation.mutateAsync({
          clientId: client.id,
          type: dlvType,
          title: dlvTitle.trim(),
          date: dlvDate,
          month: dlvMonth,
          status: dlvStatus,
          link: dlvLink.trim() || undefined,
          notes: dlvNotes.trim() || undefined,
        });
        success('Deliverable Added', `"${dlvTitle}" logged to client deliverables.`);
      }
      setDeliverableModalOpen(false);
    } catch {
      error('Save Failed', 'Unable to save deliverable. Please try again.');
    }
  };

  const handleDeleteDeliverable = async () => {
    if (!deliverableToDelete) return;
    try {
      await deleteDeliverableMutation.mutateAsync({
        id: deliverableToDelete.id,
        clientId: client.id,
      });
      success('Deliverable Removed', `"${deliverableToDelete.title}" was deleted.`);
      setDeliverableToDelete(null);
    } catch {
      error('Delete Failed', 'Could not delete deliverable.');
    }
  };

  const handleToggleDeliverableStatus = async (dlv: Deliverable) => {
    const nextStatus: Record<DeliverableStatus, DeliverableStatus> = {
      planned: 'in_progress',
      in_progress: 'delivered',
      delivered: 'planned',
    };
    try {
      await updateDeliverableMutation.mutateAsync({
        id: dlv.id,
        data: { status: nextStatus[dlv.status] },
      });
      success('Status Changed', `Status set to ${nextStatus[dlv.status].replace('_', ' ')}.`);
    } catch {
      error('Error', 'Could not update deliverable status.');
    }
  };

  // Payment Handlers
  const handleOpenAddPayment = () => {
    setEditingPayment(null);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMonth(new Date().toISOString().substring(0, 7));
    setPayAmount(client.monthlyFee || 50000);
    setPayMode('bank_transfer');
    setPayStatus('paid');
    setPayNotes('');
    setPaymentModalOpen(true);
  };

  const handleOpenEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setPayDate(payment.date);
    setPayMonth(payment.month);
    setPayAmount(payment.amount);
    setPayMode(payment.mode || 'bank_transfer');
    setPayStatus(payment.status);
    setPayNotes(payment.notes || '');
    setPaymentModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      error('Invalid Amount', 'Payment amount must be greater than zero.');
      return;
    }

    try {
      if (editingPayment) {
        await updatePaymentMutation.mutateAsync({
          id: editingPayment.id,
          data: {
            date: payDate,
            month: payMonth,
            amount: payAmount,
            mode: payMode,
            status: payStatus,
            notes: payNotes.trim() || undefined,
          },
        });
        success('Payment Updated', `Payment of ${formatINR(payAmount)} updated.`);
      } else {
        await createPaymentMutation.mutateAsync({
          clientId: client.id,
          date: payDate,
          month: payMonth,
          amount: payAmount,
          mode: payMode,
          status: payStatus,
          notes: payNotes.trim() || undefined,
        });
        success('Payment Recorded', `Payment of ${formatINR(payAmount)} recorded.`);
      }
      setPaymentModalOpen(false);
    } catch {
      error('Save Failed', 'Unable to save payment record.');
    }
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      await deletePaymentMutation.mutateAsync({
        id: paymentToDelete.id,
        clientId: client.id,
      });
      success('Payment Removed', 'Payment record was removed.');
      setPaymentToDelete(null);
    } catch {
      error('Delete Failed', 'Could not delete payment record.');
    }
  };

  // Expense Handlers
  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpenseMutation.mutateAsync({
        id: expenseToDelete.id,
        clientId: client.id,
      });
      success('Expense Removed', 'Expense item was deleted.');
      setExpenseToDelete(null);
    } catch {
      error('Delete Failed', 'Could not delete expense.');
    }
  };

  // Task Handler
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      error('Title Required', 'Please enter a task title.');
      return;
    }

    const assignee = taskAssignee || teamMembers[0]?.id || 'user-1';

    try {
      await createTaskMutation.mutateAsync({
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        clientId: client.id,
        assigneeId: assignee,
        priority: taskPriority,
        status: 'todo',
        dueDate: taskDueDate,
        timeSpent: 0,
      });
      success('Task Created', `Task "${taskTitle}" assigned and linked to ${client.name}.`);
      setTaskModalOpen(false);
      setTaskTitle('');
      setTaskDescription('');
    } catch {
      error('Failed', 'Could not create task.');
    }
  };

  // Work Summary cards data (Promised vs Done vs REMAINING for active types only!)
  const workSummaryItems = deliverablesMetrics.activeTypes.map((t) => ({
    type: t.label,
    promised: t.promised,
    done: t.done,
    remaining: t.remaining,
    perMonth: t.perMonth,
    percent: t.percent,
    color:
      t.type === 'video'
        ? 'bg-blue-600'
        : t.type === 'reel'
        ? 'bg-purple-600'
        : t.type === 'post'
        ? 'bg-emerald-600'
        : 'bg-amber-600',
  }));

  const handleExportStatementPdf = async () => {
    if (!client) return;
    try {
      const doc = await createPdfDoc({
        title: `${client.name} - Account Statement`,
        period: formatDate(new Date().toISOString()),
      });
      let curY = addHeader(doc, {
        title: `Client Account Statement: ${client.name}`,
        period: `Active Since: ${formatDate(client.onboardedOn)}`,
      });

      // KPI row 1
      curY = addKpiRow(doc, curY, [
        { label: 'Monthly Retainer', value: formatINR(client.monthlyFee) },
        { label: 'Total Expected', value: formatINR(financials.expected) },
        { label: 'Total Received', value: formatINR(financials.received) },
        { label: 'Pending to Collect', value: formatINR(financials.pending) },
      ]);

      // KPI row 2
      curY = addKpiRow(doc, curY + 6, [
        { label: 'Shoots & Direct Costs', value: formatINR(financials.clientExpenses) },
        { label: 'Net Profit', value: formatINR(financials.profit) },
        { label: 'Profit Margin', value: `${financials.margin}%` },
        { label: 'Deliverables Done', value: `${deliverablesMetrics.totalDone} / ${deliverablesMetrics.totalPromised}` },
      ]);

      // Deliverables summary table
      doc.setFont('Montserrat', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Deliverables Log', 14, curY + 12);

      const dlvCols = [
        { header: 'Title', dataKey: 'title' },
        { header: 'Type', dataKey: 'type' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Month', dataKey: 'month' },
        { header: 'Target Date', dataKey: 'date' },
      ];
      const dlvRows = deliverables.map((d) => [
        d.title,
        d.type.toUpperCase(),
        d.status.replace('_', ' ').toUpperCase(),
        d.month || '—',
        formatDate(d.date),
      ]);
      curY = addTable(doc, curY + 16, dlvCols, dlvRows, {
        emptyText: 'No deliverables logged for this client.',
      });

      // Payments summary table
      doc.setFont('Montserrat', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Payments Received', 14, curY + 12);

      const payCols = [
        { header: 'Date', dataKey: 'date' },
        { header: 'Month Covered', dataKey: 'month' },
        { header: 'Payment Mode', dataKey: 'mode' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Notes', dataKey: 'notes' },
        { header: 'Amount', dataKey: 'amount', align: 'right' as const },
      ];
      const payRows = payments.map((p) => [
        formatDate(p.date),
        p.month,
        (p.mode || 'bank_transfer').replace('_', ' ').toUpperCase(),
        p.status.toUpperCase(),
        p.notes || '—',
        formatINR(p.amount),
      ]);
      payRows.push(['TOTAL RECEIVED', '—', '—', '—', '—', formatINR(financials.received)]);
      addTable(doc, curY + 16, payCols, payRows, {
        hasTotalsRow: true,
        emptyText: 'No payments recorded for this client.',
      });

      savePdf(doc, `GetupAgency_Statement_${client.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      success('PDF Downloaded', `Statement for ${client.name} downloaded.`);
    } catch (err: any) {
      error('Export Error', err.message || 'Could not export statement.');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title={client.name}
        subtitle={`${client.business} • Client Contract active since ${formatDate(client.onboardedOn)} (${financials.monthsElapsed} mos active)`}
        breadcrumbs={[
          { label: 'Clients', href: '/clients' },
          { label: client.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/clients')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Clients List
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportStatementPdf}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export Statement PDF
            </Button>
            <Can permission="clients.write">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEditDrawerOpen(true)}
                leftIcon={<Edit2 className="w-4 h-4" />}
              >
                Edit Client Profile
              </Button>
            </Can>
          </div>
        }
      />

      {/* Profile & Contract Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Contact info */}
        <Card className="p-4 border-border space-y-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Contact & Leads
            </span>
            <StatusBadge status={client.status} size="sm" />
          </div>
          <div>
            <p className="text-sm font-bold text-text">{client.contactPerson}</p>
            <p className="text-xs text-text-muted flex items-center gap-1.5 mt-1 font-mono">
              <Phone className="w-3.5 h-3.5 text-text-subtle shrink-0" />
              {client.phone}
            </p>
            {client.email && (
              <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5 truncate" title={client.email}>
                <Mail className="w-3.5 h-3.5 text-text-subtle shrink-0" />
                {client.email}
              </p>
            )}
          </div>
        </Card>

        {/* Retainer & Commercials */}
        <Card className="p-4 border-border space-y-2 md:col-span-1">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Monthly Retainer
          </span>
          <div>
            <p className="text-xl font-bold text-text tabular-nums">{formatINR(client.monthlyFee)}</p>
            <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-text-subtle" />
              {formatDate(client.onboardedOn)}
            </p>
          </div>
        </Card>

        {/* Financial Balance Summary (Expected, Received, Pending, Spent, Profit) */}
        <Card className="p-4 border-border space-y-2 md:col-span-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-primary-600" />
              Contract Financial Reconciliation ({financials.monthsElapsed} Billing Months)
            </span>
            <span className="text-[11px] font-bold text-text-muted">
              Margin: <strong className={financials.profit >= 0 ? 'text-primary-700' : 'text-semantic-danger'}>{financials.margin}%</strong>
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center pt-1">
            <div className="p-2 rounded bg-surface-subtle">
              <span className="text-[9px] text-text-muted uppercase font-bold block">Expected</span>
              <span className="text-sm font-bold text-text tabular-nums">{formatINR(financials.expected)}</span>
            </div>

            <div className="p-2 rounded bg-surface-subtle">
              <span className="text-[9px] text-text-muted uppercase font-bold block">Received</span>
              <span className="text-sm font-bold text-semantic-success tabular-nums">{formatINR(financials.received)}</span>
            </div>

            <div className="p-2 rounded bg-surface-subtle">
              <span className="text-[9px] text-text-muted uppercase font-bold block">Pending</span>
              <span className={`text-sm font-bold tabular-nums ${financials.pending > 0 ? 'text-semantic-danger' : 'text-text-muted'}`}>
                {formatINR(financials.pending)}
              </span>
            </div>

            <div className="p-2 rounded bg-surface-subtle">
              <span className="text-[9px] text-text-muted uppercase font-bold block">Expenses</span>
              <span className="text-sm font-bold text-amber-600 tabular-nums">{formatINR(financials.clientExpenses)}</span>
            </div>

            <div className="p-2 rounded bg-surface-subtle">
              <span className="text-[9px] text-text-muted uppercase font-bold block">Profit</span>
              <span className={`text-sm font-bold tabular-nums ${financials.profit >= 0 ? 'text-emerald-700' : 'text-semantic-danger'}`}>
                {formatINR(financials.profit)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Work Summary: Promised vs Done vs REMAINING */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-600" />
            Deliverables Work Summary (Promised vs Done vs Remaining)
          </h3>
          {workSummaryItems.length > 0 && (
            <span className="text-xs text-text-muted">
              Total {deliverablesMetrics.totalDone} of {deliverablesMetrics.totalPromised} delivered ({deliverablesMetrics.percent}%)
            </span>
          )}
        </div>

        {workSummaryItems.length === 0 ? (
          <Card className="p-6 text-center text-text-muted text-xs border-dashed border-border">
            No package deliverables defined for this client.
          </Card>
        ) : (
          <div
            className={`grid gap-3 ${
              workSummaryItems.length === 1
                ? 'grid-cols-1 max-w-sm'
                : workSummaryItems.length === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : workSummaryItems.length === 3
                ? 'grid-cols-1 sm:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {workSummaryItems.map((item) => (
              <Card key={item.type} className="p-4 border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-text">{item.type}</span>
                  <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-pill border border-primary-200">
                    {item.percent}%
                  </span>
                </div>

                {/* Promised vs Done vs Remaining text */}
                <div className="text-xs">
                  <p className="font-semibold text-text">
                    {item.promised} promised, {item.done} done,{' '}
                    <strong className={item.remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                      {item.remaining} remaining
                    </strong>
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Package commitment: {item.perMonth} / month
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-border/40">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-300`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Meetings & Notes Mini-List */}
      <Card className="p-4 border-border space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-primary-600" />
            Upcoming Meetings & Notes ({clientCalendarItems.length})
          </h4>
          <Can permission="calendar.read">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => navigate('/calendar')}
            >
              Open Calendar
            </Button>
          </Can>
        </div>

        {clientCalendarItems.length === 0 ? (
          <p className="text-xs text-text-muted py-2 text-center">
            No meetings or notes scheduled for {client.name}.
          </p>
        ) : (
          <div className="divide-y divide-border -mx-1">
            {clientCalendarItems.slice(0, 5).map((item) => (
              <div key={item.id} className="py-2 px-1 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      item.type === 'meeting'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {item.type}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-text truncate">{item.title}</p>
                    <p className="text-[11px] text-text-muted">
                      {formatDate(item.date)} {item.startTime ? `at ${item.startTime}` : ''}
                    </p>
                  </div>
                </div>
                {item.locationOrLink && (
                  <a
                    href={item.locationOrLink.startsWith('http') ? item.locationOrLink : `https://${item.locationOrLink}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary-600 hover:underline flex items-center gap-1 shrink-0 font-medium"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Join / View
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tabs Section: Deliverables, Payments, Expenses, Linked Tasks, Activity */}
      <Tabs defaultValue="deliverables" className="space-y-4">
        <TabsList className="bg-surface border border-border p-1 rounded-card flex flex-wrap gap-1">
          <TabsTrigger value="deliverables" className="text-xs font-semibold px-4 py-2">
            Deliverables Log ({deliverables.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs font-semibold px-4 py-2">
            Payments & Collections ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs font-semibold px-4 py-2">
            Client Shoot Expenses ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs font-semibold px-4 py-2">
            Linked Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="strategy" className="text-xs font-semibold px-4 py-2">
            Strategy & Notes
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs font-semibold px-4 py-2">
            Activity Timeline ({activityLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DELIVERABLES LOG */}
        <TabsContent value="deliverables" className="space-y-4">
          <div className="flex items-center justify-between bg-surface p-4 rounded-card border border-border">
            <div>
              <h4 className="text-sm font-bold text-text">Content & Deliverables History</h4>
              <p className="text-xs text-text-muted">
                Log completed videos, posts, reels, and stories with links. Marking as "Delivered"
                automatically updates client totals and remaining counts.
              </p>
            </div>
            <Can permission="clients.write">
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddDeliverable}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Deliverable
              </Button>
            </Can>
          </div>

          <Card className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle border-b border-border text-text-muted font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Title & Description</th>
                    <th className="py-3 px-4">Delivery Date</th>
                    <th className="py-3 px-4">Month Covered</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Asset Link</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deliverables.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted text-xs">
                        <Video className="w-8 h-8 mx-auto mb-2 text-text-subtle" />
                        No deliverables logged yet for this client.
                        <div className="mt-3">
                          <Button variant="outline" size="sm" onClick={handleOpenAddDeliverable}>
                            Log First Deliverable
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    deliverables.map((dlv) => (
                      <tr key={dlv.id} className="hover:bg-surface-subtle/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="capitalize font-bold px-2 py-0.5 rounded-pill bg-surface-subtle border border-border text-[11px]">
                            {dlv.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-text max-w-xs">
                          <p className="truncate">{dlv.title}</p>
                          {dlv.notes && (
                            <p className="text-[11px] font-normal text-text-muted truncate">
                              {dlv.notes}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 tabular-nums text-text-muted">
                          {formatDate(dlv.date)}
                        </td>
                        <td className="py-3 px-4 tabular-nums text-text-muted">{dlv.month}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleDeliverableStatus(dlv)}
                            title="Click to advance status"
                            className="cursor-pointer"
                          >
                            <StatusBadge status={dlv.status} size="sm" />
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          {dlv.link ? (
                            <a
                              href={dlv.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline flex items-center gap-1 font-medium"
                            >
                              Open asset <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-text-subtle">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditDeliverable(dlv)}
                              className="h-7 w-7 p-0 text-text-muted hover:text-text"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeliverableToDelete(dlv)}
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

        {/* TAB 2: PAYMENTS & COLLECTIONS */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex items-center justify-between bg-surface p-4 rounded-card border border-border">
            <div>
              <h4 className="text-sm font-bold text-text">Client Payment Collections</h4>
              <p className="text-xs text-text-muted">
                Track payments, invoice receipts, and pending dues for {client.name}.
              </p>
            </div>
            <Can permission="finance.write">
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

          <Card className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle border-b border-border text-text-muted font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Month Covered</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted text-xs">
                        <Wallet className="w-8 h-8 mx-auto mb-2 text-text-subtle" />
                        No payments logged for this client yet.
                        <div className="mt-3">
                          <Button variant="outline" size="sm" onClick={handleOpenAddPayment}>
                            Record First Payment
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-surface-subtle/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-text tabular-nums">
                          {formatDate(pay.date)}
                        </td>
                        <td className="py-3 px-4 font-mono text-text-muted">{pay.month}</td>
                        <td className="py-3 px-4 font-bold text-sm text-text tabular-nums">
                          {formatINR(pay.amount)}
                        </td>
                        <td className="py-3 px-4 capitalize text-text-muted">
                          {pay.mode?.replace('_', ' ') || 'Bank transfer'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={pay.status} size="sm" />
                        </td>
                        <td className="py-3 px-4 text-text-muted max-w-xs truncate">
                          {pay.notes || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditPayment(pay)}
                              className="h-7 w-7 p-0 text-text-muted hover:text-text"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPaymentToDelete(pay)}
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

        {/* TAB 3: CLIENT SHOOT EXPENSES (NEW!) */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex items-center justify-between bg-surface p-4 rounded-card border border-border">
            <div>
              <h4 className="text-sm font-bold text-text">Direct Expenses on {client.name}</h4>
              <p className="text-xs text-text-muted">
                Shoot expenses, camera rentals, petrol, and freelancer editing costs dedicated to this client.
                Directly reduces profit on this account.
              </p>
            </div>
            <Can permission="finance.write">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingExpense(null);
                  setExpenseModalOpen(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Client Expense
              </Button>
            </Can>
          </div>

          <Card className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle border-b border-border text-text-muted font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Item Note & Shoot Group</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted text-xs">
                        <Receipt className="w-8 h-8 mx-auto mb-2 text-text-subtle" />
                        No direct expenses logged for this client yet.
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingExpense(null);
                              setExpenseModalOpen(true);
                            }}
                          >
                            Add First Client Expense
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
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
                        <td className="py-3 px-4 font-bold text-sm text-semantic-danger tabular-nums">
                          {formatINR(exp.amount)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingExpense(exp);
                                setExpenseModalOpen(true);
                              }}
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: LINKED TASKS */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between bg-surface p-4 rounded-card border border-border">
            <div>
              <h4 className="text-sm font-bold text-text">Client Workload Tasks</h4>
              <p className="text-xs text-text-muted">
                Operational tasks linked to this client from the agency task board.
              </p>
            </div>
            <Can permission="tasks.write">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setTaskModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Linked Task
              </Button>
            </Can>
          </div>

          <Card className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-subtle border-b border-border text-text-muted font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Task</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-muted text-xs">
                        <CheckSquare className="w-8 h-8 mx-auto mb-2 text-text-subtle" />
                        No tasks currently linked to this client.
                        <div className="mt-3">
                          <Button variant="outline" size="sm" onClick={() => setTaskModalOpen(true)}>
                            Create Linked Task
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => {
                      const assigneeName =
                        teamMembers.find((u) => u.id === task.assigneeId)?.name || 'Assignee';
                      return (
                        <tr key={task.id} className="hover:bg-surface-subtle/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-text max-w-xs">
                            <p className="truncate">{task.title}</p>
                            {task.description && (
                              <p className="text-[11px] font-normal text-text-muted truncate">
                                {task.description}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-text font-medium">{assigneeName}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                task.priority === 'urgent'
                                  ? 'danger'
                                  : task.priority === 'high'
                                  ? 'warning'
                                  : 'slate'
                              }
                              className="uppercase text-[10px]"
                            >
                              {task.priority}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 tabular-nums text-text-muted">
                            {formatDate(task.dueDate)}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={task.status} size="sm" />
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

        {/* TAB 5: NOTES & STRATEGY */}
        <TabsContent value="strategy" className="space-y-4">
          <Card className="p-6 border-border space-y-4">
            <h4 className="text-sm font-bold text-text">Creative Strategy & Brand Instructions</h4>
            <p className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap">
              {client.notes || 'No specific creative instructions or strategy notes recorded.'}
            </p>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditDrawerOpen(true)}>
                Edit Creative Strategy
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 6: ACTIVITY TIMELINE */}
        <TabsContent value="activity" className="space-y-4">
          <Card className="p-6 border-border">
            <h4 className="text-sm font-bold text-text mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-600" />
              Client Audit Timeline
            </h4>

            {activityLogs.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                No activity logs recorded yet.
              </p>
            ) : (
              <div className="relative border-l-2 border-primary-200 ml-3 space-y-6 pl-5 py-2">
                {activityLogs.map((log) => (
                  <div key={log.id} className="relative group">
                    <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-surface border-2 border-primary-600 group-hover:scale-125 transition-transform" />
                    <div>
                      <p className="text-xs font-semibold text-text">
                        <strong className="text-primary-700">{log.actorName}</strong>{' '}
                        {log.action} {log.entity}
                      </p>
                      {log.after && (
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {Object.entries(log.after)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}
                        </p>
                      )}
                      <span className="text-[10px] text-text-subtle mt-1 block">
                        {formatDateTime(log.at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Client Drawer */}
      <AddClientDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        clientToEdit={client}
      />

      {/* Add / Edit Deliverable Modal */}
      <Modal open={deliverableModalOpen} onOpenChange={setDeliverableModalOpen}>
        <ModalContent size="md">
          <form onSubmit={handleSaveDeliverable} className="flex flex-col flex-1 h-full">
            <ModalHeader>
              <ModalTitle>
                {editingDeliverable ? 'Edit Deliverable Log' : 'Add New Deliverable'}
              </ModalTitle>
              <ModalDescription className="text-xs text-text-muted">
                Log deliverable asset, type, completion date, and link.
              </ModalDescription>
            </ModalHeader>

            <div className="space-y-4 py-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Deliverable Type" required>
                  <Select
                    value={dlvType}
                    onChange={(e) => setDlvType(e.target.value as DeliverableType)}
                    options={
                      deliverablesMetrics.activeTypes.length > 0
                        ? deliverablesMetrics.activeTypes.map((t) => ({
                            value: t.type,
                            label: t.label,
                          }))
                        : [
                            { value: 'video', label: 'Video' },
                            { value: 'reel', label: 'Reel' },
                            { value: 'post', label: 'Post' },
                            { value: 'story', label: 'Story' },
                          ]
                    }
                  />
                </FormField>

                <FormField label="Status" required>
                  <Select
                    value={dlvStatus}
                    onChange={(e) => setDlvStatus(e.target.value as DeliverableStatus)}
                    options={[
                      { value: 'planned', label: 'Planned' },
                      { value: 'in_progress', label: 'In Progress' },
                      { value: 'delivered', label: 'Delivered' },
                    ]}
                  />
                </FormField>
              </div>

              <FormField label="Deliverable Title" required>
                <Input
                  placeholder="e.g. Diwali Brand Film Main Cut"
                  value={dlvTitle}
                  onChange={(e) => setDlvTitle(e.target.value)}
                  autoFocus
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Delivery Date" required>
                  <Input
                    type="date"
                    value={dlvDate}
                    onChange={(e) => setDlvDate(e.target.value)}
                  />
                </FormField>

                <FormField label="Month Covered (YYYY-MM)" required>
                  <Input
                    placeholder="YYYY-MM"
                    value={dlvMonth}
                    onChange={(e) => setDlvMonth(e.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="Asset Link (Drive / Dropbox / URL)">
                <Input
                  placeholder="https://drive.google.com/..."
                  value={dlvLink}
                  onChange={(e) => setDlvLink(e.target.value)}
                />
              </FormField>

              <FormField label="Notes">
                <Textarea
                  placeholder="e.g. 4K master exported with color grade"
                  rows={2}
                  value={dlvNotes}
                  onChange={(e) => setDlvNotes(e.target.value)}
                />
              </FormField>
            </div>

            <ModalFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeliverableModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={
                  createDeliverableMutation.isPending || updateDeliverableMutation.isPending
                }
              >
                {editingDeliverable ? 'Save Changes' : 'Add Deliverable'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Delete Deliverable Modal */}
      <Modal open={!!deliverableToDelete} onOpenChange={(open) => !open && setDeliverableToDelete(null)}>
        <ModalContent size="sm" variant="center">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2 text-semantic-danger">
              <Trash2 className="w-5 h-5" />
              Delete Deliverable?
            </ModalTitle>
            <ModalDescription className="text-xs text-text-muted mt-2">
              Are you sure you want to remove{' '}
              <strong className="text-text">"{deliverableToDelete?.title}"</strong>?
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeliverableToDelete(null)}
              disabled={deleteDeliverableMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteDeliverable}
              isLoading={deleteDeliverableMutation.isPending}
            >
              Yes, Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add / Edit Payment Modal */}
      <Modal open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <ModalContent size="md">
          <form onSubmit={handleSavePayment} className="flex flex-col flex-1 h-full">
            <ModalHeader>
              <ModalTitle>{editingPayment ? 'Edit Payment Record' : 'Record New Payment'}</ModalTitle>
              <ModalDescription className="text-xs text-text-muted">
                Record invoice collection or payment receipt for {client.name}.
              </ModalDescription>
            </ModalHeader>

            <div className="space-y-4 py-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Payment Date" required>
                  <Input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                  />
                </FormField>

                <FormField label="Month Covered (YYYY-MM)" required>
                  <Input
                    placeholder="YYYY-MM"
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField label="Amount (₹)" required>
                  <MoneyInput value={payAmount} onChange={setPayAmount} />
                </FormField>

                <FormField label="Payment Mode" required>
                  <Select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                    options={[
                      { value: 'bank_transfer', label: 'Bank Transfer' },
                      { value: 'upi', label: 'UPI' },
                      { value: 'cheque', label: 'Cheque' },
                      { value: 'cash', label: 'Cash' },
                    ]}
                  />
                </FormField>

                <FormField label="Payment Status" required>
                  <Select
                    value={payStatus}
                    onChange={(e) => setPayStatus(e.target.value as PaymentStatus)}
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
                  placeholder="e.g. NEFT ref #AXIS98712398"
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
              Delete Payment Record?
            </ModalTitle>
            <ModalDescription className="text-xs text-text-muted mt-2">
              Are you sure you want to remove the payment record for{' '}
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

      {/* Add / Edit Expense Modal (Locked to this client!) */}
      <AddExpenseModal
        open={expenseModalOpen}
        onOpenChange={setExpenseModalOpen}
        prefilledClientId={client.id}
        lockClient={true}
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
              Are you sure you want to remove the expense for{' '}
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

      {/* Add Task Modal */}
      <Modal open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <ModalContent size="md">
          <form onSubmit={handleSaveTask} className="flex flex-col flex-1 h-full">
            <ModalHeader>
              <ModalTitle>Add Linked Task for {client.name}</ModalTitle>
              <ModalDescription className="text-xs text-text-muted">
                Create an operational task assigned to an agency team member.
              </ModalDescription>
            </ModalHeader>

            <div className="space-y-4 py-4 flex-1 overflow-y-auto">
              <FormField label="Task Title" required>
                <Input
                  placeholder="e.g. Color grade interview cut"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  autoFocus
                />
              </FormField>

              <FormField label="Description">
                <Textarea
                  placeholder="Task instructions and guidelines..."
                  rows={2}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
              </FormField>

              <div className="grid grid-cols-3 gap-4">
                <FormField label="Assignee" required>
                  <Select
                    value={taskAssignee || teamMembers[0]?.id || ''}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    options={teamMembers.map((m) => ({ value: m.id, label: m.name }))}
                  />
                </FormField>

                <FormField label="Priority" required>
                  <Select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                      { value: 'urgent', label: 'Urgent' },
                    ]}
                  />
                </FormField>

                <FormField label="Due Date" required>
                  <Input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                  />
                </FormField>
              </div>
            </div>

            <ModalFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTaskModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={createTaskMutation.isPending}
              >
                Create Task
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
};
