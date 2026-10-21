import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { useToast } from '@/components/feedback/Toast';
import { formatDate } from '@/lib/format';
import { computeCallStats } from '@/lib/selectors';
import { teamService } from '@/services';
import {
  useLeads,
  useCallLogs,
  useDeleteCallLog,
  useDeleteLead,
  useCompleteFollowUp,
  useUpdateCallLog,
  useConvertLead,
} from '../hooks/useCalls';
import { LogCallModal } from '../components/LogCallModal';
import { EditLeadModal } from '../components/EditLeadModal';
import { RescheduleFollowUpModal } from '../components/RescheduleFollowUpModal';
import { AddClientDrawer } from '@/features/clients/components/AddClientDrawer';
import { CallLog, Lead, LeadStage, CallOutcome, Client } from '@/types';
import {
  PhoneCall,
  Phone,
  PhoneOff,
  Calendar,
  Clock,
  CheckCircle2,
  CalendarCheck,
  Building,
  User,
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Edit,
  Trash2,
  CalendarClock,
  Sparkles,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, parseISO } from 'date-fns';

type DateFilterMode = 'today' | 'week' | 'month' | 'custom';
type CallsTab = 'today_calls' | 'follow_ups' | 'meetings' | 'leads';

export const CallsPage: React.FC = () => {
  const toast = useToast();

  // Date selection state
  const [dateMode, setDateMode] = useState<DateFilterMode>('today');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Active tab
  const [activeTab, setActiveTab] = useState<CallsTab>('today_calls');

  // Search & Filter popover state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterOutcome, setFilterOutcome] = useState<string>('');
  const [filterCaller, setFilterCaller] = useState<string>('');
  const [filterStage, setFilterStage] = useState<string>('');

  // Modals state
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [prefilledLeadId, setPrefilledLeadId] = useState<string | undefined>(undefined);
  const [editingCallLog, setEditingCallLog] = useState<CallLog | null>(null);

  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleCallLog, setRescheduleCallLog] = useState<CallLog | null>(null);

  // Convert to Client Drawer
  const [convertClientOpen, setConvertClientOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);

  // Delete Confirm Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'call' | 'lead';
    id: string;
    title: string;
  } | null>(null);

  // Queries
  const { data: leads = [] } = useLeads();
  const { data: callLogs = [] } = useCallLogs();
  const { data: teamUsers = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => teamService.getUsers(),
  });

  // Mutations
  const deleteCallMutation = useDeleteCallLog();
  const deleteLeadMutation = useDeleteLead();
  const completeFollowUpMutation = useCompleteFollowUp();
  const updateCallMutation = useUpdateCallLog();
  const convertLeadMutation = useConvertLead();

  // Compute selected date range
  const { rangeStart, rangeEnd, dateLabel } = useMemo(() => {
    if (dateMode === 'today') {
      const formatted = format(currentDate, 'yyyy-MM-dd');
      return {
        rangeStart: formatted,
        rangeEnd: formatted,
        dateLabel: formatDate(currentDate, 'dd MMM yyyy'),
      };
    }
    if (dateMode === 'week') {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 });
      const e = endOfWeek(currentDate, { weekStartsOn: 1 });
      return {
        rangeStart: format(s, 'yyyy-MM-dd'),
        rangeEnd: format(e, 'yyyy-MM-dd'),
        dateLabel: `${format(s, 'dd MMM')} – ${format(e, 'dd MMM yyyy')}`,
      };
    }
    if (dateMode === 'month') {
      const s = startOfMonth(currentDate);
      const e = endOfMonth(currentDate);
      return {
        rangeStart: format(s, 'yyyy-MM-dd'),
        rangeEnd: format(e, 'yyyy-MM-dd'),
        dateLabel: format(currentDate, 'MMMM yyyy'),
      };
    }
    // custom
    return {
      rangeStart: customStartDate || '1970-01-01',
      rangeEnd: customEndDate || '2099-12-31',
      dateLabel: customStartDate && customEndDate ? `${formatDate(customStartDate)} – ${formatDate(customEndDate)}` : 'Custom Range',
    };
  }, [dateMode, currentDate, customStartDate, customEndDate]);

  // Navigate date
  const handlePrevDate = () => {
    if (dateMode === 'today') setCurrentDate((prev) => subDays(prev, 1));
    else if (dateMode === 'week') setCurrentDate((prev) => subDays(prev, 7));
    else if (dateMode === 'month') {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const handleNextDate = () => {
    if (dateMode === 'today') setCurrentDate((prev) => addDays(prev, 1));
    else if (dateMode === 'week') setCurrentDate((prev) => addDays(prev, 7));
    else if (dateMode === 'month') {
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  // Compute statistics using pure selectors
  const stats = useMemo(() => {
    return computeCallStats(callLogs, leads, { start: rangeStart, end: rangeEnd });
  }, [callLogs, leads, rangeStart, rangeEnd]);

  // Lead map for quick lookup
  const leadMap = useMemo(() => {
    const map = new Map<string, Lead>();
    leads.forEach((l) => map.set(l.id, l));
    return map;
  }, [leads]);

  // Filtered call logs for selected period
  const periodLogs = useMemo(() => {
    return callLogs.filter((c) => {
      if (c.date < rangeStart || c.date > rangeEnd) return false;
      const lead = leadMap.get(c.leadId);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const bMatch = lead?.businessName.toLowerCase().includes(q);
        const cMatch = lead?.contactPerson.toLowerCase().includes(q);
        const pMatch = lead?.phone.toLowerCase().includes(q);
        const nMatch = c.notes?.toLowerCase().includes(q);
        if (!bMatch && !cMatch && !pMatch && !nMatch) return false;
      }
      if (filterOutcome && c.outcome !== filterOutcome) return false;
      if (filterCaller && c.calledBy !== filterCaller) return false;
      if (filterStage && lead?.stage !== filterStage) return false;
      return true;
    }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [callLogs, rangeStart, rangeEnd, leadMap, searchQuery, filterOutcome, filterCaller, filterStage]);

  // Follow-ups list sorted by due date
  const followUpLogs = useMemo(() => {
    return callLogs.filter((c) => {
      if (!c.followUpDate || c.followUpDone) return false;
      const lead = leadMap.get(c.leadId);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const bMatch = lead?.businessName.toLowerCase().includes(q);
        const cMatch = lead?.contactPerson.toLowerCase().includes(q);
        const pMatch = lead?.phone.toLowerCase().includes(q);
        if (!bMatch && !cMatch && !pMatch) return false;
      }
      if (filterCaller && c.calledBy !== filterCaller) return false;
      return true;
    }).sort((a, b) => (a.followUpDate || '').localeCompare(b.followUpDate || ''));
  }, [callLogs, leadMap, searchQuery, filterCaller]);

  // Grouped follow-ups: Overdue, Today, Tomorrow, Next Week, Later
  const groupedFollowUps = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const nextWeekLimit = format(addDays(new Date(), 7), 'yyyy-MM-dd');

    const overdue: CallLog[] = [];
    const today: CallLog[] = [];
    const tomorrow: CallLog[] = [];
    const nextWeek: CallLog[] = [];
    const later: CallLog[] = [];

    followUpLogs.forEach((f) => {
      const d = f.followUpDate!;
      if (d < todayStr) overdue.push(f);
      else if (d === todayStr) today.push(f);
      else if (d === tomorrowStr) tomorrow.push(f);
      else if (d <= nextWeekLimit) nextWeek.push(f);
      else later.push(f);
    });

    return { overdue, today, tomorrow, nextWeek, later };
  }, [followUpLogs]);

  // Meetings fixed from calls
  const meetingLogs = useMemo(() => {
    return callLogs.filter((c) => {
      const isMeeting = c.outcome === 'Meeting fixed' || !!c.meetingDate;
      if (!isMeeting) return false;
      const lead = leadMap.get(c.leadId);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const bMatch = lead?.businessName.toLowerCase().includes(q);
        const cMatch = lead?.contactPerson.toLowerCase().includes(q);
        if (!bMatch && !cMatch) return false;
      }
      return true;
    }).sort((a, b) => ((a.meetingDate || a.date) + (a.meetingTime || '')).localeCompare((b.meetingDate || b.date) + (b.meetingTime || '')));
  }, [callLogs, leadMap, searchQuery]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const bMatch = l.businessName.toLowerCase().includes(q);
        const cMatch = l.contactPerson.toLowerCase().includes(q);
        const pMatch = l.phone.toLowerCase().includes(q);
        const eMatch = l.email?.toLowerCase().includes(q);
        if (!bMatch && !cMatch && !pMatch && !eMatch) return false;
      }
      if (filterStage && l.stage !== filterStage) return false;
      return true;
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [leads, searchQuery, filterStage]);

  // Lead metrics for table
  const leadStatsMap = useMemo(() => {
    const map = new Map<string, { callsCount: number; lastCallDate?: string; nextFollowUp?: string }>();
    leads.forEach((l) => {
      const logs = callLogs.filter((c) => c.leadId === l.id);
      logs.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      const activeFollowUp = logs.find((c) => c.followUpDate && !c.followUpDone);
      map.set(l.id, {
        callsCount: logs.length,
        lastCallDate: logs[0]?.date,
        nextFollowUp: activeFollowUp?.followUpDate,
      });
    });
    return map;
  }, [leads, callLogs]);

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'call') {
        await deleteCallMutation.mutateAsync(deleteConfirm.id);
        toast.success('Call Deleted', 'Call log was successfully removed.');
      } else {
        await deleteLeadMutation.mutateAsync(deleteConfirm.id);
        toast.success('Lead Deleted', 'Prospect lead was permanently deleted.');
      }
      setDeleteConfirm(null);
    } catch (err: any) {
      toast.error('Delete Failed', err.message || 'Could not delete item.');
    }
  };

  const getOutcomeBadgeVariant = (outcome: CallOutcome) => {
    switch (outcome) {
      case 'Meeting fixed':
        return 'success';
      case 'Interested':
        return 'primary';
      case 'Callback requested':
        return 'warning';
      case 'Busy':
        return 'slate';
      case 'Not answered':
        return 'slate';
      case 'Not interested':
        return 'danger';
      case 'Wrong number':
        return 'danger';
      default:
        return 'slate';
    }
  };

  const getStageBadgeVariant = (stage: LeadStage) => {
    switch (stage) {
      case 'Converted':
        return 'success';
      case 'Meeting Fixed':
        return 'success';
      case 'Follow-up':
        return 'warning';
      case 'Contacted':
        return 'slate';
      case 'Not Interested':
        return 'danger';
      case 'New':
      default:
        return 'slate';
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Slim Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-primary-600" />
            Calls & Lead Follow-ups
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Daily prospect telecalling, conversation logs, callback reminders, and fixed meetings.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setPrefilledLeadId(undefined);
              setEditingCallLog(null);
              setLogCallOpen(true);
            }}
          >
            Log Call
          </Button>
        </div>
      </div>

      {/* Slim Toolbar: Date Control, Search, Single Filter popover */}
      <Card className="p-3 border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date Range Navigation: ‹ 21 Oct 2026 › */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-control border border-border bg-surface-subtle p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setDateMode('today')}
                className={`px-2.5 py-1 rounded-control transition-all font-medium ${
                  dateMode === 'today'
                    ? 'bg-surface text-primary-700 font-bold shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDateMode('week')}
                className={`px-2.5 py-1 rounded-control transition-all font-medium ${
                  dateMode === 'week'
                    ? 'bg-surface text-primary-700 font-bold shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                This week
              </button>
              <button
                type="button"
                onClick={() => setDateMode('month')}
                className={`px-2.5 py-1 rounded-control transition-all font-medium ${
                  dateMode === 'month'
                    ? 'bg-surface text-primary-700 font-bold shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                This month
              </button>
              <button
                type="button"
                onClick={() => setDateMode('custom')}
                className={`px-2.5 py-1 rounded-control transition-all font-medium ${
                  dateMode === 'custom'
                    ? 'bg-surface text-primary-700 font-bold shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Custom
              </button>
            </div>

            {dateMode !== 'custom' ? (
              <div className="flex items-center gap-1 border border-border rounded-control px-2 py-1 bg-surface">
                <button
                  type="button"
                  onClick={handlePrevDate}
                  className="p-1 hover:bg-surface-subtle rounded text-text-muted hover:text-text transition-colors"
                  aria-label="Previous date"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold px-2 text-text min-w-[110px] text-center">
                  {dateLabel}
                </span>
                <button
                  type="button"
                  onClick={handleNextDate}
                  className="p-1 hover:bg-surface-subtle rounded text-text-muted hover:text-text transition-colors"
                  aria-label="Next date"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-32 text-xs"
                />
                <span className="text-xs text-text-muted">to</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-32 text-xs"
                />
              </div>
            )}
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="Search leads, phone, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8"
                autoComplete="off"
              />
            </div>

            {/* Single Compact Filters Popover */}
            <div className="relative">
              <Button
                variant={filterOutcome || filterCaller || filterStage ? 'primary' : 'outline'}
                size="sm"
                leftIcon={<Filter className="w-3.5 h-3.5" />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
                {(filterOutcome || filterCaller || filterStage) && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-white inline-block" />
                )}
              </Button>

              {showFilters && (
                <div className="absolute right-0 top-full mt-2 w-72 p-4 rounded-card bg-surface border border-border shadow-modal z-40 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-bold text-text uppercase tracking-wider">Filter Calls</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterOutcome('');
                        setFilterCaller('');
                        setFilterStage('');
                      }}
                      className="text-[11px] text-primary-600 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text block mb-1">Call Outcome</label>
                    <select
                      value={filterOutcome}
                      onChange={(e) => setFilterOutcome(e.target.value)}
                      className="w-full rounded-control border border-border bg-surface px-2.5 py-1.5 text-xs text-text"
                    >
                      <option value="">All outcomes</option>
                      <option value="Interested">Interested</option>
                      <option value="Meeting fixed">Meeting fixed</option>
                      <option value="Callback requested">Callback requested</option>
                      <option value="Not answered">Not answered</option>
                      <option value="Busy">Busy</option>
                      <option value="Not interested">Not interested</option>
                      <option value="Wrong number">Wrong number</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text block mb-1">Caller / Team Member</label>
                    <select
                      value={filterCaller}
                      onChange={(e) => setFilterCaller(e.target.value)}
                      className="w-full rounded-control border border-border bg-surface px-2.5 py-1.5 text-xs text-text"
                    >
                      <option value="">All team members</option>
                      {teamUsers.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text block mb-1">Lead Stage</label>
                    <select
                      value={filterStage}
                      onChange={(e) => setFilterStage(e.target.value)}
                      className="w-full rounded-control border border-border bg-surface px-2.5 py-1.5 text-xs text-text"
                    >
                      <option value="">All stages</option>
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Meeting Fixed">Meeting Fixed</option>
                      <option value="Converted">Converted</option>
                      <option value="Not Interested">Not Interested</option>
                    </select>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => setShowFilters(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 10 Daily Summary Cards for Selected Period */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
        <div className="p-3 rounded-card bg-surface border border-border">
          <span className="text-[10px] text-text-muted uppercase font-bold block truncate">Calls Made</span>
          <span className="text-lg font-bold text-text mt-0.5 block">{stats.callsMade}</span>
        </div>
        <div className="p-3 rounded-card bg-surface border border-border">
          <span className="text-[10px] text-text-muted uppercase font-bold block truncate">Contacts</span>
          <span className="text-lg font-bold text-text mt-0.5 block">{stats.uniqueContacts}</span>
        </div>
        <div className="p-3 rounded-card bg-surface border border-border">
          <span className="text-[10px] text-emerald-600 uppercase font-bold block truncate">Connected</span>
          <span className="text-lg font-bold text-emerald-700 mt-0.5 block">{stats.connected}</span>
        </div>
        <div className="p-3 rounded-card bg-surface border border-border">
          <span className="text-[10px] text-text-muted uppercase font-bold block truncate">Not Answered</span>
          <span className="text-lg font-bold text-text mt-0.5 block">{stats.notAnswered}</span>
        </div>
        <div className="p-3 rounded-card bg-surface border border-border">
          <span className="text-[10px] text-amber-600 uppercase font-bold block truncate">Pending F/U</span>
          <span className="text-lg font-bold text-amber-700 mt-0.5 block">{stats.followUpsPending}</span>
        </div>
        <div className="p-3 rounded-card bg-surface border border-border">
          <span className="text-[10px] text-rose-600 uppercase font-bold block truncate">F/U Due Today</span>
          <span className="text-lg font-bold text-rose-700 mt-0.5 block">{stats.followUpsDueToday}</span>
        </div>
        <div className="p-3 rounded-card bg-surface border border-border">
          <span className="text-[10px] text-primary-600 uppercase font-bold block truncate">Meetings Fixed</span>
          <span className="text-lg font-bold text-primary-700 mt-0.5 block">{stats.meetingsFixed}</span>
        </div>
        <div className="p-3 rounded-card bg-surface border border-border">
          <span className="text-[10px] text-text-muted uppercase font-bold block truncate">Upcoming Mtgs</span>
          <span className="text-lg font-bold text-text mt-0.5 block">{stats.meetingsUpcoming}</span>
        </div>
        <div className="p-3 rounded-card bg-surface border border-border">
          <span className="text-[10px] text-primary-600 uppercase font-bold block truncate">Interested</span>
          <span className="text-lg font-bold text-primary-700 mt-0.5 block">{stats.interested}</span>
        </div>
        <div className="p-3 rounded-card bg-surface border border-border">
          <span className="text-[10px] text-emerald-600 uppercase font-bold block truncate">Converted</span>
          <span className="text-lg font-bold text-emerald-700 mt-0.5 block">{stats.converted}</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('today_calls')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'today_calls'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          Today's Calls ({periodLogs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('follow_ups')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'follow_ups'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          <CalendarClock className="w-3.5 h-3.5" />
          Follow-ups ({followUpLogs.length})
          {stats.followUpsDueToday > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
              {stats.followUpsDueToday} due
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('meetings')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'meetings'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          Meetings ({meetingLogs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'leads'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          All Leads ({filteredLeads.length})
        </button>
      </div>

      {/* TAB 1: TODAY'S CALLS */}
      {activeTab === 'today_calls' && (
        <div className="space-y-4">
          {/* Count Banner */}
          <div className="p-3 rounded-control bg-primary-50/70 border border-primary-200 text-xs font-medium text-primary-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary-600" />
              <strong>{stats.callsMade} calls</strong> to <strong>{stats.uniqueContacts} unique contacts</strong>,{' '}
              <strong>{stats.followUpsPending} follow-ups scheduled</strong>,{' '}
              <strong>{stats.meetingsFixed} meetings fixed</strong> for this period.
            </span>
            <span className="text-[11px] text-primary-700">
              Connection rate: <strong>{stats.connectionRate}%</strong>
            </span>
          </div>

          {periodLogs.length === 0 ? (
            <Card className="p-12 text-center border-border">
              <PhoneOff className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold text-text">No calls logged for this period.</p>
              <p className="text-[11px] text-text-muted mt-1 max-w-sm mx-auto">
                Start client outreach by clicking "Log Call" above to record prospect conversations and next steps.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => {
                  setPrefilledLeadId(undefined);
                  setEditingCallLog(null);
                  setLogCallOpen(true);
                }}
              >
                Log First Call
              </Button>
            </Card>
          ) : (
            <Card className="border-border overflow-hidden">
              <div className="divide-y divide-border">
                {periodLogs.map((c) => {
                  const lead = leadMap.get(c.leadId);
                  return (
                    <div key={c.id} className="p-4 hover:bg-surface-subtle transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-text text-sm">{lead?.businessName || 'Unknown Lead'}</span>
                          <span className="text-text-muted">— {lead?.contactPerson}</span>
                          <span className="text-[11px] text-text-muted">({lead?.phone})</span>
                          <Badge variant={getOutcomeBadgeVariant(c.outcome)}>
                            {c.outcome}
                          </Badge>
                        </div>

                        {c.notes && (
                          <p className="text-text-muted text-[11px] leading-relaxed line-clamp-2">
                            "{c.notes}"
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-[10px] text-text-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDate(c.date)} at {c.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> Caller: <strong>{c.calledBy}</strong>
                          </span>
                          {c.followUpDate && (
                            <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                              <CalendarClock className="w-3 h-3" /> Follow-up: {formatDate(c.followUpDate)}{c.followUpTime ? ` at ${c.followUpTime}` : ''}
                            </span>
                          )}
                          {c.meetingDate && (
                            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                              <CalendarCheck className="w-3 h-3" /> Meeting: {formatDate(c.meetingDate)} at {c.meetingTime}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Phone className="w-3 h-3" />}
                          onClick={() => {
                            setPrefilledLeadId(c.leadId);
                            setEditingCallLog(null);
                            setLogCallOpen(true);
                          }}
                        >
                          Call Again
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCallLog(c);
                            setLogCallOpen(true);
                          }}
                          className="p-1.5 text-text-muted hover:text-text rounded hover:bg-surface-subtle transition-colors"
                          title="Edit call log"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirm({
                              type: 'call',
                              id: c.id,
                              title: `call with ${lead?.businessName || 'lead'} on ${formatDate(c.date)}`,
                            })
                          }
                          className="p-1.5 text-text-muted hover:text-rose-600 rounded hover:bg-surface-subtle transition-colors"
                          title="Delete call log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Per-Caller Performance Strip */}
          {stats.perCaller.length > 0 && (
            <Card className="p-4 border-border space-y-3">
              <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary-600" />
                Team Calling Activity for Selected Period
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {stats.perCaller.map((p) => (
                  <div key={p.caller} className="p-3 rounded-control bg-surface-subtle border border-border">
                    <span className="font-bold text-xs text-text block">{p.caller}</span>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted">
                      <span>Calls: <strong>{p.callsCount}</strong></span>
                      <span>Connected: <strong className="text-emerald-700">{p.connectedCount}</strong></span>
                      <span>Meetings: <strong className="text-primary-700">{p.meetingsCount}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: FOLLOW-UPS */}
      {activeTab === 'follow_ups' && (
        <div className="space-y-6">
          {followUpLogs.length === 0 ? (
            <Card className="p-12 text-center border-border">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-text">All follow-ups completed!</p>
              <p className="text-[11px] text-text-muted mt-1">
                No pending prospect check-ins or callbacks scheduled.
              </p>
            </Card>
          ) : (
            <>
              {/* Overdue Section */}
              {groupedFollowUps.overdue.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                      Overdue Follow-ups ({groupedFollowUps.overdue.length})
                    </h3>
                  </div>
                  <Card className="border-rose-200 divide-y divide-rose-100 bg-rose-50/20">
                    {groupedFollowUps.overdue.map((f) => renderFollowUpRow(f, true))}
                  </Card>
                </div>
              )}

              {/* Today Section */}
              {groupedFollowUps.today.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                      Due Today ({groupedFollowUps.today.length})
                    </h3>
                  </div>
                  <Card className="border-border divide-y divide-border">
                    {groupedFollowUps.today.map((f) => renderFollowUpRow(f))}
                  </Card>
                </div>
              )}

              {/* Tomorrow Section */}
              {groupedFollowUps.tomorrow.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-500" />
                    <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                      Tomorrow ({groupedFollowUps.tomorrow.length})
                    </h3>
                  </div>
                  <Card className="border-border divide-y divide-border">
                    {groupedFollowUps.tomorrow.map((f) => renderFollowUpRow(f))}
                  </Card>
                </div>
              )}

              {/* Next Week Section */}
              {groupedFollowUps.nextWeek.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    Next 7 Days ({groupedFollowUps.nextWeek.length})
                  </h3>
                  <Card className="border-border divide-y divide-border">
                    {groupedFollowUps.nextWeek.map((f) => renderFollowUpRow(f))}
                  </Card>
                </div>
              )}

              {/* Later Section */}
              {groupedFollowUps.later.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    Later ({groupedFollowUps.later.length})
                  </h3>
                  <Card className="border-border divide-y divide-border">
                    {groupedFollowUps.later.map((f) => renderFollowUpRow(f))}
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 3: MEETINGS */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          {meetingLogs.length === 0 ? (
            <Card className="p-12 text-center border-border">
              <Calendar className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold text-text">No upcoming meetings fixed from calls.</p>
              <p className="text-[11px] text-text-muted mt-1">
                When you mark a call outcome as "Meeting fixed", it will automatically synchronize here, on the agency Calendar, and on the Dashboard.
              </p>
            </Card>
          ) : (
            <Card className="border-border overflow-hidden">
              <div className="divide-y divide-border">
                {meetingLogs.map((m) => {
                  const lead = leadMap.get(m.leadId);
                  const mDate = m.meetingDate || m.date;
                  const mTime = m.meetingTime || m.time;
                  return (
                    <div key={m.id} className="p-4 hover:bg-surface-subtle transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text text-sm">{lead?.businessName || 'Lead Meeting'}</span>
                          <span className="text-text-muted">— {lead?.contactPerson}</span>
                          <Badge variant="success">Meeting Fixed</Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
                          <span className="flex items-center gap-1 font-semibold text-text">
                            <Calendar className="w-3.5 h-3.5 text-primary-600" /> {formatDate(mDate)} at {mTime}
                          </span>
                          {m.meetingLocation && (
                            <span className="flex items-center gap-1 text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                              <ExternalLink className="w-3 h-3" /> {m.meetingLocation}
                            </span>
                          )}
                          <span>Booked by: <strong>{m.calledBy}</strong></span>
                        </div>

                        {m.notes && (
                          <p className="text-[11px] text-text-muted">
                            Meeting agenda / notes: "{m.notes}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Phone className="w-3 h-3" />}
                          onClick={() => {
                            setPrefilledLeadId(m.leadId);
                            setLogCallOpen(true);
                          }}
                        >
                          Log Check-in
                        </Button>
                        {lead && !lead.convertedClientId && (
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Sparkles className="w-3 h-3" />}
                            onClick={() => {
                              setLeadToConvert(lead);
                              setConvertClientOpen(true);
                            }}
                          >
                            Convert to Client
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 4: ALL LEADS */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">
              Showing <strong>{filteredLeads.length}</strong> prospect leads
            </span>
          </div>

          {filteredLeads.length === 0 ? (
            <Card className="p-12 text-center border-border">
              <Building className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold text-text">No leads found.</p>
              <p className="text-[11px] text-text-muted mt-1">
                Add a new lead inline while logging a call or clear active search filters.
              </p>
            </Card>
          ) : (
            <Card className="border-border overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    <th className="py-3 px-4">Business / Lead</th>
                    <th className="py-3 px-3">Contact Person</th>
                    <th className="py-3 px-3">Phone & Email</th>
                    <th className="py-3 px-3">Stage</th>
                    <th className="py-3 px-3">Last Call</th>
                    <th className="py-3 px-3">Next F/U</th>
                    <th className="py-3 px-3 text-center">Calls</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLeads.map((lead) => {
                    const lStats = leadStatsMap.get(lead.id);
                    return (
                      <tr key={lead.id} className="hover:bg-surface-subtle/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-text block">{lead.businessName}</span>
                          {lead.source && (
                            <span className="text-[10px] text-text-muted">Source: {lead.source}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-medium text-text">
                          {lead.contactPerson}
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          <span className="block text-text font-mono">{lead.phone}</span>
                          {lead.email && <span className="text-text-muted truncate block max-w-[140px]">{lead.email}</span>}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={getStageBadgeVariant(lead.stage)}>
                            {lead.stage}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-text-muted">
                          {formatDate(lStats?.lastCallDate)}
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          {lStats?.nextFollowUp ? (
                            <span className="text-amber-700 font-medium">
                              {formatDate(lStats.nextFollowUp)}
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-text">
                          {lStats?.callsCount || 0}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] px-2"
                              leftIcon={<Phone className="w-3 h-3" />}
                              onClick={() => {
                                setPrefilledLeadId(lead.id);
                                setEditingCallLog(null);
                                setLogCallOpen(true);
                              }}
                            >
                              Call
                            </Button>
                            {!lead.convertedClientId ? (
                              <Button
                                variant="primary"
                                size="sm"
                                className="h-7 text-[11px] px-2"
                                leftIcon={<Sparkles className="w-3 h-3" />}
                                onClick={() => {
                                  setLeadToConvert(lead);
                                  setConvertClientOpen(true);
                                }}
                              >
                                Convert
                              </Button>
                            ) : (
                              <Badge variant="success">Client</Badge>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLead(lead);
                                setEditLeadOpen(true);
                              }}
                              className="p-1.5 text-text-muted hover:text-text rounded hover:bg-surface-subtle transition-colors"
                              title="Edit lead details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirm({
                                  type: 'lead',
                                  id: lead.id,
                                  title: `lead "${lead.businessName}"`,
                                })
                              }
                              className="p-1.5 text-text-muted hover:text-rose-600 rounded hover:bg-surface-subtle transition-colors"
                              title="Delete lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* RENDER HELPER FOR FOLLOW UP ROWS */}
      {/* Helper function defined inside component to access state */}
      {/* Log Call Modal */}
      <LogCallModal
        open={logCallOpen}
        onOpenChange={setLogCallOpen}
        prefilledLeadId={prefilledLeadId}
        editingCallLog={editingCallLog}
      />

      {/* Edit Lead Modal */}
      <EditLeadModal
        open={editLeadOpen}
        onOpenChange={setEditLeadOpen}
        lead={editingLead}
      />

      {/* Reschedule Follow-up Modal */}
      <RescheduleFollowUpModal
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        callLog={rescheduleCallLog}
        leadName={leadMap.get(rescheduleCallLog?.leadId || '')?.businessName}
      />

      {/* Convert to Client Drawer (reuses existing AddClientDrawer with prefill) */}
      <AddClientDrawer
        isOpen={convertClientOpen}
        onClose={() => {
          setConvertClientOpen(false);
          setLeadToConvert(null);
        }}
        initialLead={leadToConvert}
        onClientCreated={async (newClient: Client) => {
          if (leadToConvert) {
            await convertLeadMutation.mutateAsync({
              leadId: leadToConvert.id,
              clientId: newClient.id,
            });
            toast.success('Lead Converted!', `${leadToConvert.businessName} linked to client record.`);
          }
        }}
      />

      {/* Confirm Delete Modal */}
      <Modal open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <ModalContent size="sm" variant="center">
          <ModalHeader>
            <ModalTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Confirm Deletion
            </ModalTitle>
            <ModalDescription className="text-xs text-text-muted">
              Are you sure you want to permanently delete {deleteConfirm?.title}? This action cannot be undone.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={deleteCallMutation.isPending || deleteLeadMutation.isPending}
            >
              Delete Permanently
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );

  function renderFollowUpRow(f: CallLog, isOverdue = false) {
    const lead = leadMap.get(f.leadId);
    return (
      <div key={f.id} className="p-4 hover:bg-surface-subtle transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-text text-sm">{lead?.businessName || 'Lead'}</span>
            <span className="text-text-muted">— {lead?.contactPerson}</span>
            <span className="text-[11px] text-text-muted">({lead?.phone})</span>
            {isOverdue ? (
              <Badge variant="danger">Overdue</Badge>
            ) : isToday(parseISO(f.followUpDate!)) ? (
              <Badge variant="warning">Due Today</Badge>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-text font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-text-muted" /> Due: <strong>{formatDate(f.followUpDate)}</strong> {f.followUpTime ? `at ${f.followUpTime}` : ''}
            </span>
            <span>Caller: <strong>{f.calledBy}</strong></span>
          </div>

          {f.followUpNote && (
            <p className="text-[11px] text-text-muted leading-relaxed">
              Objective: "{f.followUpNote}"
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Phone className="w-3 h-3" />}
            onClick={() => {
              setPrefilledLeadId(f.leadId);
              setEditingCallLog(null);
              setLogCallOpen(true);
            }}
          >
            Call Again
          </Button>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<CalendarClock className="w-3 h-3" />}
            onClick={() => {
              setRescheduleCallLog(f);
              setRescheduleOpen(true);
            }}
          >
            Reschedule
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
            onClick={async () => {
              await completeFollowUpMutation.mutateAsync(f.id);
              toast.success('Completed', 'Follow-up marked as completed.');
            }}
          >
            Mark Done
          </Button>

          <button
            type="button"
            onClick={async () => {
              await updateCallMutation.mutateAsync({
                id: f.id,
                data: { outcome: 'Not interested', followUpDone: true },
              });
              toast.success('Updated', 'Lead marked as not interested.');
            }}
            className="p-1.5 text-text-muted hover:text-rose-600 rounded hover:bg-surface-subtle transition-colors text-[11px]"
            title="Mark Not Interested"
          >
            Not Interested
          </button>
        </div>
      </div>
    );
  }
};
