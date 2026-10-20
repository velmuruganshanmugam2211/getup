import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService, calendarService, teamService } from '@/services';
import { useToast } from '@/components/feedback/Toast';
import { CalendarItem, CalendarItemType, MeetingReminder } from '@/types';
import { Calendar, Video, FileText, Clock, MapPin, Users, Bell, AlertCircle } from 'lucide-react';

export interface AddCalendarItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultClientId?: string;
  defaultType?: CalendarItemType;
  editingItem?: CalendarItem | null;
}

export const AddCalendarItemModal: React.FC<AddCalendarItemModalProps> = ({
  isOpen,
  onClose,
  defaultDate,
  defaultClientId,
  defaultType,
  editingItem,
}) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [type, setType] = useState<CalendarItemType | ''>('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [reminder, setReminder] = useState<MeetingReminder | ''>('');
  const [notes, setNotes] = useState('');
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', 'list'],
    queryFn: () => clientService.getClients(),
  });

  const { data: team = [] } = useQuery({
    queryKey: ['team', 'list'],
    queryFn: () => teamService.getUsers(),
  });

  // Reset form cleanly on open/close or edit switch
  useEffect(() => {
    if (!isOpen) {
      setType('');
      setTitle('');
      setDate('');
      setClientId('');
      setStartTime('');
      setEndTime('');
      setLocation('');
      setAttendeeIds([]);
      setReminder('');
      setNotes('');
      setText('');
      setErrors({});
      return;
    }

    if (editingItem) {
      setType(editingItem.type);
      setTitle(editingItem.title);
      setDate(editingItem.date);
      setClientId(editingItem.clientId || '');
      setStartTime(editingItem.startTime || '');
      setEndTime(editingItem.endTime || '');
      setLocation(editingItem.location || '');
      setAttendeeIds(editingItem.attendees || []);
      setReminder(editingItem.reminder || '');
      setNotes(editingItem.notes || '');
      setText(editingItem.text || '');
      setErrors({});
    } else {
      // Clean blank slate: no silent defaults
      setType(defaultType || '');
      setTitle('');
      setDate(defaultDate || '');
      setClientId(defaultClientId || '');
      setStartTime('');
      setEndTime('');
      setLocation('');
      setAttendeeIds([]);
      setReminder('');
      setNotes('');
      setText('');
      setErrors({});
    }
  }, [editingItem, defaultDate, defaultClientId, defaultType, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const newErrors: Record<string, string> = {};

      if (!type) newErrors.type = 'Please select an event type (Meeting or Note).';
      if (!title.trim()) newErrors.title = 'Title / Subject is required.';
      if (!date) newErrors.date = 'Date is required.';

      if (type === 'meeting') {
        if (!startTime) newErrors.startTime = 'Start time is required for a meeting.';
        if (!endTime) newErrors.endTime = 'End time is required for a meeting.';
      } else if (type === 'note') {
        if (!text.trim()) newErrors.text = 'Note content cannot be blank.';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        throw new Error('Please fill in all required fields.');
      }

      if (editingItem) {
        return calendarService.updateItem(editingItem.id, {
          type: type as CalendarItemType,
          title: title.trim(),
          date,
          clientId: clientId || undefined,
          startTime: type === 'meeting' ? startTime : undefined,
          endTime: type === 'meeting' ? endTime : undefined,
          location: type === 'meeting' ? location.trim() || undefined : undefined,
          attendees: type === 'meeting' ? attendeeIds : undefined,
          reminder: type === 'meeting' && reminder ? (reminder as MeetingReminder) : undefined,
          notes: type === 'meeting' ? notes.trim() || undefined : undefined,
          text: type === 'note' ? text.trim() || undefined : undefined,
        });
      } else {
        return calendarService.createItem({
          type: type as CalendarItemType,
          title: title.trim(),
          date,
          clientId: clientId || undefined,
          startTime: type === 'meeting' ? startTime : undefined,
          endTime: type === 'meeting' ? endTime : undefined,
          location: type === 'meeting' ? location.trim() || undefined : undefined,
          attendees: type === 'meeting' ? attendeeIds : undefined,
          reminder: type === 'meeting' && reminder ? (reminder as MeetingReminder) : undefined,
          notes: type === 'meeting' ? notes.trim() || undefined : undefined,
          text: type === 'note' ? text.trim() || undefined : undefined,
        });
      }
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(
        editingItem ? 'Event Updated' : 'Event Scheduled',
        `"${item.title}" saved to agency calendar.`
      );
      onClose();
    },
    onError: (err: Error) => {
      toast.error('Validation Error', err.message);
    },
  });

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            {editingItem ? 'Edit Calendar Item' : 'Add to Calendar'}
          </ModalTitle>
        </ModalHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          autoComplete="off"
          noValidate
          className="space-y-4 pt-4 flex-1 flex flex-col"
        >
          {/* Type Selector (Meeting vs Note) - starts unselected */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Item Type <span className="text-rose-500">*</span>
            </label>
            <div className="flex p-1 bg-slate-100 rounded-lg gap-1 border border-border">
              <button
                type="button"
                onClick={() => {
                  setType('meeting');
                  setErrors((prev) => ({ ...prev, type: '' }));
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  type === 'meeting'
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-blue-600" /> Meeting / Call
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('note');
                  setErrors((prev) => ({ ...prev, type: '' }));
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  type === 'note'
                    ? 'bg-white text-amber-700 shadow-sm border border-amber-200'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-600" /> Schedule Note / Memo
              </button>
            </div>
            {errors.type && (
              <p className="text-[11px] text-semantic-danger flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" /> {errors.type}
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              {type === 'meeting' ? 'Meeting Subject' : type === 'note' ? 'Note Title' : 'Title / Subject'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder={
                type === 'meeting'
                  ? 'e.g. Content Strategy Call with Balaji Catering'
                  : type === 'note'
                  ? 'e.g. Shoot Props Checklist & Camera Battery'
                  : 'Enter title...'
              }
              autoComplete="off"
              required
            />
            {errors.title && (
              <p className="text-[11px] text-semantic-danger flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" /> {errors.title}
              </p>
            )}
          </div>

          {/* Date & Client Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setErrors((prev) => ({ ...prev, date: '' }));
                }}
                required
              />
              {errors.date && (
                <p className="text-[11px] text-semantic-danger flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> {errors.date}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Client (Optional)
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full text-xs rounded-button border border-border bg-surface px-2.5 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary-600"
              >
                <option value="">General Agency (No client)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.business} ({c.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Meeting-Specific Fields */}
          {type === 'meeting' && (
            <>
              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-text-subtle" /> Start Time <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setErrors((prev) => ({ ...prev, startTime: '' }));
                    }}
                    required
                  />
                  {errors.startTime && (
                    <p className="text-[11px] text-semantic-danger flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3" /> {errors.startTime}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-text-subtle" /> End Time <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setErrors((prev) => ({ ...prev, endTime: '' }));
                    }}
                    required
                  />
                  {errors.endTime && (
                    <p className="text-[11px] text-semantic-danger flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3" /> {errors.endTime}
                    </p>
                  )}
                </div>
              </div>

              {/* Location or Video Link */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-text-subtle" /> Location or Meeting Link
                </label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. https://meet.google.com/xyz or Studio Room 2"
                  autoComplete="off"
                />
              </div>

              {/* Attendees & Reminder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-text-subtle" /> Attendees
                  </label>
                  <select
                    multiple
                    value={attendeeIds}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                      setAttendeeIds(selected);
                    }}
                    className="w-full text-xs rounded-button border border-border bg-surface p-2 text-text focus:outline-none focus:ring-1 focus:ring-primary-600 h-20"
                  >
                    {team.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-text-subtle block mt-0.5">
                    Hold Ctrl/Cmd to select multiple
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1 flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5 text-text-subtle" /> Reminder Notification
                  </label>
                  <select
                    value={reminder}
                    onChange={(e) => setReminder(e.target.value as MeetingReminder)}
                    className="w-full text-xs rounded-button border border-border bg-surface px-2.5 py-2 text-text focus:outline-none focus:ring-1 focus:ring-primary-600"
                  >
                    <option value="">Select reminder notification</option>
                    <option value="at_time">At time of meeting</option>
                    <option value="10_min">10 minutes before</option>
                    <option value="30_min">30 minutes before</option>
                    <option value="1_hour">1 hour before</option>
                    <option value="1_day">1 day before</option>
                  </select>
                </div>
              </div>

              {/* Agenda / Notes */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Agenda & Discussion Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Outline meeting points, preparation instructions..."
                  rows={2}
                  className="w-full text-xs rounded-button border border-border bg-surface p-2.5 text-text focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
              </div>
            </>
          )}

          {/* Note-Specific Fields */}
          {type === 'note' && (
            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Note Content <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setErrors((prev) => ({ ...prev, text: '' }));
                }}
                placeholder="Write memo, production reminders, shooting notes..."
                rows={4}
                className="w-full text-xs rounded-button border border-border bg-surface p-2.5 text-text focus:outline-none focus:ring-1 focus:ring-primary-600"
                required
              />
              {errors.text && (
                <p className="text-[11px] text-semantic-danger flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" /> {errors.text}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-auto">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={saveMutation.isPending}
            >
              {editingItem ? 'Save Changes' : type === 'meeting' ? 'Schedule Meeting' : type === 'note' ? 'Save Note' : 'Save'}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default AddCalendarItemModal;
