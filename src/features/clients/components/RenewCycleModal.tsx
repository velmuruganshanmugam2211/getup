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
import { Badge } from '@/components/ui/Badge';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { FormField } from '@/components/forms/FormField';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingCycleService, deliverableService } from '@/services';
import { useToast } from '@/components/feedback/Toast';
import {
  BillingCycle,
  BillingCyclePackage,
  Client,
  Deliverable,
  DeliverableType,
} from '@/types';
import { formatINR, formatDate } from '@/lib/format';
import {
  calculateNextCycleStartDate,
  calculateCycleEndDate,
  formatCycleDateRange,
} from '@/lib/cycleUtils';
import {
  RotateCcw,
  CheckCircle2,
  Layers,
  Calendar,
  Video,
  FileText,
  Film,
  Camera,
} from 'lucide-react';

export interface RenewCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  cycle: BillingCycle;
  onSuccess?: () => void;
}

export const RenewCycleModal: React.FC<RenewCycleModalProps> = ({
  open,
  onOpenChange,
  client,
  cycle,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [mode, setMode] = useState<'same_plan' | 'change_plan'>('same_plan');

  // Change plan fields — ALWAYS START BLANK per requirements
  const [newFee, setNewFee] = useState<number | ''>('');
  const [activeTypes, setActiveTypes] = useState<{
    videos: boolean;
    posts: boolean;
    reels: boolean;
    stories: boolean;
  }>({
    videos: false,
    posts: false,
    reels: false,
    stories: false,
  });
  const [quantities, setQuantities] = useState<{
    videos: number | '';
    posts: number | '';
    reels: number | '';
    stories: number | '';
  }>({
    videos: '',
    posts: '',
    reels: '',
    stories: '',
  });

  // Carry forward & Credit options
  const [carryForwardRemaining, setCarryForwardRemaining] = useState(false);
  const [creditExtraDelivered, setCreditExtraDelivered] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form whenever modal opens or closes
  useEffect(() => {
    setMode('same_plan');
    setNewFee('');
    setActiveTypes({ videos: false, posts: false, reels: false, stories: false });
    setQuantities({ videos: '', posts: '', reels: '', stories: '', });
    setCarryForwardRemaining(false);
    setCreditExtraDelivered(false);
    setNotes('');
    setErrors({});
  }, [open, cycle]);

  // Query deliverables to show unfinished and extra work summaries
  const { data: deliverables = [] } = useQuery<Deliverable[]>({
    queryKey: ['deliverables', 'client', client.id],
    queryFn: () => deliverableService.getDeliverables({ clientId: client.id }),
    enabled: open && !!client.id,
  });

  const cycleDelivs = deliverables.filter(
    (d) =>
      d.status === 'delivered' &&
      (d.cycleId === cycle.id ||
        (!d.cycleId && d.date >= cycle.startDate && d.date <= cycle.endDate))
  );

  // Compute remaining and extra
  const typeMap: { key: keyof BillingCyclePackage; type: DeliverableType; label: string }[] = [
    { key: 'videos', type: 'video', label: 'Videos' },
    { key: 'posts', type: 'post', label: 'Posts' },
    { key: 'reels', type: 'reel', label: 'Reels' },
    { key: 'stories', type: 'story', label: 'Stories' },
  ];

  const typeSummaries = typeMap.map(({ key, type, label }) => {
    const promised =
      (cycle.package[key] || 0) + (cycle.carriedForward?.[key] || 0);
    const done =
      cycleDelivs.filter((d) => d.type === type).length +
      (cycle.creditedExtra?.[key] || 0);
    const remaining = Math.max(0, promised - done);
    const extra = Math.max(0, done - promised);
    return { key, type, label, promised, done, remaining, extra };
  });

  const totalRemaining = typeSummaries.reduce((sum, t) => sum + t.remaining, 0);
  const totalExtra = typeSummaries.reduce((sum, t) => sum + t.extra, 0);

  // Next cycle dates
  const nextStartDate = calculateNextCycleStartDate(cycle.endDate);
  const nextEndDate = calculateCycleEndDate(nextStartDate);
  const nextCycleNum = cycle.cycleNumber + 1;

  const renewMutation = useMutation({
    mutationFn: async () => {
      setErrors({});

      if (mode === 'change_plan') {
        const errs: Record<string, string> = {};
        if (newFee === '' || newFee <= 0) {
          errs.fee = 'Please enter a valid monthly fee amount.';
        }
        const hasAnyType = Object.values(activeTypes).some(Boolean);
        if (!hasAnyType) {
          errs.package = 'Please select at least one deliverable type for the new plan.';
        }
        if (activeTypes.videos && (quantities.videos === '' || quantities.videos <= 0)) {
          errs.videos = 'Please enter videos quantity.';
        }
        if (activeTypes.posts && (quantities.posts === '' || quantities.posts <= 0)) {
          errs.posts = 'Please enter posts quantity.';
        }
        if (activeTypes.reels && (quantities.reels === '' || quantities.reels <= 0)) {
          errs.reels = 'Please enter reels quantity.';
        }
        if (activeTypes.stories && (quantities.stories === '' || quantities.stories <= 0)) {
          errs.stories = 'Please enter stories quantity.';
        }

        if (Object.keys(errs).length > 0) {
          setErrors(errs);
          throw new Error('Please fill in all required fields.');
        }

        const newPkg: BillingCyclePackage = {};
        if (activeTypes.videos && typeof quantities.videos === 'number') newPkg.videos = quantities.videos;
        if (activeTypes.posts && typeof quantities.posts === 'number') newPkg.posts = quantities.posts;
        if (activeTypes.reels && typeof quantities.reels === 'number') newPkg.reels = quantities.reels;
        if (activeTypes.stories && typeof quantities.stories === 'number') newPkg.stories = quantities.stories;

        return billingCycleService.renewCycle(cycle.id, {
          samePlan: false,
          newPackage: newPkg,
          newFee: typeof newFee === 'number' ? newFee : 0,
          carryForwardRemaining,
          creditExtraDelivered,
          notes: notes.trim() || undefined,
        });
      }

      // Same plan
      return billingCycleService.renewCycle(cycle.id, {
        samePlan: true,
        carryForwardRemaining,
        creditExtraDelivered,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: (newCycle) => {
      queryClient.invalidateQueries({ queryKey: ['billing-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['deliverables'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });

      toast.success(
        'Billing Cycle Renewed',
        `Cycle ${newCycle.cycleNumber} is now active for ${client.name} (${formatDate(newCycle.startDate)} to ${formatDate(newCycle.endDate)}).`
      );
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast.error('Renewal Failed', err.message);
    },
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent variant="side" className="max-w-xl">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <ModalTitle>Renew Billing Cycle</ModalTitle>
              <ModalDescription>
                {client.name} · Cycle {cycle.cycleNumber} ({formatCycleDateRange(cycle.startDate, cycle.endDate)})
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* Cycle dates banner */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Next Billing Cycle
              </span>
              <span className="text-base font-bold text-text">
                Cycle {nextCycleNum}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-muted flex items-center gap-1 justify-end">
                <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                {formatDate(nextStartDate)} – {formatDate(nextEndDate)}
              </span>
              <span className="text-[11px] text-text-tertiary">
                Auto-computed (1 month - 1 day)
              </span>
            </div>
          </div>

          {/* Unfinished / Extra work questions */}
          {(totalRemaining > 0 || totalExtra > 0) && (
            <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
              <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-primary" />
                Cycle Balance Hand-off
              </h4>

              {totalRemaining > 0 && (
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-subtle border border-border/60">
                  <input
                    type="checkbox"
                    id="carryForward"
                    checked={carryForwardRemaining}
                    onChange={(e) => setCarryForwardRemaining(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                  />
                  <label htmlFor="carryForward" className="text-xs cursor-pointer flex-1">
                    <span className="font-semibold text-text block">
                      Carry forward unfinished work ({totalRemaining} remaining items)
                    </span>
                    <span className="text-text-muted text-[11px]">
                      {typeSummaries
                        .filter((t) => t.remaining > 0)
                        .map((t) => `${t.remaining} ${t.label}`)
                        .join(', ')}{' '}
                      will be added as an extra target in Cycle {nextCycleNum}.
                    </span>
                  </label>
                </div>
              )}

              {totalExtra > 0 && (
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-subtle border border-border/60">
                  <input
                    type="checkbox"
                    id="creditExtra"
                    checked={creditExtraDelivered}
                    onChange={(e) => setCreditExtraDelivered(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                  />
                  <label htmlFor="creditExtra" className="text-xs cursor-pointer flex-1">
                    <span className="font-semibold text-text block">
                      Credit over-delivered work ({totalExtra} extra delivered)
                    </span>
                    <span className="text-text-muted text-[11px]">
                      {typeSummaries
                        .filter((t) => t.extra > 0)
                        .map((t) => `${t.extra} extra ${t.label}`)
                        .join(', ')}{' '}
                      will be credited as already done towards Cycle {nextCycleNum}.
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Two Clear Choices: Same Plan vs Change Plan */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-text uppercase tracking-wider block">
              Choose Renewal Option
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('same_plan')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  mode === 'same_plan'
                    ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary'
                    : 'border-border bg-surface hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-text">Same Plan</span>
                  {mode === 'same_plan' && (
                    <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  Keep {formatINR(cycle.feeAmount)} retainer and identical deliverables.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('change_plan')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  mode === 'change_plan'
                    ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary'
                    : 'border-border bg-surface hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-text">Change Plan</span>
                  {mode === 'change_plan' && (
                    <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  Adjust monthly fee and deliverable targets for the new cycle.
                </p>
              </button>
            </div>
          </div>

          {/* Same plan summary preview */}
          {mode === 'same_plan' && (
            <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Fee for Cycle {nextCycleNum}:</span>
                <span className="font-bold text-text text-sm">
                  {formatINR(cycle.feeAmount)}
                </span>
              </div>
              <div className="pt-2 border-t border-border flex flex-wrap gap-2">
                {typeSummaries
                  .filter((t) => t.promised > 0)
                  .map((t) => (
                    <Badge key={t.key} variant="slate" className="text-xs py-1 px-2.5">
                      {t.label}: {cycle.package[t.key]}
                      {carryForwardRemaining && t.remaining > 0 && (
                        <span className="text-brand-primary ml-1 font-semibold">
                          +{t.remaining} carried
                        </span>
                      )}
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {/* Change plan blank inputs with previous plan read-only reference beside */}
          {mode === 'change_plan' && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Previous plan reference (READ-ONLY) */}
                <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2.5">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                    Previous Plan (Reference)
                  </span>
                  <div className="text-xs text-text-muted flex justify-between">
                    <span>Previous Fee:</span>
                    <span className="font-semibold text-text">
                      {formatINR(cycle.feeAmount)}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1 text-xs">
                    {typeSummaries.map((t) => (
                      <div key={t.key} className="flex justify-between text-text-muted">
                        <span>{t.label}:</span>
                        <span className="font-medium text-text">
                          {cycle.package[t.key] ? `${cycle.package[t.key]} / mo` : 'None'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* New Plan Input Form (STARTS BLANK) */}
                <div className="space-y-3">
                  <FormField
                    label="New Monthly Fee (INR)"
                    required
                    error={errors.fee}
                  >
                    <MoneyInput
                      value={newFee === '' ? null : newFee}
                      onChange={setNewFee}
                      placeholder="e.g. 50,000"
                      autoComplete="off"
                    />
                  </FormField>
                </div>
              </div>

              {/* Deliverables configuration (starts unselected) */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-text block">
                  Select Deliverable Types & Targets <span className="text-semantic-danger">*</span>
                </label>
                {errors.package && (
                  <p className="text-xs text-semantic-danger font-medium">{errors.package}</p>
                )}

                <div className="space-y-2.5">
                  {/* Videos */}
                  <div className="p-3 rounded-lg border border-border bg-surface flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text">
                      <input
                        type="checkbox"
                        checked={activeTypes.videos}
                        onChange={(e) =>
                          setActiveTypes((prev) => ({ ...prev, videos: e.target.checked }))
                        }
                        className="rounded border-border text-brand-primary"
                      />
                      <Film className="w-4 h-4 text-brand-primary" />
                      Videos
                    </label>
                    {activeTypes.videos && (
                      <input
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        value={quantities.videos}
                        onChange={(e) =>
                          setQuantities((prev) => ({
                            ...prev,
                            videos: e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)),
                          }))
                        }
                        className="w-24 px-2.5 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:border-brand-primary"
                        autoComplete="off"
                      />
                    )}
                  </div>

                  {/* Posts */}
                  <div className="p-3 rounded-lg border border-border bg-surface flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text">
                      <input
                        type="checkbox"
                        checked={activeTypes.posts}
                        onChange={(e) =>
                          setActiveTypes((prev) => ({ ...prev, posts: e.target.checked }))
                        }
                        className="rounded border-border text-brand-primary"
                      />
                      <FileText className="w-4 h-4 text-brand-primary" />
                      Posts
                    </label>
                    {activeTypes.posts && (
                      <input
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        value={quantities.posts}
                        onChange={(e) =>
                          setQuantities((prev) => ({
                            ...prev,
                            posts: e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)),
                          }))
                        }
                        className="w-24 px-2.5 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:border-brand-primary"
                        autoComplete="off"
                      />
                    )}
                  </div>

                  {/* Reels */}
                  <div className="p-3 rounded-lg border border-border bg-surface flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text">
                      <input
                        type="checkbox"
                        checked={activeTypes.reels}
                        onChange={(e) =>
                          setActiveTypes((prev) => ({ ...prev, reels: e.target.checked }))
                        }
                        className="rounded border-border text-brand-primary"
                      />
                      <Video className="w-4 h-4 text-brand-primary" />
                      Reels
                    </label>
                    {activeTypes.reels && (
                      <input
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        value={quantities.reels}
                        onChange={(e) =>
                          setQuantities((prev) => ({
                            ...prev,
                            reels: e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)),
                          }))
                        }
                        className="w-24 px-2.5 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:border-brand-primary"
                        autoComplete="off"
                      />
                    )}
                  </div>

                  {/* Stories */}
                  <div className="p-3 rounded-lg border border-border bg-surface flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text">
                      <input
                        type="checkbox"
                        checked={activeTypes.stories}
                        onChange={(e) =>
                          setActiveTypes((prev) => ({ ...prev, stories: e.target.checked }))
                        }
                        className="rounded border-border text-brand-primary"
                      />
                      <Camera className="w-4 h-4 text-brand-primary" />
                      Stories
                    </label>
                    {activeTypes.stories && (
                      <input
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        value={quantities.stories}
                        onChange={(e) =>
                          setQuantities((prev) => ({
                            ...prev,
                            stories: e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)),
                          }))
                        }
                        className="w-24 px-2.5 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:border-brand-primary"
                        autoComplete="off"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={renewMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => renewMutation.mutate()}
            isLoading={renewMutation.isPending}
          >
            {mode === 'same_plan'
              ? `Renew with Same Plan (${formatINR(cycle.feeAmount)})`
              : 'Renew with New Plan'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
