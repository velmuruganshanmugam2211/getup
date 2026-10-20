import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useToast } from '@/components/feedback/Toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService, deliverableService, taskService, teamService } from '@/services';
import { useAuth } from '@/features/auth';
import { Client, Deliverable, DeliverableType, Task, TaskStatus } from '@/types';
import { formatDate } from '@/lib/format';
import { computeClientDeliverables } from '@/lib/selectors';
import { TaskCard } from '../components/TaskCard';
import { AddTaskModal } from '../components/AddTaskModal';
import { FilterPopover, ActiveFilterChipsRow, ActiveFilterChip } from '@/components/ui/FilterPopover';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPdfDoc, addHeader, addTable, savePdf, exportToCsv } from '@/utils/pdf';

export const TasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Default view is 'list' as requested
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalDefaultClientId, setModalDefaultClientId] = useState<string | undefined>();
  const [modalDefaultType, setModalDefaultType] = useState<DeliverableType | undefined>();

  // Delete State
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteTaskTitle, setDeleteTaskTitle] = useState('');

  // Queries
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients', 'list'],
    queryFn: () => clientService.getClients(),
  });

  const { data: deliverables = [] } = useQuery<Deliverable[]>({
    queryKey: ['deliverables', 'list'],
    queryFn: () => deliverableService.getDeliverables(),
  });

  const { data: tasks = [], isLoading: isTasksLoading } = useQuery<Task[]>({
    queryKey: ['tasks', 'list'],
    queryFn: () => taskService.getTasks(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['team', 'list'],
    queryFn: () => teamService.getUsers(),
  });

  // Helpers
  const getClientName = (clientId?: string) => {
    if (!clientId) return 'Agency';
    return clients.find((c) => c.id === clientId)?.business || 'Client';
  };

  const getUserName = (assigneeId: string) => {
    return users.find((u) => u.id === assigneeId)?.name || 'Assignee';
  };

  // Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: TaskStatus }) => {
      return taskService.updateTask(taskId, { status: newStatus });
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });

      if (updatedTask.status === 'done') {
        toast.success('Task Completed', `"${updatedTask.title}" marked as done. Deliverable count updated!`);
      } else {
        toast.info('Task Updated', `Task moved to ${updatedTask.status.replace('_', ' ')}.`);
      }
    },
    onError: (err: Error) => {
      toast.error('Update Failed', err.message);
    },
  });

  // Delete mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return taskService.deleteTask(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task Deleted', 'The task has been permanently removed.');
      setDeleteTaskId(null);
    },
    onError: (err: Error) => {
      toast.error('Delete Failed', err.message);
    },
  });

  // Quick 1-tap deliverable completion with Undo Toast
  const handleQuickAddDeliverable = async (
    targetClient: Client,
    type: DeliverableType,
    label: string
  ) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const monthStr = today.toISOString().substring(0, 7);

    try {
      const created = await deliverableService.createDeliverable({
        clientId: targetClient.id,
        type,
        title: `1 ${label.replace(/s$/, '')} completed`,
        date: todayStr,
        month: monthStr,
        status: 'delivered',
        assigneeId: user?.id,
      });

      // Live invalidation across store
      queryClient.invalidateQueries({ queryKey: ['deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });

      toast.success(
        'Deliverable Logged',
        `1 ${label.replace(/s$/, '')} marked done for ${targetClient.name}.`,
        {
          label: 'Undo',
          onClick: async () => {
            try {
              await deliverableService.deleteDeliverable(created.id);
              queryClient.invalidateQueries({ queryKey: ['deliverables'] });
              queryClient.invalidateQueries({ queryKey: ['clients'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
              queryClient.invalidateQueries({ queryKey: ['reports'] });
              toast.info('Action Undone', 'Deliverable entry was removed.');
            } catch {
              toast.error('Undo Failed', 'Could not revert deliverable entry.');
            }
          },
        }
      );
    } catch {
      toast.error('Failed to log deliverable', 'Please try again.');
    }
  };

  // Quick decrement deliverable
  const handleQuickDecrementDeliverable = async (
    targetClient: Client,
    type: DeliverableType,
    label: string
  ) => {
    // Find the latest completed deliverable for this client and type
    const matching = deliverables
      .filter((d) => d.clientId === targetClient.id && d.type === type && d.status === 'delivered')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (matching.length === 0) {
      toast.info('No completed items', `No logged ${label} to decrement.`);
      return;
    }

    const toRemove = matching[0];
    try {
      await deliverableService.deleteDeliverable(toRemove.id);
      queryClient.invalidateQueries({ queryKey: ['deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.info('Count Decremented', `Removed 1 ${label.replace(/s$/, '')} log.`);
    } catch {
      toast.error('Failed', 'Could not decrement deliverable count.');
    }
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

      const matchClient = selectedClientId === 'all' || t.clientId === selectedClientId;

      const matchAssignee = selectedAssigneeId === 'all' || t.assigneeId === selectedAssigneeId;

      const matchPriority = selectedPriority === 'all' || t.priority === selectedPriority;

      return matchSearch && matchClient && matchAssignee && matchPriority;
    });
  }, [tasks, search, selectedClientId, selectedAssigneeId, selectedPriority]);

  // Clients to show
  const activeClients = useMemo(() => {
    return clients.filter((c) => c.status === 'active');
  }, [clients]);

  const displayedClients = useMemo(() => {
    if (selectedClientId === 'all') return activeClients;
    return activeClients.filter((c) => c.id === selectedClientId);
  }, [activeClients, selectedClientId]);

  // Active filter chips
  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (selectedAssigneeId !== 'all') {
      const assignee = users.find((u) => u.id === selectedAssigneeId);
      chips.push({
        id: 'assignee',
        label: 'Assignee',
        value: assignee?.name || selectedAssigneeId,
        onRemove: () => setSelectedAssigneeId('all'),
      });
    }
    if (selectedPriority !== 'all') {
      chips.push({
        id: 'priority',
        label: 'Priority',
        value: selectedPriority,
        onRemove: () => setSelectedPriority('all'),
      });
    }
    return chips;
  }, [selectedAssigneeId, selectedPriority, users]);

  const handleOpenAddForClient = (clientId: string, type?: DeliverableType) => {
    setModalDefaultClientId(clientId);
    setModalDefaultType(type);
    setIsAddModalOpen(true);
  };

  const handleOpenGeneralAdd = () => {
    setModalDefaultClientId(selectedClientId !== 'all' ? selectedClientId : undefined);
    setModalDefaultType(undefined);
    setIsAddModalOpen(true);
  };

  // Grouped tasks by status for board view
  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const doneTasks = filteredTasks.filter((t) => t.status === 'done');

  const handleExportTasksPdf = async () => {
    try {
      const doc = await createPdfDoc({
        title: 'Tasks & Deliverables Log',
        period: formatDate(new Date().toISOString()),
      });
      const startY = addHeader(doc, {
        title: 'Agency Tasks & Deliverables Log',
        period: formatDate(new Date().toISOString()),
      });
      const cols = [
        { header: 'Task Title', dataKey: 'title' },
        { header: 'Client', dataKey: 'client' },
        { header: 'Assignee', dataKey: 'assignee' },
        { header: 'Priority', dataKey: 'priority' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Due Date', dataKey: 'dueDate' },
      ];
      const rows = filteredTasks.map((t) => [
        t.title,
        getClientName(t.clientId),
        getUserName(t.assigneeId),
        t.priority.toUpperCase(),
        t.status.replace('_', ' ').toUpperCase(),
        t.dueDate ? formatDate(t.dueDate) : '—',
      ]);
      addTable(doc, startY, cols, rows, {
        emptyText: 'No tasks found for current filter.',
      });
      savePdf(doc, `GetupAgency_Tasks_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF Downloaded', 'Tasks log downloaded.');
    } catch (err: any) {
      toast.error('Export Error', err.message || 'Could not export tasks.');
    }
  };

  const handleExportTasksCsv = () => {
    const headers = ['Task Title', 'Client', 'Assignee', 'Priority', 'Status', 'Due Date', 'Description'];
    const rows = filteredTasks.map((t) => [
      t.title,
      getClientName(t.clientId),
      getUserName(t.assigneeId),
      t.priority,
      t.status,
      t.dueDate || '',
      t.description || '',
    ]);
    exportToCsv(`GetupAgency_Tasks_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    toast.success('CSV Downloaded', 'Tasks exported to CSV.');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Agency Tasks & Deliverables"
        subtitle={
          isSuperAdmin
            ? 'Track package commitments, log completed deliverables in 1 tap, and manage client tasks.'
            : 'Your assigned agency tasks and deliverables.'
        }
        actions={
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportTasksCsv}
                  className="h-8 text-xs shrink-0"
                >
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportTasksPdf}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  className="h-8 text-xs shrink-0"
                >
                  Export PDF
                </Button>
              </>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenGeneralAdd}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Task
            </Button>
          </div>
        }
      />

      {/* Slim Filter Toolbar: Search + Client Filter Chips + Filters Popover + View Toggle */}
      <div className="bg-surface p-2.5 rounded-card border border-border space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-subtle border border-border rounded-control text-text placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

          {/* Right Controls: Filters popover & View toggle */}
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <FilterPopover
              activeCount={activeChips.length}
              onClearAll={() => {
                setSelectedAssigneeId('all');
                setSelectedPriority('all');
              }}
            >
              {isSuperAdmin && (
                <div>
                  <label className="font-bold text-text block mb-1">Assignee</label>
                  <select
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    className="w-full text-xs bg-surface-subtle border border-border rounded-control p-1.5 text-text"
                  >
                    <option value="all">All Team Members</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-text block mb-1">Priority</label>
                <div className="grid grid-cols-2 gap-1">
                  {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((pr) => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => setSelectedPriority(pr)}
                      className={`px-2 py-1 text-xs font-semibold rounded capitalize transition-colors ${
                        selectedPriority === pr
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-surface-subtle text-text-muted hover:text-text'
                      }`}
                    >
                      {pr}
                    </button>
                  ))}
                </div>
              </div>
            </FilterPopover>

            {/* View Toggle */}
            <div className="flex items-center gap-0.5 bg-surface-subtle p-0.5 rounded-control border border-border">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1 px-2 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-surface text-primary-700 shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`p-1 px-2 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === 'board'
                    ? 'bg-surface text-primary-700 shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
                title="Board View"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Board
              </button>
            </div>
          </div>
        </div>

        {/* Client Filter Chips Row */}
        {activeClients.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider shrink-0 mr-1">
              Client:
            </span>
            <button
              type="button"
              onClick={() => setSelectedClientId('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-pill border transition-colors shrink-0 ${
                selectedClientId === 'all'
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-surface text-text-muted border-border hover:text-text'
              }`}
            >
              All Clients ({activeClients.length})
            </button>
            {activeClients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClientId(selectedClientId === c.id ? 'all' : c.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-pill border transition-colors shrink-0 ${
                  selectedClientId === c.id
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-surface text-text-muted border-border hover:text-text'
                }`}
              >
                {c.business}
              </button>
            ))}
          </div>
        )}

        {/* Active Removable Filter Chips */}
        {activeChips.length > 0 && (
          <ActiveFilterChipsRow
            chips={activeChips}
            onClearAll={() => {
              setSelectedAssigneeId('all');
              setSelectedPriority('all');
            }}
          />
        )}
      </div>

      {/* Main Content Area */}
      {isTasksLoading ? (
        <div className="py-12 text-center text-xs text-text-muted">Loading tasks...</div>
      ) : viewMode === 'list' ? (
        /* LIST VIEW: GROUPED BY CLIENT */
        <div className="space-y-6">
          {displayedClients.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-border rounded-card text-xs text-text-muted">
              No clients found matching the selection.
            </div>
          ) : (
            displayedClients.map((client) => {
              const dlv = computeClientDeliverables(client, deliverables);
              const clientTasks = filteredTasks.filter((t) => t.clientId === client.id);

              return (
                <div
                  key={client.id}
                  className="bg-surface rounded-card border border-border overflow-hidden shadow-xs"
                >
                  {/* Client Group Header */}
                  <div className="p-4 bg-surface-subtle/50 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isSuperAdmin ? (
                          <Link
                            to={`/clients/${client.id}`}
                            className="font-bold text-sm text-text hover:text-primary-600 flex items-center gap-1.5 transition-colors"
                          >
                            <span>{client.name}</span>
                            <span className="text-xs font-normal text-text-muted">
                              ({client.business})
                            </span>
                            <ExternalLink className="w-3 h-3 text-text-subtle" />
                          </Link>
                        ) : (
                          <span className="font-bold text-sm text-text">
                            {client.name}{' '}
                            <span className="text-xs font-normal text-text-muted">
                              ({client.business})
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Active Types Progress Line */}
                      {dlv.hasPackage && dlv.activeTypes.length > 0 ? (
                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          <span className="font-semibold text-text">
                            {dlv.activeTypes
                              .map((t) => `${t.label} ${t.done} / ${t.promised}`)
                              .join(' · ')}
                          </span>
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden shrink-0">
                            <div
                              className="h-full bg-primary-600 rounded-full transition-all"
                              style={{ width: `${dlv.percent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-primary-700">
                            {dlv.percent}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted italic">No package set</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAddForClient(client.id)}
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                        className="text-xs h-7"
                      >
                        Add Task
                      </Button>
                    </div>
                  </div>

                  {/* Quick-Add Row per Active Type: [-] count [+] "Mark 1 Reel done" */}
                  {dlv.hasPackage && dlv.activeTypes.length > 0 && (
                    <div className="p-3 bg-primary-50/20 border-b border-border flex flex-wrap gap-2.5 items-center">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted mr-1">
                        1-Tap Complete:
                      </span>
                      {dlv.activeTypes.map((typeMetric) => (
                        <div
                          key={typeMetric.type}
                          className="flex items-center gap-2 bg-surface px-2.5 py-1.5 rounded-control border border-border shadow-2xs text-xs"
                        >
                          <span className="font-semibold text-text">{typeMetric.label}:</span>
                          <div className="flex items-center gap-1 bg-surface-subtle px-1 py-0.5 rounded border border-border/60">
                            <button
                              type="button"
                              onClick={() =>
                                handleQuickDecrementDeliverable(
                                  client,
                                  typeMetric.type,
                                  typeMetric.label
                                )
                              }
                              className="w-5 h-5 rounded hover:bg-slate-200 text-text-muted hover:text-text font-bold text-xs flex items-center justify-center transition-colors"
                              title={`Decrement 1 ${typeMetric.label}`}
                            >
                              −
                            </button>
                            <span className="text-xs font-bold tabular-nums min-w-[32px] text-center">
                              {typeMetric.done}/{typeMetric.promised}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleQuickAddDeliverable(
                                  client,
                                  typeMetric.type,
                                  typeMetric.label
                                )
                              }
                              className="w-5 h-5 rounded hover:bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center transition-colors"
                              title={`Add 1 ${typeMetric.label}`}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickAddDeliverable(
                                client,
                                typeMetric.type,
                                typeMetric.label
                              )
                            }
                            className="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline flex items-center gap-1 ml-1"
                          >
                            Mark 1 {typeMetric.label.replace(/s$/, '')} done
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tasks Table / List for this Client */}
                  <div className="overflow-x-auto">
                    {clientTasks.length === 0 ? (
                      <div className="py-6 px-4 text-center text-xs text-text-muted">
                        No active tasks for {client.name}. Log deliverables using the buttons above or click "Add Task".
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-surface-subtle/30 text-text-muted uppercase text-[10px] tracking-wider font-semibold">
                            <th className="py-2.5 px-4">Task</th>
                            {isSuperAdmin && <th className="py-2.5 px-4">Assignee</th>}
                            <th className="py-2.5 px-4">Priority</th>
                            <th className="py-2.5 px-4">Due Date</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {clientTasks.map((task) => (
                            <tr
                              key={task.id}
                              className="hover:bg-surface-subtle/40 transition-colors"
                            >
                              <td className="py-2.5 px-4 max-w-sm">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateStatusMutation.mutate({
                                        taskId: task.id,
                                        newStatus: task.status === 'done' ? 'todo' : 'done',
                                      })
                                    }
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                      task.status === 'done'
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'border-border hover:border-primary-500'
                                    }`}
                                  >
                                    {task.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                  </button>
                                  <span
                                    className={`font-semibold ${
                                      task.status === 'done'
                                        ? 'line-through text-text-muted'
                                        : 'text-text'
                                    }`}
                                  >
                                    {task.title}
                                  </span>
                                </div>
                                {task.deliverableType && (
                                  <span className="text-[10px] font-medium text-primary-600 capitalize ml-6">
                                    Deliverable: {task.deliverableType}
                                  </span>
                                )}
                              </td>

                              {isSuperAdmin && (
                                <td className="py-2.5 px-4 text-text font-medium">
                                  {getUserName(task.assigneeId)}
                                </td>
                              )}

                              <td className="py-2.5 px-4">
                                <Badge
                                  variant={
                                    task.priority === 'urgent'
                                      ? 'danger'
                                      : task.priority === 'high'
                                      ? 'warning'
                                      : 'slate'
                                  }
                                  className="uppercase text-[9px]"
                                >
                                  {task.priority}
                                </Badge>
                              </td>

                              <td className="py-2.5 px-4 tabular-nums text-text-muted">
                                {task.dueDate ? formatDate(task.dueDate) : '—'}
                              </td>

                              <td className="py-2.5 px-4">
                                <select
                                  value={task.status}
                                  onChange={(e) =>
                                    updateStatusMutation.mutate({
                                      taskId: task.id,
                                      newStatus: e.target.value as TaskStatus,
                                    })
                                  }
                                  className="text-[11px] font-semibold bg-surface border border-border rounded px-2 py-1 text-text capitalize"
                                >
                                  <option value="todo">To Do</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="done">Done</option>
                                </select>
                              </td>

                              <td className="py-2.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteTaskId(task.id);
                                    setDeleteTaskTitle(task.title);
                                  }}
                                  className="p-1 rounded text-text-muted hover:text-semantic-danger hover:bg-surface-subtle"
                                  title="Delete task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* BOARD VIEW (Todo / In Progress / Done) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. To Do */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b-2 border-slate-300 px-1">
              <span className="text-xs font-bold text-text uppercase tracking-wider">To Do</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {todoTasks.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {todoTasks.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-border rounded-lg text-xs text-text-muted">
                  No to-do tasks
                </div>
              ) : (
                todoTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    clientName={getClientName(task.clientId)}
                    assigneeName={getUserName(task.assigneeId)}
                    onUpdateStatus={(taskId, newStatus) =>
                      updateStatusMutation.mutate({ taskId, newStatus })
                    }
                    onDeleteTask={(id, title) => {
                      setDeleteTaskId(id);
                      setDeleteTaskTitle(title);
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* 2. In Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b-2 border-blue-500 px-1">
              <span className="text-xs font-bold text-text uppercase tracking-wider">
                In Progress
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {inProgressTasks.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {inProgressTasks.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-border rounded-lg text-xs text-text-muted">
                  No tasks in progress
                </div>
              ) : (
                inProgressTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    clientName={getClientName(task.clientId)}
                    assigneeName={getUserName(task.assigneeId)}
                    onUpdateStatus={(taskId, newStatus) =>
                      updateStatusMutation.mutate({ taskId, newStatus })
                    }
                    onDeleteTask={(id, title) => {
                      setDeleteTaskId(id);
                      setDeleteTaskTitle(title);
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* 3. Done */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b-2 border-emerald-500 px-1">
              <span className="text-xs font-bold text-text uppercase tracking-wider">Completed</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {doneTasks.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {doneTasks.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-border rounded-lg text-xs text-text-muted">
                  No completed tasks yet
                </div>
              ) : (
                doneTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    clientName={getClientName(task.clientId)}
                    assigneeName={getUserName(task.assigneeId)}
                    onUpdateStatus={(taskId, newStatus) =>
                      updateStatusMutation.mutate({ taskId, newStatus })
                    }
                    onDeleteTask={(id, title) => {
                      setDeleteTaskId(id);
                      setDeleteTaskTitle(title);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultClientId={modalDefaultClientId}
        defaultDeliverableType={modalDefaultType}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTaskId}
        title="Delete Task"
        description={`Are you sure you want to delete task "${deleteTaskTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteTaskMutation.isPending}
        onConfirm={() => {
          if (deleteTaskId) deleteTaskMutation.mutate(deleteTaskId);
        }}
        onClose={() => setDeleteTaskId(null)}
      />
    </div>
  );
};

export default TasksPage;
