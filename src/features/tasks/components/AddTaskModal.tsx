import React, { useState } from 'react';
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
import { clientService, deliverableService, taskService, teamService } from '@/services';
import { useToast } from '@/components/feedback/Toast';
import { Client, DeliverableType, Task, TaskPriority } from '@/types';
import { CheckSquare } from 'lucide-react';

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
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [createDeliverableRecord, setCreateDeliverableRecord] = useState(true);

  // Sync defaultClientId when opened
  React.useEffect(() => {
    if (defaultClientId) setClientId(defaultClientId);
    if (defaultDeliverableType) setDeliverableType(defaultDeliverableType);
  }, [defaultClientId, defaultDeliverableType, isOpen]);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients', 'list'],
    queryFn: () => clientService.getClients(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['team', 'list'],
    queryFn: () => teamService.getUsers(),
  });

  // Default assignee to first user if not selected
  React.useEffect(() => {
    if (!assigneeId && users.length > 0) {
      setAssigneeId(users[0].id);
    }
  }, [users, assigneeId]);

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Task title is required');
      if (!clientId) throw new Error('Client selection is required');
      if (!assigneeId) throw new Error('Assignee is required');

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
        priority,
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
      handleReset();
      onClose();
    },
    onError: (err: Error) => {
      toast.error('Failed to create task', err.message);
    },
  });

  const handleReset = () => {
    setTitle('');
    setDescription('');
    if (!defaultClientId) setClientId('');
    setDeliverableType('');
    setPriority('medium');
    setDueDate(new Date().toISOString().slice(0, 10));
  };

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
          onSubmit={(e) => {
            e.preventDefault();
            createTaskMutation.mutate();
          }}
          className="space-y-4 pt-4 flex-1 flex flex-col"
        >
        {/* Client Selection */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">
            Client / Business <span className="text-rose-500">*</span>
          </label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            className="w-full text-xs rounded-button border border-border bg-surface px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary-600"
          >
            <option value="">Select client...</option>
            {activeClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business} ({c.name})
              </option>
            ))}
          </select>
        </div>

        {/* Task Title */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">
            Task Title <span className="text-rose-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Edit Reel #4 - Festive Offer Campaign"
            required
          />
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
              {(() => {
                const sel = clients.find((c) => c.id === clientId);
                const types: { value: DeliverableType; label: string }[] = [];
                if (sel?.package) {
                  if ((sel.package.videosPerMonth ?? 0) > 0) types.push({ value: 'video', label: 'Video' });
                  if ((sel.package.reelsPerMonth ?? 0) > 0) types.push({ value: 'reel', label: 'Reel' });
                  if ((sel.package.postersPerMonth ?? 0) > 0) types.push({ value: 'post', label: 'Post' });
                  if ((sel.package.storiesPerMonth ?? 0) > 0) types.push({ value: 'story', label: 'Story' });
                }
                const finalTypes = types.length > 0 ? types : [
                  { value: 'video', label: 'Video' },
                  { value: 'reel', label: 'Reel' },
                  { value: 'post', label: 'Post' },
                  { value: 'story', label: 'Story' },
                ];
                return finalTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ));
              })()}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full text-xs rounded-button border border-border bg-surface px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
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
              onChange={(e) => setAssigneeId(e.target.value)}
              required
              className="w-full text-xs rounded-button border border-border bg-surface px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary-600"
            >
              <option value="">Select team member...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Due Date <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
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
