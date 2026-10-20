import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService, deliverableService, taskService, teamService, billingCycleService } from '@/services';
import { useToast } from '@/components/feedback/Toast';
import { Client, DeliverableType, Task, TaskPriority, BillingCycle } from '@/types';
import { deriveCycleStatus } from '@/lib/cycleUtils';
import { CheckSquare, Lock } from 'lucide-react';

export interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClientId?: string;
  defaultDeliverableType?: DeliverableType;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  defaultClientId,
  defaultDeliverableType,
}) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState(defaultClientId || '');
  const [deliverableType, setDeliverableType] = useState<DeliverableType | ''>(
    defaultDeliverableType || ''
  );
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [createDeliverableRecord, setCreateDeliverableRecord] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Reset form every time modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setClientId(defaultClientId || '');
      setDeliverableType(defaultDeliverableType || '');
      setAssigneeId('');
      setPriority('');
      setDueDate('');
      setCreateDeliverableRecord(false);
      setFormErrors({});
    } else {
      setTitle('');
      setDescription('');
      setClientId('');
      setDeliverableType('');
      setAssigneeId('');
      setPriority('');
      setDueDate('');
      setFormErrors({});
    }
  }, [isOpen, defaultClientId, defaultDeliverableType]);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients', 'list'],
    queryFn: () => clientService.getClients(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['team', 'list'],
    queryFn: () => teamService.getUsers(),
  });

  const { data: allCycles = [] } = useQuery<BillingCycle[]>({
    queryKey: ['billingCycles'],
    queryFn: () => billingCycleService.getCycles(),
  });

  // Active package types for the selected client's active cycle
  const availableDeliverableTypes = useMemo(() => {
    if (!clientId) return [];
    const clientCycles = allCycles
      .filter((c) => c.clientId === clientId)
      .sort((a, b) => a.cycleNumber - b.cycleNumber);
    
    const activeCycle =
      clientCycles.find((c) => {
        const s = deriveCycleStatus(c);
        return s === 'active' || s === 'renewal_pending';
      }) || clientCycles[clientCycles.length - 1];

    if (!activeCycle?.package) return [];

    const types: { value: DeliverableType; label: string }[] = [];
    if ((activeCycle.package.videos ?? 0) > 0) types.push({ value: 'video', label: 'Video' });
    if ((activeCycle.package.reels ?? 0) > 0) types.push({ value: 'reel', label: 'Reel' });
    if ((activeCycle.package.posts ?? 0) > 0) types.push({ value: 'post', label: 'Post' });
    if ((activeCycle.package.stories ?? 0) > 0) types.push({ value: 'story', label: 'Story' });

    return types;
  }, [clientId, allCycles]);

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const errors: Record<string, string> = {};
      if (!clientId) errors.clientId = 'Please select a client';
      if (!title.trim()) errors.title = 'Task title is required';
      if (!priority) errors.priority = 'Please choose task priority';
      if (!assigneeId) errors.assigneeId = 'Please select team member';
      if (!dueDate) errors.dueDate = 'Due date is required';

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        throw new Error('Please fill in all required fields');
      }

      let createdDeliverableId: string | undefined;

      // If deliverable type selected and user requested creating deliverable record
      if (deliverableType && createDeliverableRecord) {
        const month = dueDate.slice(0, 7);
        const deliverable = await deliverableService.createDeliverable({
          clientId,
          type: deliverableType,
          title: title.trim(),
          date: dueDate,
          month,
          status: 'planned',
          notes: description.trim() || undefined,
        });
        createdDeliverableId = deliverable.id;
      }

      const task = await taskService.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        clientId,
        deliverableId: createdDeliverableId,
        deliverableType: (deliverableType || undefined) as DeliverableType | undefined,
        assigneeId,
        priority: priority as TaskPriority,
        status: 'todo',
        dueDate,
        timeSpent: 0,
      });

      return task;
    },
    onSuccess: (task: Task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task Created', `"${task.title}" has been assigned and tracked.`);
      onClose();
    },
    onError: (err: Error) => {
      toast.error('Failed to create task', err.message);
    },
  });

  const activeClients = clients.filter((c) => c.status === 'active');

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary-600" />
            Create Client Task
          </ModalTitle>
          <ModalDescription>
            Assign client deliverables or agency tasks with priority and target deadline.
          </ModalDescription>
        </ModalHeader>
        <form
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            createTaskMutation.mutate();
          }}
          className="space-y-4 pt-4 flex-1 flex flex-col"
        >
        {/* Client Selection */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-text">
              Client / Business <span className="text-rose-500">*</span>
            </label>
            {defaultClientId && (
              <span className="text-[10px] text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-200 flex items-center gap-1 font-medium">
                <Lock className="w-2.5 h-2.5" /> Locked from context
              </span>
            )}
          </div>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              if (formErrors.clientId) setFormErrors((prev) => ({ ...prev, clientId: '' }));
            }}
            disabled={!!defaultClientId}
            className={`w-full text-xs rounded-button border bg-surface px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary-600 ${
              formErrors.clientId ? 'border-rose-500' : 'border-border'
            }`}
          >
            <option value="">Select client...</option>
            {activeClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business} ({c.name})
              </option>
            ))}
          </select>
          {formErrors.clientId && (
            <p className="text-[10px] text-rose-500 font-medium mt-1">{formErrors.clientId}</p>
          )}
        </div>

        {/* Task Title */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">
            Task Title <span className="text-rose-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: '' }));
            }}
            placeholder="e.g. Edit Reel #4 - Festive Offer Campaign"
            className={formErrors.title ? 'border-rose-500' : ''}
          />
          {formErrors.title && (
            <p className="text-[10px] text-rose-500 font-medium mt-1">{formErrors.title}</p>
          )}
        </div>

        {/* Deliverable Type & Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Deliverable Category (Optional)
            </label>
            <select
              value={deliverableType}
              onChange={(e) => setDeliverableType(e.target.value as DeliverableType | '')}
              className="w-full text-xs rounded-button border border-border bg-surface px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              <option value="">None / General Task</option>
              {availableDeliverableTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {clientId && availableDeliverableTypes.length === 0 && (
              <p className="text-[10px] text-text-muted mt-1 italic">
                Client has no active package types in current cycle
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Priority <span className="text-rose-500">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value as TaskPriority);
                if (formErrors.priority) setFormErrors((prev) => ({ ...prev, priority: '' }));
              }}
              className={`w-full text-xs rounded-button border bg-surface px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary-600 ${
                formErrors.priority ? 'border-rose-500' : 'border-border'
              }`}
            >
              <option value="">Select priority...</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            {formErrors.priority && (
              <p className="text-[10px] text-rose-500 font-medium mt-1">{formErrors.priority}</p>
            )}
          </div>
        </div>

        {deliverableType && (
          <div className="p-2.5 rounded bg-primary-50 border border-primary-200 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-primary-900">
              <input
                type="checkbox"
                checked={createDeliverableRecord}
                onChange={(e) => setCreateDeliverableRecord(e.target.checked)}
                className="rounded border-border text-primary-600 focus:ring-primary-500"
              />
              <span>Track as deliverable: Marking this task done will count as delivered work</span>
            </label>
          </div>
        )}

        {/* Assignee and Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Assignee <span className="text-rose-500">*</span>
            </label>
            <select
              value={assigneeId}
              onChange={(e) => {
                setAssigneeId(e.target.value);
                if (formErrors.assigneeId) setFormErrors((prev) => ({ ...prev, assigneeId: '' }));
              }}
              className={`w-full text-xs rounded-button border bg-surface px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary-600 ${
                formErrors.assigneeId ? 'border-rose-500' : 'border-border'
              }`}
            >
              <option value="">Select team member...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
            {formErrors.assigneeId && (
              <p className="text-[10px] text-rose-500 font-medium mt-1">{formErrors.assigneeId}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Due Date <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                if (formErrors.dueDate) setFormErrors((prev) => ({ ...prev, dueDate: '' }));
              }}
              className={formErrors.dueDate ? 'border-rose-500' : ''}
            />
            {formErrors.dueDate && (
              <p className="text-[10px] text-rose-500 font-medium mt-1">{formErrors.dueDate}</p>
            )}
          </div>
        </div>

        {/* Description / Notes */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">Task Notes</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details, reference assets, instructions for editor..."
            rows={2}
            className="w-full text-xs rounded-button border border-border bg-surface p-2.5 text-text focus:outline-none focus:ring-1 focus:ring-primary-600"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-auto">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
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
        </div>
      </form>
    </ModalContent>
  </Modal>
  );
};
