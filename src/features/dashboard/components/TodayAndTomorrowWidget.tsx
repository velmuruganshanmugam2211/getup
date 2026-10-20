import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { calendarService, clientService } from '@/services';
import { CalendarItem, Client } from '@/types';
import { formatDate } from '@/lib/format';
import { Calendar, Video, StickyNote, ExternalLink, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TodayAndTomorrowWidget: React.FC = () => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: calendarItems = [] } = useQuery<CalendarItem[]>({
    queryKey: ['calendar', 'all'],
    queryFn: () => calendarService.getItems(),
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients', 'list'],
    queryFn: () => clientService.getClients(),
  });

  const getClientName = (cId?: string) => {
    if (!cId) return null;
    return clients.find((c) => c.id === cId)?.name || null;
  };

  const todayItems = calendarItems.filter((i) => i.date === todayStr);
  const tomorrowItems = calendarItems.filter((i) => i.date === tomorrowStr);

  const renderItemList = (items: CalendarItem[], emptyText: string) => {
    if (items.length === 0) {
      return (
        <p className="text-xs text-text-muted italic py-1.5">{emptyText}</p>
      );
    }
    return (
      <div className="space-y-2">
        {items.map((item) => {
          const clientName = getClientName(item.clientId);
          const isMeeting = item.type === 'meeting';
          const link = item.locationOrLink || item.location;

          return (
            <div
              key={item.id}
              className="p-2.5 rounded-control bg-surface-subtle border border-border/70 flex items-start justify-between gap-3 text-xs hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`p-1.5 rounded shrink-0 mt-0.5 ${
                    isMeeting
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {isMeeting ? <Video className="w-3.5 h-3.5" /> : <StickyNote className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-text truncate">{item.title}</p>
                  <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5 flex-wrap">
                    {item.startTime && (
                      <span className="flex items-center gap-1 font-medium text-text">
                        <Clock className="w-3 h-3 text-text-subtle" />
                        {item.startTime} {item.endTime ? `– ${item.endTime}` : ''}
                      </span>
                    )}
                    {clientName && (
                      <span className="bg-surface px-1.5 py-0.2 rounded border border-border/60">
                        {clientName}
                      </span>
                    )}
                  </div>
                  {item.text && (
                    <p className="text-[11px] text-text-muted mt-1 line-clamp-1 italic">
                      "{item.text}"
                    </p>
                  )}
                </div>
              </div>

              {link && (
                <a
                  href={
                    link.startsWith('http')
                      ? link
                      : `https://${link}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Join
                </a>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-control bg-primary-50 text-primary-600">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Today & Tomorrow</CardTitle>
            <p className="text-[11px] text-text-muted">Agency meetings, client syncs, and schedule notes</p>
          </div>
        </div>
        <Link
          to="/calendar"
          className="text-xs text-primary-600 hover:underline font-semibold"
        >
          View Calendar →
        </Link>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Today Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Today ({formatDate(todayStr)})
            </span>
            <span className="text-[11px] font-bold text-text-muted">
              {todayItems.length} {todayItems.length === 1 ? 'event' : 'events'}
            </span>
          </div>
          {renderItemList(todayItems, 'No meetings or notes scheduled for today.')}
        </div>

        {/* Tomorrow Section */}
        <div className="pt-3 border-t border-border/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Tomorrow ({formatDate(tomorrowStr)})
            </span>
            <span className="text-[11px] font-semibold text-text-muted">
              {tomorrowItems.length} {tomorrowItems.length === 1 ? 'event' : 'events'}
            </span>
          </div>
          {renderItemList(tomorrowItems, 'No events scheduled for tomorrow.')}
        </div>
      </CardContent>
    </Card>
  );
};

export default TodayAndTomorrowWidget;
