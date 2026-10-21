import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { useCreateExpense, useCreateExpensesBatch, useUpdateExpense, useClients } from '@/features/clients/hooks/useClients';
import { useToast } from '@/components/feedback/Toast';
import { Expense, ExpenseCategory, ExpenseType, ExpenseNature } from '@/types';
import { formatINR } from '@/lib/format';
import { Plus, Trash2, Receipt, Layers } from 'lucide-react';

export interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledClientId?: string;
  lockClient?: boolean;
  editingExpense?: Expense | null;
  onSuccess?: () => void;
}

interface ExpenseLineItem {
  id: string;
  category: ExpenseCategory;
  amount: number;
  note: string;
}

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: 'travel', label: 'Petrol / Travel' },
  { value: 'equipment', label: 'Equipment / Camera Rental' },
  { value: 'editor', label: 'Editor / Freelancer' },
  { value: 'shoot', label: 'Shoot / Production' },
  { value: 'props', label: 'Props & Styling' },
  { value: 'ads', label: 'Ads & Media Spend' },
  { value: 'software', label: 'Software & Subscriptions' },
  { value: 'salary', label: 'Team Salary' },
  { value: 'rent', label: 'Studio / Office Rent' },
  { value: 'other', label: 'Other / Miscellaneous' },
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  open,
  onOpenChange,
  prefilledClientId,
  lockClient = false,
  editingExpense,
  onSuccess,
}) => {
  const { data: clients = [] } = useClients();
  const createExpenseMutation = useCreateExpense();
  const createBatchMutation = useCreateExpensesBatch();
  const updateExpenseMutation = useUpdateExpense();
  const { success, error } = useToast();

  const [date, setDate] = useState('');
  const [expenseType, setExpenseType] = useState<ExpenseType | ''>(
    prefilledClientId ? 'client' : ''
  );
  const [expenseNature, setExpenseNature] = useState<ExpenseNature | ''>(
    prefilledClientId ? 'variable' : ''
  );
  const [clientId, setClientId] = useState<string>(prefilledClientId || '');
  const [projectLabel, setProjectLabel] = useState<string>('');

  // Line items state for batch creation: opens empty with no pre-selected values
  const [items, setItems] = useState<ExpenseLineItem[]>([
    { id: '1', category: '' as any, amount: '' as any, note: '' },
  ]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;

    if (editingExpense) {
      setDate(editingExpense.date || '');
      const eType = editingExpense.type || (editingExpense.clientId ? 'client' : 'agency');
      setExpenseType(eType);
      setExpenseNature(editingExpense.expenseNature || (eType === 'client' ? 'variable' : 'fixed'));
      setClientId(editingExpense.clientId || '');
      setProjectLabel(editingExpense.projectLabel || '');
      setItems([
        {
          id: 'edit-item',
          category: editingExpense.category,
          amount: editingExpense.amount,
          note: editingExpense.note,
        },
      ]);
    } else {
      setDate('');
      setExpenseType(prefilledClientId ? 'client' : '');
      setExpenseNature(prefilledClientId ? 'variable' : '');
      setClientId(prefilledClientId || '');
      setProjectLabel('');
      setItems([{ id: '1', category: '' as any, amount: '' as any, note: '' }]);
    }
    setFormErrors({});
  }, [editingExpense, open, prefilledClientId]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}`, category: '' as any, amount: '' as any, note: '' },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof ExpenseLineItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const totalAmount = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!date) errs.date = 'Expense date is required';
    if (!expenseType) errs.expenseType = 'Please choose expense type';
    if (expenseType === 'client' && !clientId) errs.clientId = 'Please select a client';
    if (expenseType === 'agency' && !expenseNature) errs.expenseNature = 'Please specify Fixed or Variable nature';

    const hasInvalid = items.some(
      (item) => !item.category || !item.amount || Number(item.amount) <= 0 || !item.note.trim()
    );
    if (hasInvalid) {
      errs.items = 'Please ensure all items have a category, note, and positive amount.';
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      error('Validation Error', 'Please complete all required fields.');
      return;
    }

    try {
      const finalType = expenseType as import('@/types').ExpenseType;
      const finalNature = (expenseType === 'client' ? 'variable' : expenseNature) as ExpenseNature;

      if (editingExpense) {
        // Edit single expense
        const single = items[0];
        await updateExpenseMutation.mutateAsync({
          id: editingExpense.id,
          data: {
            date,
            type: finalType,
            expenseNature: finalNature,
            clientId: finalType === 'client' ? clientId : undefined,
            projectLabel: projectLabel.trim() || undefined,
            category: single.category,
            amount: single.amount,
            note: single.note.trim(),
          },
        });
        success('Expense Updated', 'Expense record was updated successfully.');
      } else if (items.length === 1) {
        // Single item create
        const single = items[0];
        await createExpenseMutation.mutateAsync({
          date,
          type: finalType,
          expenseNature: finalNature,
          clientId: finalType === 'client' ? clientId : undefined,
          projectLabel: projectLabel.trim() || undefined,
          category: single.category,
          amount: single.amount,
          note: single.note.trim(),
        });
        success('Expense Recorded', `Recorded expense of ${formatINR(single.amount)}.`);
      } else {
        // Batch create
        const batchData = items.map((item) => ({
          date,
          type: finalType,
          expenseNature: finalNature,
          clientId: finalType === 'client' ? clientId : undefined,
          projectLabel: projectLabel.trim() || undefined,
          category: item.category,
          amount: item.amount,
          note: item.note.trim(),
        }));
        await createBatchMutation.mutateAsync(batchData);
        success(
          'Batch Expenses Recorded',
          `Logged ${items.length} expense items totaling ${formatINR(totalAmount)}.`
        );
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      error('Failed to Save', 'Could not record expense. Please try again.');
    }
  };

  const isSaving =
    createExpenseMutation.isPending ||
    createBatchMutation.isPending ||
    updateExpenseMutation.isPending;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col h-full flex-1">
          <ModalHeader className="border-b border-border pb-3">
            <ModalTitle className="flex items-center gap-2 text-base font-bold">
              <Receipt className="w-5 h-5 text-primary-600" />
              {editingExpense ? 'Edit Expense Record' : 'Record Agency / Client Expense'}
            </ModalTitle>
            <ModalDescription className="text-xs text-text-muted">
              Add client shoot costs (petrol, camera rental, ads) or general agency operating expenses (Fixed or Variable).
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 py-4 flex-1 overflow-y-auto pr-1">
            {/* Top row: Expense Type, Nature & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-text block mb-1.5">
                  Expense Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-surface-subtle p-1 rounded-control border border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseType('client');
                      setExpenseNature('variable');
                      if (formErrors.expenseType) setFormErrors((prev) => ({ ...prev, expenseType: '', expenseNature: '' }));
                    }}
                    disabled={lockClient}
                    className={`py-1 px-2 text-xs font-bold rounded transition-colors ${
                      expenseType === 'client'
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    Client
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseType('agency');
                      if (formErrors.expenseType) setFormErrors((prev) => ({ ...prev, expenseType: '' }));
                    }}
                    disabled={lockClient}
                    className={`py-1 px-2 text-xs font-bold rounded transition-colors ${
                      expenseType === 'agency'
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    Agency
                  </button>
                </div>
                {formErrors.expenseType && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">{formErrors.expenseType}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-text block mb-1.5">
                  Expense Nature <span className="text-rose-500">*</span>
                </label>
                {expenseType === 'client' ? (
                  <div className="py-2 px-2.5 bg-surface-subtle border border-border rounded-control text-xs text-text-muted">
                    <span className="font-bold text-text">Variable</span> (Always for client)
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 bg-surface-subtle p-1 rounded-control border border-border">
                    <button
                      type="button"
                      onClick={() => {
                        setExpenseNature('fixed');
                        if (formErrors.expenseNature) setFormErrors((prev) => ({ ...prev, expenseNature: '' }));
                      }}
                      className={`py-1 px-2 text-xs font-bold rounded transition-colors ${
                        expenseNature === 'fixed'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-text-muted hover:text-text'
                      }`}
                    >
                      Fixed
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExpenseNature('variable');
                        if (formErrors.expenseNature) setFormErrors((prev) => ({ ...prev, expenseNature: '' }));
                      }}
                      className={`py-1 px-2 text-xs font-bold rounded transition-colors ${
                        expenseNature === 'variable'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-text-muted hover:text-text'
                      }`}
                    >
                      Variable
                    </button>
                  </div>
                )}
                {formErrors.expenseNature && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">{formErrors.expenseNature}</p>
                )}
              </div>

              <FormField label="Expense Date" required error={formErrors.date}>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (formErrors.date) setFormErrors((prev) => ({ ...prev, date: '' }));
                  }}
                  className={formErrors.date ? 'border-rose-500' : ''}
                />
              </FormField>
            </div>

            {/* Client Picker & Project / Shoot Label */}
            {expenseType === 'client' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-primary-50/40 p-3 rounded-control border border-primary-100">
                <FormField label="Assigned Client" required error={formErrors.clientId}>
                  <Select
                    value={clientId}
                    placeholder="Select client..."
                    onChange={(e) => {
                      setClientId(e.target.value);
                      if (formErrors.clientId) setFormErrors((prev) => ({ ...prev, clientId: '' }));
                    }}
                    disabled={lockClient}
                    options={clients.map((c) => ({
                      value: c.id,
                      label: `${c.name} (${c.business})`,
                    }))}
                  />
                  {lockClient && (
                    <span className="text-[10px] text-primary-700 font-medium mt-1 inline-block">
                      Locked to current client dossier
                    </span>
                  )}
                </FormField>

                <FormField label="Project / Shoot Group Label" hint="e.g. Shoot for Balaji Catering">
                  <Input
                    placeholder="e.g. Diwali Shoot / Video Production"
                    value={projectLabel}
                    onChange={(e) => setProjectLabel(e.target.value)}
                  />
                </FormField>
              </div>
            )}

            {/* Line Items Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary-600" />
                  Expense Items {items.length > 1 && `(${items.length} items)`}
                </label>
                {!editingExpense && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    className="h-7 text-xs"
                  >
                    Add Line Item
                  </Button>
                )}
              </div>

              {formErrors.items && (
                <p className="text-[11px] text-rose-500 font-semibold p-2.5 bg-rose-50 rounded border border-rose-200">
                  {formErrors.items}
                </p>
              )}

              <div className="space-y-2.5">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-control border border-border bg-surface flex flex-col sm:flex-row items-start sm:items-center gap-2.5"
                  >
                    <div className="w-full sm:w-1/3 min-w-[140px]">
                      <span className="text-[10px] text-text-muted font-bold block mb-1">
                        Category #{idx + 1}
                      </span>
                      <Select
                        value={item.category}
                        placeholder="Select category..."
                        onChange={(e) =>
                          handleUpdateItem(item.id, 'category', e.target.value as ExpenseCategory)
                        }
                        options={CATEGORY_OPTIONS}
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="flex-1 w-full">
                      <span className="text-[10px] text-text-muted font-bold block mb-1">
                        Item Description / Note
                      </span>
                      <Input
                        placeholder="e.g. Petrol or Camera rental"
                        value={item.note}
                        onChange={(e) => handleUpdateItem(item.id, 'note', e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="w-full sm:w-36">
                      <span className="text-[10px] text-text-muted font-bold block mb-1">
                        Amount (₹)
                      </span>
                      <MoneyInput
                        value={item.amount}
                        placeholder="0"
                        onChange={(val) => handleUpdateItem(item.id, 'amount', val)}
                        className="text-xs h-8"
                      />
                    </div>

                    {!editingExpense && items.length > 1 && (
                      <div className="sm:pt-5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-8 w-8 p-0 text-text-muted hover:text-semantic-danger"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Running Total Bar */}
              <div className="flex items-center justify-between p-3 rounded-control bg-surface-subtle border border-border">
                <span className="text-xs font-semibold text-text-muted">Total Expense to Record:</span>
                <span className="text-base font-bold text-text tabular-nums text-semantic-danger">
                  {formatINR(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          <ModalFooter className="border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
              {editingExpense
                ? 'Save Changes'
                : items.length > 1
                ? `Save All ${items.length} Items (${formatINR(totalAmount)})`
                : 'Save Expense'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
