import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { activityLogService } from '@/services';
import { ActivityLog } from '@/types';
import { formatDateTime } from '@/lib/format';
import { Activity } from 'lucide-react';

export const ActivityFeedWidget: React.FC = () => {
  const { data: logs = [] } = useQuery<ActivityLog[]>({
    queryKey: ['activity-logs', 'recent'],
    queryFn: () => activityLogService.getActivityLogs(8),
  });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-control bg-blue-50 text-blue-600">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Recent Agency Activity</CardTitle>
            <p className="text-[11px] text-text-muted">Live audit timeline of operations</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {logs.length === 0 ? (
          <p className="text-xs text-text-muted py-6 text-center">No recent activity logs.</p>
        ) : (
          <div className="relative border-l-2 border-primary-200 ml-2 space-y-4 pl-4 py-1">
            {logs.map((log) => (
              <div key={log.id} className="relative text-xs">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-surface border-2 border-primary-600" />
                <p className="font-semibold text-text">
                  <strong className="text-primary-700">{log.actorName}</strong> {log.action}{' '}
                  <span className="font-bold text-text">{log.entity}</span>
                </p>
                {log.after && (
                  <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                    {Object.entries(log.after)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
                  </p>
                )}
                <span className="text-[10px] text-text-subtle block mt-0.5">
                  {formatDateTime(log.at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityFeedWidget;
