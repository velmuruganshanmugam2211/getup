import React, { useMemo } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { callService } from '@/services';
import { CallLog, Lead } from '@/types';
import { formatDate } from '@/lib/format';
import { Link } from 'react-router-dom';
import {
  PhoneCall,
  Phone,
  CalendarClock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const CallsDashboardWidget: React.FC = () => {
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const { data: callLogs = [] } = useQuery<CallLog[]>({
    queryKey: ['calls', 'logs'],
    queryFn: () => callService.getCallLogs(),
  });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ['calls', 'leads'],
    queryFn: () => callService.getLeads(),
  });

  const leadMap = useMemo(() => {
    const map = new Map<string, Lead>();
    leads.forEach((l) => map.set(l.id, l));
    return map;
  }, [leads]);

  // Today metrics
  const todayCalls = useMemo(() => {
    return callLogs.filter((c) => c.date === todayStr);
  }, [callLogs, todayStr]);

  const callsTodayCount = todayCalls.length;
  const connectedTodayCount = todayCalls.filter(
    (c) => c.outcome === 'Interested' || c.outcome === 'Meeting fixed' || c.outcome === 'Callback requested'
  ).length;

  // Follow-ups due today and overdue
  const followUpsDue = useMemo(() => {
    return callLogs
      .filter((c) => c.followUpDate && !c.followUpDone && c.followUpDate <= todayStr)
      .sort((a, b) => (a.followUpDate || '').localeCompare(b.followUpDate || ''))
      .slice(0, 5);
  }, [callLogs, todayStr]);

  const followUpsDueTodayCount = callLogs.filter(
    (c) => c.followUpDate === todayStr && !c.followUpDone
  ).length;

  // 7-day trend chart
  const last7DaysTrend = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dStr = format(d, 'yyyy-MM-dd');
      const label = format(d, 'dd MMM');
      const dayLogs = callLogs.filter((c) => c.date === dStr);
      const connected = dayLogs.filter(
        (c) => c.outcome === 'Interested' || c.outcome === 'Meeting fixed' || c.outcome === 'Callback requested'
      ).length;
      result.push({
        date: label,
        calls: dayLogs.length,
        connected,
      });
    }
    return result;
  }, [callLogs]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Calls Today Card & Follow-ups due */}
      <Card className="p-4 border-border space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-primary-50 text-primary-600">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Calls Today</CardTitle>
              <span className="text-[11px] text-text-muted">Daily outreach & callbacks</span>
            </div>
          </div>
          <Link
            to="/calls"
            className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
          >
            Open Calls <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* 3 Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-control bg-surface-subtle border border-border">
            <span className="text-[10px] text-text-muted uppercase font-bold block">Calls</span>
            <span className="text-lg font-bold text-text mt-0.5 block">{callsTodayCount}</span>
          </div>
          <div className="p-2.5 rounded-control bg-emerald-50/60 border border-emerald-200">
            <span className="text-[10px] text-emerald-800 uppercase font-bold block">Connected</span>
            <span className="text-lg font-bold text-emerald-700 mt-0.5 block">{connectedTodayCount}</span>
          </div>
          <div className="p-2.5 rounded-control bg-amber-50/60 border border-amber-200">
            <span className="text-[10px] text-amber-800 uppercase font-bold block">F/U Due</span>
            <span className="text-lg font-bold text-amber-700 mt-0.5 block">{followUpsDueTodayCount}</span>
          </div>
        </div>

        {/* Action Button */}
        <Link to="/calls" className="block">
          <Button variant="outline" size="sm" className="w-full justify-center text-xs" leftIcon={<Phone className="w-3.5 h-3.5" />}>
            Log New Call
          </Button>
        </Link>
      </Card>

      {/* 2. Follow-ups Due List */}
      <Card className="p-4 border-border space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-amber-50 text-amber-600">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Follow-ups Due</CardTitle>
              <span className="text-[11px] text-text-muted">Urgent callback reminders</span>
            </div>
          </div>
          <Link to="/calls" className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {followUpsDue.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-muted">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500 opacity-60" />
            No follow-ups due today!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {followUpsDue.map((fu) => {
              const lead = leadMap.get(fu.leadId);
              const isOverdue = fu.followUpDate! < todayStr;
              return (
                <div key={fu.id} className="py-2 flex items-center justify-between gap-2 text-xs first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <span className="font-bold text-text truncate block">{lead?.businessName || 'Lead'}</span>
                    <span className="text-[11px] text-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(fu.followUpDate)}{fu.followUpTime ? ` at ${fu.followUpTime}` : ''}
                    </span>
                  </div>
                  <Badge variant={isOverdue ? 'danger' : 'warning'}>
                    {isOverdue ? 'Overdue' : 'Due Today'}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 3. Small 7-Day Calls Trend Chart */}
      <Card className="p-4 border-border space-y-2">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary-600" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider">7-Day Calls Trend</CardTitle>
          </div>
          <span className="text-[10px] text-text-muted">Daily call volume</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7DaysTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="calls" name="Calls" fill="#0284c7" radius={[3, 3, 0, 0]} />
              <Bar dataKey="connected" name="Connected" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
