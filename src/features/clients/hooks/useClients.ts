import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService, deliverableService, financeService, taskService, activityLogService } from '@/services';
import { clientKeys } from './clientKeys';
import { Client, Deliverable, Payment, Task, Expense } from '@/types';

export function useClients(filters?: { search?: string; status?: string }) {
  return useQuery<Client[]>({
    queryKey: clientKeys.list(filters),
    queryFn: () => clientService.getClients(filters),
  });
}

export function useClient(id: string) {
  return useQuery<Client | null>({
    queryKey: clientKeys.detail(id),
    queryFn: () => clientService.getClientById(id),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
      const client = await clientService.createClient(data);
      await activityLogService.log('created', 'client', client.id, { clientName: client.name });
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Client> }) => {
      const updated = await clientService.updateClient(id, data);
      await activityLogService.log('updated', 'client', id, { clientName: updated.name });
      return updated;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await clientService.deleteClient(id);
      await activityLogService.log('deleted', 'client', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      queryClient.invalidateQueries({ queryKey: ['deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}

export function useClientDeliverables(clientId?: string) {
  return useQuery<Deliverable[]>({
    queryKey: ['deliverables', 'client', clientId],
    queryFn: () => (clientId ? deliverableService.getDeliverables({ clientId }) : Promise.resolve([])),
    enabled: !!clientId,
  });
}

export function useCreateDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Deliverable, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
      const dlv = await deliverableService.createDeliverable(data);
      await activityLogService.log('added', 'deliverable', dlv.id, { title: dlv.title, type: dlv.type, clientId: dlv.clientId });
      return dlv;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['deliverables', 'client', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}

export function useUpdateDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Deliverable> }) => {
      const updated = await deliverableService.updateDeliverable(id, data);
      await activityLogService.log('updated', 'deliverable', id, { title: updated.title, status: updated.status });
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['deliverables', 'client', updated.clientId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}

export function useDeleteDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      await deliverableService.deleteDeliverable(id);
      await activityLogService.log('deleted', 'deliverable', id, { clientId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}

export function useClientPayments(clientId?: string) {
  return useQuery<Payment[]>({
    queryKey: ['finance', 'payments', 'client', clientId],
    queryFn: () => (clientId ? financeService.getPayments({ clientId }) : Promise.resolve([])),
    enabled: !!clientId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
      const pay = await financeService.createPayment(data);
      await activityLogService.log('added', 'payment', pay.id, { amount: pay.amount, clientId: pay.clientId });
      return pay;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'payments', 'client', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Payment> }) => {
      const updated = await financeService.updatePayment(id, data);
      await activityLogService.log('updated', 'payment', id, { amount: updated.amount, status: updated.status });
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'payments', 'client', updated.clientId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      await financeService.deletePayment(id);
      await activityLogService.log('deleted', 'payment', id, { clientId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}

export function useClientTasks(clientId?: string) {
  return useQuery<Task[]>({
    queryKey: ['tasks', 'client', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const allTasks = await taskService.getTasks();
      return allTasks.filter((t) => t.clientId === clientId);
    },
    enabled: !!clientId,
  });
}

export function useClientExpenses(clientId?: string) {
  return useQuery<Expense[]>({
    queryKey: ['finance', 'expenses', 'client', clientId],
    queryFn: () => (clientId ? financeService.getExpenses({ clientId }) : Promise.resolve([])),
    enabled: !!clientId,
  });
}

export function useAllExpenses(filters?: { month?: string; category?: string; type?: string }) {
  return useQuery<Expense[]>({
    queryKey: ['finance', 'expenses', filters],
    queryFn: () => financeService.getExpenses(filters),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
      const exp = await financeService.createExpense(data);
      await activityLogService.log('added', 'expense', exp.id, {
        amount: exp.amount,
        category: exp.category,
        clientId: exp.clientId,
      });
      return exp;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      if (variables.clientId) {
        queryClient.invalidateQueries({ queryKey: ['finance', 'expenses', 'client', variables.clientId] });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}

export function useCreateExpensesBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: Array<Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>) => {
      const list = await financeService.createExpensesBatch(items);
      const totalAmount = items.reduce((s, i) => s + i.amount, 0);
      await activityLogService.log('added', 'expense_batch', `${items.length}_items`, {
        count: items.length,
        totalAmount,
        clientId: items[0]?.clientId,
        projectLabel: items[0]?.projectLabel,
      });
      return list;
    },
    onSuccess: (createdList) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      const clientIds = new Set(createdList.map((i) => i.clientId).filter(Boolean));
      clientIds.forEach((cId) => {
        queryClient.invalidateQueries({ queryKey: ['finance', 'expenses', 'client', cId] });
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Expense> }) => {
      const updated = await financeService.updateExpense(id, data);
      await activityLogService.log('updated', 'expense', id, { amount: updated.amount });
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      if (updated.clientId) {
        queryClient.invalidateQueries({ queryKey: ['finance', 'expenses', 'client', updated.clientId] });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId?: string }) => {
      await financeService.deleteExpense(id);
      await activityLogService.log('deleted', 'expense', id, { clientId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
}
