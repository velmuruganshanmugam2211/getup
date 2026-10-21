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
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { useToast } from '@/components/feedback/Toast';
import { useQuery } from '@tanstack/react-query';
import { teamService } from '@/services';
import { useLeads, useCreateCallLog, useCreateLead, useUpdateCallLog } from '../hooks/useCalls';
import { CallLog, CallOutcome, MeetingReminder } from '@/types';
import { PhoneCall, Calendar as CalendarIcon, Building, Bell } from 'lucide-react';

export interface LogCallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledLeadId?: string;
  editingCallLog?: CallLog | null;
  onSuccess?: () => void;
}

const OUTCOME_OPTIONS: { value: CallOutcome; label: string }[] = [
  { value: 'Not answered', label: 'Not answered' },
  { value: 'Busy', label: 'Busy' },
  { value: 'Callback requested', label: 'Callback requested' },
  { value: 'Interested', label: 'Interested' },
  { value: 'Meeting fixed', label: 'Meeting fixed' },
  { value: 'Not interested', label: 'Not interested' },
  { value: 'Wrong number', label: 'Wrong number' },
];

const REMINDER_OPTIONS: { value: MeetingReminder; label: string }[] = [
  { value: '2_days', label: '2 days before' },
  { value: '1_day', label: '1 day before' },
  { value: '1_hour', label: '1 hour before' },
  { value: '30_min', label: '30 min before' },
  { value: '10_min', label: '10 min before' },
];

export const LogCallModal: React.FC<LogCallModalProps> = ({
  open,
  onOpenChange,
  prefilledLeadId,
  editingCallLog,
  onSuccess,
}) => {
  const { data: leads = [] } = useLeads();
  const { data: teamUsers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getUsers(),
  });

  const createLeadMutation = useCreateLead();
  const createCallLogMutation = useCreateCallLog();
  const updateCallLogMutation = useUpdateCallLog();
  const toast = useToast();

  // Mode: existing lead vs new lead
  const [isNewLead, setIsNewLead] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');

  // Inline new lead fields
  const [leadBusinessName, setLeadBusinessName] = useState('');
  const [leadContactPerson, setLeadContactPerson] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadSource, setLeadSource] = useState('');

  // Call fields - open EMPTY by default
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [calledBy, setCalledBy] = useState('');
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [notes, setNotes] = useState('');

  // Follow-up toggle and fields
  const [hasFollowUp, setHasFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');

  // Meeting toggle and fields
  const [hasMeeting, setHasMeeting] = useState(false);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [selectedReminders, setSelectedReminders] = useState<MeetingReminder[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (!open) return;

    if (editingCallLog) {
      setIsNewLead(false);
      setSelectedLeadId(editingCallLog.leadId || '');
      setDate(editingCallLog.date || '');
      setTime(editingCallLog.time || '');
      setCalledBy(editingCallLog.calledBy || '');
      setOutcome(editingCallLog.outcome || '');
      setNotes(editingCallLog.notes || '');

      setHasFollowUp(!!editingCallLog.followUpDate);
      setFollowUpDate(editingCallLog.followUpDate || '');
      setFollowUpTime(editingCallLog.followUpTime || '');
      setFollowUpNote(editingCallLog.followUpNote || '');

      const isMeeting = editingCallLog.outcome === 'Meeting fixed' || !!editingCallLog.meetingId;
      setHasMeeting(isMeeting);
      setMeetingDate(editingCallLog.meetingDate || '');
      setMeetingTime(editingCallLog.meetingTime || '');
      setMeetingLocation(editingCallLog.meetingLocation || '');
      setSelectedReminders(editingCallLog.reminders || []);
    } else {
      // Empty form
      setIsNewLead(false);
      setSelectedLeadId(prefilledLeadId || '');
      setLeadBusinessName('');
      setLeadContactPerson('');
      setLeadPhone('');
      setLeadEmail('');
      setLeadSource('');

      setDate('');
      setTime('');
      setCalledBy('');
      setOutcome('');
      setNotes('');

      setHasFollowUp(false);
      setFollowUpDate('');
      setFollowUpTime('');
      setFollowUpNote('');

      setHasMeeting(false);
      setMeetingDate('');
      setMeetingTime('');
      setMeetingLocation('');
      setSelectedReminders([]);
    }
    setErrors({});
  }, [open, prefilledLeadId, editingCallLog]);

  // When outcome changes to "Meeting fixed", auto open meeting section
  const handleOutcomeChange = (val: CallOutcome | '') => {
    setOutcome(val);
    if (val === 'Meeting fixed') {
      setHasMeeting(true);
    }
  };

  const toggleReminder = (rem: MeetingReminder) => {
    setSelectedReminders((prev) =>
      prev.includes(rem) ? prev.filter((r) => r !== rem) : [...prev, rem]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};

    let leadIdToUse = selectedLeadId;

    if (isNewLead) {
      if (!leadBusinessName.trim()) err['leadBusinessName'] = 'Business / Brand name is required';
      if (!leadContactPerson.trim()) err['leadContactPerson'] = 'Contact person name is required';
      if (!leadPhone.trim()) err['leadPhone'] = 'Phone number is required';
    } else {
      if (!leadIdToUse) err['selectedLeadId'] = 'Please select a prospect lead';
    }

    if (!date) err['date'] = 'Call date is required';
    if (!time) err['time'] = 'Call time is required';
    if (!calledBy.trim()) err['calledBy'] = 'Please select caller name';
    if (!outcome) err['outcome'] = 'Call outcome is required';

    if (hasFollowUp) {
      if (!followUpDate) err['followUpDate'] = 'Follow-up date is required';
    }

    if (hasMeeting || outcome === 'Meeting fixed') {
      if (!meetingDate) err['meetingDate'] = 'Meeting date is required';
      if (!meetingTime) err['meetingTime'] = 'Meeting time is required';
    }

    if (Object.keys(err).length > 0) {
      setErrors(err);
      toast.error('Validation Error', 'Please complete all required fields.');
      return;
    }

    try {
      if (isNewLead) {
        const createdLead = await createLeadMutation.mutateAsync({
          businessName: leadBusinessName.trim(),
          contactPerson: leadContactPerson.trim(),
          phone: leadPhone.trim(),
          email: leadEmail.trim() || undefined,
          source: leadSource.trim() || undefined,
        });
        leadIdToUse = createdLead.id;
      }

      const payload = {
        leadId: leadIdToUse,
        date,
        time,
        calledBy: calledBy.trim(),
        outcome: outcome as CallOutcome,
        notes: notes.trim(),
        followUpDate: hasFollowUp && followUpDate ? followUpDate : undefined,
        followUpTime: hasFollowUp && followUpTime ? followUpTime : undefined,
        followUpNote: hasFollowUp && followUpNote ? followUpNote.trim() : undefined,
        meetingDate: (hasMeeting || outcome === 'Meeting fixed') && meetingDate ? meetingDate : undefined,
        meetingTime: (hasMeeting || outcome === 'Meeting fixed') && meetingTime ? meetingTime : undefined,
        meetingLocation: (hasMeeting || outcome === 'Meeting fixed') && meetingLocation ? meetingLocation.trim() : undefined,
        reminders: (hasMeeting || outcome === 'Meeting fixed') ? selectedReminders : undefined,
      };

      if (editingCallLog) {
        await updateCallLogMutation.mutateAsync({
          id: editingCallLog.id,
          data: payload,
        });
        toast.success('Call Updated', 'Call log details updated successfully.');
      } else {
        await createCallLogMutation.mutateAsync(payload);
        toast.success('Call Logged', 'Call record and outcomes successfully logged.');
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error('Failed to save call', error?.message || 'An error occurred.');
    }
  };

  const isSubmitting =
    createLeadMutation.isPending || createCallLogMutation.isPending || updateCallLogMutation.isPending;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg" variant="center" className="max-h-[90vh] flex flex-col p-0">
        <ModalHeader className="px-6 py-4 border-b border-border">
          <ModalTitle className="flex items-center gap-2 text-base font-bold text-text">
            <PhoneCall className="w-5 h-5 text-primary-600" />
            {editingCallLog ? 'Edit Call Log' : 'Log Prospect Call & Follow-up'}
          </ModalTitle>
          <ModalDescription className="text-xs text-text-muted">
            Record conversation outcome, schedule client follow-up reminder, or fix upcoming calendar meeting.
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} autoComplete="off" className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Section 1: Lead Identification */}
          <div className="p-3.5 rounded-card bg-surface-subtle border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text flex items-center gap-1.5 uppercase tracking-wider">
                <Building className="w-3.5 h-3.5 text-primary-600" /> Prospect / Client Lead
              </span>
              {!editingCallLog && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewLead(false)}
                    className={`px-2.5 py-1 text-xs rounded-control transition-all ${
                      !isNewLead
                        ? 'bg-primary-600 text-white font-medium shadow-sm'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    Existing Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewLead(true)}
                    className={`px-2.5 py-1 text-xs rounded-control transition-all ${
                      isNewLead
                        ? 'bg-primary-600 text-white font-medium shadow-sm'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    + New Lead
                  </button>
                </div>
              )}
            </div>

            {!isNewLead ? (
              <FormField label="Select Prospect Lead" required error={errors.selectedLeadId}>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  disabled={!!editingCallLog}
                  className="w-full text-xs rounded-control border border-border bg-surface px-3 py-2 text-text font-medium"
                >
                  <option value="">Choose a prospect lead...</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.businessName} — {l.contactPerson} ({l.phone})
                    </option>
                  ))}
                </select>
              </FormField>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <FormField label="Business / Brand Name" required error={errors.leadBusinessName}>
                  <Input
                    placeholder="e.g. Zen Fitness Studio"
                    value={leadBusinessName}
                    onChange={(e) => setLeadBusinessName(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>
                <FormField label="Contact Person" required error={errors.leadContactPerson}>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={leadContactPerson}
                    onChange={(e) => setLeadContactPerson(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>
                <FormField label="Phone Number" required error={errors.leadPhone}>
                  <Input
                    placeholder="e.g. +91 98765 43210"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>
                <FormField label="Email Address">
                  <Input
                    type="email"
                    placeholder="e.g. rahul@zenfitness.com"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Lead Source">
                    <Input
                      placeholder="e.g. Instagram Ad, Referral, Inbound DM, Cold Outreach"
                      value={leadSource}
                      onChange={(e) => setLeadSource(e.target.value)}
                      autoComplete="off"
                    />
                  </FormField>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Call Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Call Date" required error={errors.date}>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                autoComplete="off"
              />
            </FormField>

            <FormField label="Call Time" required error={errors.time}>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                autoComplete="off"
              />
            </FormField>

            <FormField label="Called By (Caller)" required error={errors.calledBy}>
              <select
                value={calledBy}
                onChange={(e) => setCalledBy(e.target.value)}
                className="w-full text-xs rounded-control border border-border bg-surface px-3 py-2 text-text font-medium"
              >
                <option value="">Select team member...</option>
                {teamUsers.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role === 'super_admin' ? 'Admin' : 'Worker'})
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Call Outcome" required error={errors.outcome}>
            <select
              value={outcome}
              onChange={(e) => handleOutcomeChange(e.target.value as CallOutcome)}
              className="w-full text-xs rounded-control border border-border bg-surface px-3 py-2 text-text font-medium"
            >
              <option value="">Select call outcome...</option>
              {OUTCOME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Call Notes & Discussion Summary">
            <Textarea
              placeholder="Key points discussed, client pain points, package interest, budget, next steps..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoComplete="off"
            />
          </FormField>

          {/* Section 3: Follow-up Toggle and Details */}
          <div className="p-3.5 rounded-card border border-border bg-surface space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-text block">Follow-up needed?</span>
                <span className="text-[11px] text-text-muted">Schedule a callback or check-in alert</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={hasFollowUp}
                  onChange={(e) => setHasFollowUp(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
              </label>
            </div>

            {hasFollowUp && (
              <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Follow-up Date" required error={errors.followUpDate}>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>
                <FormField label="Follow-up Time">
                  <Input
                    type="time"
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Follow-up Objective / Note">
                    <Input
                      placeholder="e.g. Share proposal deck and confirm decision maker call"
                      value={followUpNote}
                      onChange={(e) => setFollowUpNote(e.target.value)}
                      autoComplete="off"
                    />
                  </FormField>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Meeting Fixed Toggle and Details */}
          <div className="p-3.5 rounded-card border border-border bg-surface space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-text block flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-primary-600" /> Meeting fixed?
                </span>
                <span className="text-[11px] text-text-muted">
                  Adds directly to agency Calendar, Dashboard, and triggers multi-channel reminders
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={hasMeeting || outcome === 'Meeting fixed'}
                  onChange={(e) => setHasMeeting(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
              </label>
            </div>

            {(hasMeeting || outcome === 'Meeting fixed') && (
              <div className="pt-2 border-t border-border space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Meeting Date" required error={errors.meetingDate}>
                    <Input
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      autoComplete="off"
                    />
                  </FormField>
                  <FormField label="Meeting Time" required error={errors.meetingTime}>
                    <Input
                      type="time"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                      autoComplete="off"
                    />
                  </FormField>
                </div>

                <FormField label="Meeting Location / Video Call Link">
                  <Input
                    placeholder="e.g. Google Meet: meet.google.com/abc-xyz or Studio Conference Room"
                    value={meetingLocation}
                    onChange={(e) => setMeetingLocation(e.target.value)}
                    autoComplete="off"
                  />
                </FormField>

                <div>
                  <label className="text-xs font-semibold text-text flex items-center gap-1 mb-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-500" /> Multi-Select Meeting Reminder Alerts
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {REMINDER_OPTIONS.map((opt) => {
                      const isSelected = selectedReminders.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleReminder(opt.value)}
                          className={`px-2.5 py-1 text-xs rounded-control border transition-all ${
                            isSelected
                              ? 'bg-primary-600 text-white border-primary-600 font-semibold shadow-sm'
                              : 'bg-surface text-text-muted border-border hover:border-text-muted'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-text-muted mt-1 block">
                    Choose one or more alert offsets (e.g. 2 days before + 1 day before + 10 min before).
                  </span>
                </div>
              </div>
            )}
          </div>

          <ModalFooter className="px-0 pt-2 pb-0 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingCallLog ? 'Update Call Log' : 'Save Call Log'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
