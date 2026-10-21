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
import { FormField } from '@/components/forms/FormField';
import { useToast } from '@/components/feedback/Toast';
import { useRescheduleFollowUp } from '../hooks/useCalls';
import { CallLog } from '@/types';
import { CalendarClock } from 'lucide-react';

export interface RescheduleFollowUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callLog: CallLog | null;
  leadName?: string;
}

export const RescheduleFollowUpModal: React.FC<RescheduleFollowUpModalProps> = ({
  open,
  onOpenChange,
  callLog,
  leadName,
}) => {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newNote, setNewNote] = useState('');
  const [error, setError] = useState('');

  const rescheduleMutation = useRescheduleFollowUp();
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setNewDate('');
      setNewTime('');
      setNewNote('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      setError('Please select a new follow-up date');
      return;
    }
    if (!callLog) return;

    try {
      await rescheduleMutation.mutateAsync({
        callLogId: callLog.id,
        newDate,
        newTime: newTime || undefined,
        newNote: newNote.trim() || undefined,
      });
      toast.success('Follow-up Rescheduled', `Follow-up updated for ${leadName || 'prospect'}.`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Reschedule Failed', err.message || 'Could not update follow-up date.');
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="sm" variant="center">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2 text-base font-bold">
            <CalendarClock className="w-5 h-5 text-primary-600" />
            Reschedule Follow-up
          </ModalTitle>
          <ModalDescription className="text-xs text-text-muted">
            Select a new callback date for {leadName ? <strong>{leadName}</strong> : 'this prospect'}.
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 pt-3">
          <FormField label="New Follow-up Date" required error={error}>
            <Input
              type="date"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                setError('');
              }}
              autoComplete="off"
            />
          </FormField>

          <FormField label="New Callback Time (Optional)">
            <Input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              autoComplete="off"
            />
          </FormField>

          <FormField label="Updated Follow-up Note">
            <Input
              placeholder="e.g. Client traveling this week, call next Monday morning"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              autoComplete="off"
            />
          </FormField>

          <ModalFooter className="px-0 pt-2 pb-0 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={rescheduleMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={rescheduleMutation.isPending}>
              {rescheduleMutation.isPending ? 'Updating...' : 'Save New Date'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
