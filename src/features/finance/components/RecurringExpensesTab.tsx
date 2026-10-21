import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { FormField } from '@/components/forms/FormField';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { useToast } from '@/components/feedback/Toast';
import { financeService, teamService } from '@/services';
import { RecurringFixedExpense, ExpenseCategory, Expense } from '@/types';
import { formatINR, formatMonth } from '@/lib/format';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export interface RecurringExpensesTabProps {
  selectedMonth: string;
  expenses: Expense[];
}

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: 'salary', label: 'Team Salary' },
  { value: 'rent', label: 'Studio / Office Rent' },
  { value: 'software', label: 'Software & Subscriptions' },
  { value: 'other', label: 'Internet / Utilities / Other' },
];

export const RecurringExpensesTab: React.FC<RecurringExpensesTabProps> = ({
  selectedMonth,
  expenses,
}) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringFixedExpense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state - opens EMPTY by default
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [amount, setAmount] = useState<number | null>(null);
  const [startMonth, setStartMonth] = useState('');
  const [teamMemberId, setTeamMemberId] = useState('');
  const [autoAdd, setAutoAdd] = useState(false);
  const [active, setActive] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Queries
  const { data: recurringList = [] } = useQuery<RecurringFixedExpense[]>({
    queryKey: ['finance', 'recurringFixed'],
    queryFn: () => financeService.getRecurringFixedExpenses(),
  });

  const { data: teamUsers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getUsers(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Omit<RecurringFixedExpense, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) =>
      financeService.createRecurringFixedExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecurringFixedExpense> }) =>
      financeService.updateRecurringFixedExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeService.deleteRecurringFixedExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (item: RecurringFixedExpense) => {
      const expDate = `${selectedMonth}-01`;
      return financeService.createExpense({
        category: item.category,
        amount: item.amount,
        date: expDate,
        note: `Fixed Recurring: ${item.name} (${formatMonth(selectedMonth)})`,
        paidTo: item.teamMemberId
          ? teamUsers.find((u) => u.id === item.teamMemberId)?.name
          : item.name,
        type: 'agency',
        expenseNature: 'fixed',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName('');
    setCategory('');
    setAmount(null);
    setStartMonth('');
    setTeamMemberId('');
    setAutoAdd(false);
    setActive(true);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (item: RecurringFixedExpense) => {
    setEditingItem(item);
    setName(item.name || '');
    setCategory(item.category || '');
    setAmount(item.amount || null);
    setStartMonth(item.startMonth || '');
    setTeamMemberId(item.teamMemberId || '');
    setAutoAdd(!!item.autoAdd);
    setActive(item.active !== false);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};

    if (!name.trim()) err['name'] = 'Expense name is required';
    if (!category) err['category'] = 'Please select an expense category';
    if (!amount || amount <= 0) err['amount'] = 'Valid amount is required';
    if (!startMonth) err['startMonth'] = 'Start month is required';

    if (Object.keys(err).length > 0) {
      setFormErrors(err);
      return;
    }

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: {
            name: name.trim(),
            category: category as ExpenseCategory,
            amount: Number(amount),
            startMonth,
            teamMemberId: teamMemberId || undefined,
            autoAdd,
            active,
          },
        });
        toast.success('Updated', 'Recurring fixed expense updated.');
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          category: category as ExpenseCategory,
          amount: Number(amount),
          startMonth,
          teamMemberId: teamMemberId || undefined,
          autoAdd,
          active,
        });
        toast.success('Created', 'Recurring fixed expense added.');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save recurring expense.');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirmId);
      toast.success('Deleted', 'Recurring fixed expense removed.');
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not delete recurring expense.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-card bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-600" />
            Recurring Monthly Fixed Expenses Setup
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Define regular monthly overheads (e.g. ₹18,000 team salary, office rent, software licenses).
            Each month they appear as due; confirm "Mark Paid" or enable automatic booking on the 1st.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenCreate}
        >
          Add Fixed Expense
        </Button>
      </div>

      {/* Monthly Due List for Selected Month */}
      <Card className="p-4 border-border space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h4 className="text-xs font-bold text-text uppercase tracking-wider">
              Status for {formatMonth(selectedMonth)}
            </h4>
            <span className="text-[11px] text-text-muted">
              Reconcile this month's fixed commitments into the expense ledger.
            </span>
          </div>
        </div>

        {recurringList.length === 0 ? (
          <div className="text-center py-8 text-xs text-text-muted">
            No recurring fixed expenses configured yet. Click "Add Fixed Expense" to set up team salaries, rent, and regular overheads.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recurringList.map((item) => {
              // Check if already paid for selectedMonth
              const isPaid = expenses.some(
                (e) =>
                  e.date.startsWith(selectedMonth) &&
                  e.expenseNature === 'fixed' &&
                  (e.note.includes(item.name) || (item.category === 'salary' && e.category === 'salary' && e.amount === item.amount))
              );

              return (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs first:pt-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text text-sm">{item.name}</span>
                      <Badge variant="slate">{item.category.toUpperCase()}</Badge>
                      {!item.active && <Badge variant="danger">Inactive</Badge>}
                      {item.autoAdd && <Badge variant="primary">Auto-Add On 1st</Badge>}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-text-muted text-[11px]">
                      <span>Amount: <strong className="text-text">{formatINR(item.amount)}</strong> / month</span>
                      <span>Starts: {item.startMonth}</span>
                      {item.teamMemberId && (
                        <span>
                          Member: <strong>{teamUsers.find((u) => u.id === item.teamMemberId)?.name || 'Linked'}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {isPaid ? (
                      <span className="px-2.5 py-1 rounded text-xs bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Paid for {formatMonth(selectedMonth)}
                      </span>
                    ) : item.active ? (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        disabled={markPaidMutation.isPending}
                        onClick={async () => {
                          try {
                            await markPaidMutation.mutateAsync(item);
                            toast.success('Recorded as Paid', `${item.name} (₹${item.amount}) booked as fixed expense.`);
                          } catch (err: any) {
                            toast.error('Booking Failed', err.message || 'Could not record expense.');
                          }
                        }}
                      >
                        Mark Paid
                      </Button>
                    ) : (
                      <span className="text-[11px] text-text-muted italic">Inactive</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-text-muted hover:text-text rounded hover:bg-surface-subtle transition-colors"
                      title="Edit definition"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="p-1.5 text-text-muted hover:text-rose-600 rounded hover:bg-surface-subtle transition-colors"
                      title="Delete definition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal: Add / Edit Recurring Fixed Expense */}
      <Modal open={modalOpen} onOpenChange={setModalOpen}>
        <ModalContent size="md" variant="center">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2 text-base font-bold">
              <Layers className="w-5 h-5 text-primary-600" />
              {editingItem ? 'Edit Recurring Fixed Expense' : 'Add Monthly Fixed Expense'}
            </ModalTitle>
            <ModalDescription className="text-xs text-text-muted">
              Define recurring regular agency overhead like team salary, studio rent, or software.
            </ModalDescription>
          </ModalHeader>

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 pt-3">
            <FormField label="Expense Name" required error={formErrors.name}>
              <Input
                placeholder="e.g. Rohit Monthly Salary or Studio Rent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Category" required error={formErrors.category}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full text-xs rounded-control border border-border bg-surface px-3 py-2 text-text font-medium"
                >
                  <option value="">Select category...</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Monthly Amount (₹)" required error={formErrors.amount}>
                <MoneyInput
                  value={amount}
                  onChange={setAmount}
                  placeholder="e.g. 18000"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Start Month (YYYY-MM)" required error={formErrors.startMonth}>
                <Input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  autoComplete="off"
                />
              </FormField>

              <FormField label="Link Team Member (Optional)">
                <select
                  value={teamMemberId}
                  onChange={(e) => setTeamMemberId(e.target.value)}
                  className="w-full text-xs rounded-control border border-border bg-surface px-3 py-2 text-text font-medium"
                >
                  <option value="">None / Agency Operational</option>
                  {teamUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'super_admin' ? 'Admin' : 'Worker'})
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Auto-Add Toggle */}
            <div className="p-3.5 rounded-card bg-surface-subtle border border-border flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-text block">Auto-Add on 1st of each month</span>
                <span className="text-[11px] text-text-muted">
                  Automatically book this expense record when the month starts (off by default)
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={autoAdd}
                  onChange={(e) => setAutoAdd(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
              </label>
            </div>

            {/* Active Toggle */}
            <div className="p-3.5 rounded-card bg-surface-subtle border border-border flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-text block">Active Status</span>
                <span className="text-[11px] text-text-muted">
                  Inactive items will not show as due or auto-add
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
              </label>
            </div>

            <ModalFooter className="px-0 pt-2 pb-0 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingItem ? 'Save Changes' : 'Create Recurring Item'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <ModalContent size="sm" variant="center">
          <ModalHeader>
            <ModalTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Remove Recurring Expense
            </ModalTitle>
            <ModalDescription className="text-xs text-text-muted">
              Are you sure you want to delete this recurring expense definition? Past logged expenses will remain unaffected.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
