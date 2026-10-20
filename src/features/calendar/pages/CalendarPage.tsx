import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useToast } from '@/components/feedback/Toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarService, clientService } from '@/services';
import { CalendarItem, CalendarItemType } from '@/types';
import { formatDate } from '@/lib/format';
import { AddCalendarItemModal } from '../components/AddCalendarItemModal';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  FileText,
  Clock,
  MapPin,
  ExternalLink,
  Edit2,
  Trash2,
  LayoutGrid,
  Columns,
  List,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
} from 'date-fns';

type CalendarViewMode = 'month' | 'week' | 'agenda';

export const CalendarPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 20)); // Oct 20, 2026
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [modalType, setModalType] = useState<CalendarItemType>('meeting');
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);

  // Delete State
  const [itemToDelete, setItemToDelete] = useState<CalendarItem | null>(null);

  // Queries
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', 'list'],
    queryFn: () => clientService.getClients(),
  });

  const { data: items = [], isLoading } = useQuery<CalendarItem[]>({
    queryKey: ['calendar', 'list'],
    queryFn: () => calendarService.getItems(),
  });

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    return clients.find((c) => c.id === clientId)?.business || 'Client';
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => calendarService.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Event Deleted', 'Calendar entry was permanently removed.');
      setItemToDelete(null);
    },
    onError: (err: Error) => {
      toast.error('Failed to delete', err.message);
    },
  });

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedClientId !== 'all' && item.clientId !== selectedClientId) return false;
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      return true;
    });
  }, [items, selectedClientId, selectedType]);

  // Date navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate((d) => subMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, -7));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate((d) => addMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 7));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month grid calculation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Week days calculation
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Open modal handlers
  const handleOpenAddForDate = (dateStr: string, type: CalendarItemType = 'meeting') => {
    setModalDate(dateStr);
    setModalType(type);
    setEditingItem(null);
    setIsAddModalOpen(true);
  };

  const handleEditItem = (item: CalendarItem) => {
    setEditingItem(item);
    setModalDate(item.date);
    setModalType(item.type);
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Agency Calendar & Meetings"
        subtitle="Manage strategy calls, client shoots, team meetings, and production notes."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenAddForDate(format(currentDate, 'yyyy-MM-dd'))}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Schedule Event
          </Button>
        }
      />

      {/* Slim Toolbar: Navigation, Filters, and View Switcher */}
      <div className="p-3.5 rounded-card bg-surface border border-border shadow-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Navigation & Title */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={handlePrev}
              className="p-1 rounded text-text-muted hover:text-text hover:bg-white transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2 py-0.5 text-xs font-semibold text-text hover:bg-white rounded transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1 rounded text-text-muted hover:text-text hover:bg-white transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm font-bold text-text ml-2">
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
            {viewMode === 'week' &&
              `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'MMM d, yyyy')}`}
            {viewMode === 'agenda' && 'Upcoming Agenda'}
          </span>
        </div>

        {/* Filters & View Modes */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Client filter */}
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="text-xs rounded-button border border-border bg-surface px-2.5 py-1.5 text-text focus:outline-none focus:ring-1 focus:ring-primary-600 h-8"
          >
            <option value="all">All Clients ({clients.length})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business}
              </option>
            ))}
          </select>

          {/* Type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs rounded-button border border-border bg-surface px-2.5 py-1.5 text-text focus:outline-none focus:ring-1 focus:ring-primary-600 h-8"
          >
            <option value="all">All Types</option>
            <option value="meeting">Meetings</option>
            <option value="note">Notes</option>
          </select>

          {/* View Mode Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg ml-auto md:ml-0">
            <button
              onClick={() => setViewMode('month')}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'month'
                  ? 'bg-white text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
              title="Month View"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
              title="Week View"
            >
              <Columns className="w-3.5 h-3.5" /> Week
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'agenda'
                  ? 'bg-white text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
              title="Agenda View"
            >
              <List className="w-3.5 h-3.5" /> Agenda
            </button>
          </div>
        </div>
      </div>

      {/* View Content */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-text-muted">Loading agency calendar...</div>
      ) : viewMode === 'month' ? (
        /* Month Grid */
        <Card className="border-border overflow-hidden shadow-card">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-border bg-slate-50 text-center text-[11px] font-bold text-text-muted py-2">
            <span>SUN</span>
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border border-b border-border">
            {monthDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayItems = filteredItems.filter((i) => i.date === dayStr);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDate = isSameDay(day, new Date());

              return (
                <div
                  key={dayStr}
                  onClick={() => handleOpenAddForDate(dayStr)}
                  className={`min-h-[110px] p-2 transition-colors cursor-pointer group flex flex-col justify-between ${
                    isCurrentMonth ? 'bg-surface hover:bg-slate-50/80' : 'bg-slate-50/40 text-text-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isTodayDate
                          ? 'bg-primary-600 text-white shadow-sm'
                          : isCurrentMonth
                          ? 'text-text'
                          : 'text-text-subtle'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>

                    {dayItems.length > 0 && (
                      <span className="text-[10px] font-bold text-primary-700 bg-primary-50 border border-primary-200 px-1.5 rounded-full">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  {/* Events list */}
                  <div className="space-y-1 flex-1">
                    {dayItems.slice(0, 3).map((item) => {
                      const isMeeting = item.type === 'meeting';
                      return (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditItem(item);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate flex items-center gap-1 border transition-all hover:scale-[1.02] ${
                            isMeeting
                              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                          title={`${item.title} (${isMeeting ? item.startTime : 'Note'})`}
                        >
                          {isMeeting ? (
                            <Video className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                          ) : (
                            <FileText className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                          )}
                          <span className="truncate">{item.title}</span>
                        </div>
                      );
                    })}

                    {dayItems.length > 3 && (
                      <span className="text-[9px] text-text-muted block pl-1">
                        +{dayItems.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : viewMode === 'week' ? (
        /* Week Grid */
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayItems = filteredItems.filter((i) => i.date === dayStr);
            const isTodayDate = isSameDay(day, new Date());

            return (
              <Card
                key={dayStr}
                className={`p-3 border-border flex flex-col justify-between min-h-[350px] shadow-card ${
                  isTodayDate ? 'ring-2 ring-primary-500/20 border-primary-500' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-border mb-2.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-text-muted block">
                        {format(day, 'EEE')}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          isTodayDate ? 'text-primary-600' : 'text-text'
                        }`}
                      >
                        {format(day, 'MMM d')}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenAddForDate(dayStr)}
                      className="p-1 rounded text-text-subtle hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      title="Add event"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day Events */}
                  <div className="space-y-2">
                    {dayItems.length === 0 ? (
                      <p className="text-[11px] text-text-subtle py-4 text-center">No events</p>
                    ) : (
                      dayItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleEditItem(item)}
                          className={`p-2 rounded border text-xs cursor-pointer hover:shadow-sm transition-all ${
                            item.type === 'meeting'
                              ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                              : 'bg-amber-50/70 border-amber-200 text-amber-900'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-bold text-[11px] mb-0.5">
                            {item.type === 'meeting' ? (
                              <Video className="w-3 h-3 text-blue-600" />
                            ) : (
                              <FileText className="w-3 h-3 text-amber-600" />
                            )}
                            <span className="truncate">{item.title}</span>
                          </div>
                          {item.type === 'meeting' && item.startTime && (
                            <span className="text-[10px] text-text-muted block">
                              {item.startTime} – {item.endTime || 'End'}
                            </span>
                          )}
                          {item.clientId && (
                            <span className="text-[10px] font-medium text-text-subtle block truncate mt-0.5">
                              {getClientName(item.clientId)}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenAddForDate(dayStr)}
                  className="w-full text-[11px] mt-2 text-text-muted"
                >
                  + Add Event
                </Button>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Agenda View */
        <Card className="border-border shadow-card divide-y divide-border">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-xs text-text-muted">
              <CalendarIcon className="w-10 h-10 text-text-subtle mx-auto mb-2" />
              <p className="font-semibold text-text">No scheduled events or notes found</p>
              <p className="text-[11px] text-text-subtle mt-1 mb-4">
                Schedule your next client strategy call or team meeting.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenAddForDate(format(new Date(), 'yyyy-MM-dd'))}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Schedule First Event
              </Button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const clientName = getClientName(item.clientId);
              const isMeeting = item.type === 'meeting';

              return (
                <div
                  key={item.id}
                  className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                        isMeeting ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}
                    >
                      {isMeeting ? <Video className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-text truncate">{item.title}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isMeeting
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.type}
                        </span>
                        {clientName && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-text-muted">
                            {clientName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
                        <span className="tabular-nums font-medium text-text">
                          {formatDate(item.date)}
                        </span>
                        {isMeeting && item.startTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-text-subtle" />
                            {item.startTime} – {item.endTime}
                          </span>
                        )}
                        {item.location && (
                          <span className="flex items-center gap-1 truncate max-w-xs">
                            <MapPin className="w-3.5 h-3.5 text-text-subtle shrink-0" />
                            {item.location.startsWith('http') ? (
                              <a
                                href={item.location}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary-600 hover:underline flex items-center gap-0.5"
                              >
                                Join link <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              item.location
                            )}
                          </span>
                        )}
                      </div>

                      {item.type === 'note' && item.text && (
                        <p className="text-xs text-text-muted mt-2 bg-slate-50 p-2 rounded border border-border">
                          {item.text}
                        </p>
                      )}
                      {item.type === 'meeting' && item.notes && (
                        <p className="text-xs text-text-muted mt-2 bg-slate-50 p-2 rounded border border-border">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="p-1.5 rounded text-text-subtle hover:text-text hover:bg-slate-100 transition-colors"
                      title="Edit event"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-1.5 rounded text-text-subtle hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      )}

      {/* Add / Edit Modal */}
      <AddCalendarItemModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        defaultDate={modalDate}
        defaultType={modalType}
        editingItem={editingItem}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        title="Delete Calendar Entry"
        description={`Are you sure you want to delete "${itemToDelete?.title}"? This event will be permanently removed.`}
        confirmText="Delete Entry"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (itemToDelete) deleteMutation.mutate(itemToDelete.id);
        }}
        onClose={() => setItemToDelete(null)}
      />
    </div>
  );
};
