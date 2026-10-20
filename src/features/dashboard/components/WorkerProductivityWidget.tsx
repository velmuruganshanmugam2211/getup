import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { teamService, deliverableService } from '@/services';
import { User, Deliverable } from '@/types';
import { Award } from 'lucide-react';

interface WorkerProductivityWidgetProps {
  currentMonth: string;
}

export const WorkerProductivityWidget: React.FC<WorkerProductivityWidgetProps> = ({ currentMonth }) => {
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['team', 'list'],
    queryFn: () => teamService.getUsers(),
  });

  const { data: deliverables = [] } = useQuery<Deliverable[]>({
    queryKey: ['deliverables', 'list'],
    queryFn: () => deliverableService.getDeliverables(),
  });

  const productivity = React.useMemo(() => {
    const monthDelivs = deliverables.filter(
      (d) => d.status === 'delivered' && (d.month === currentMonth || d.date?.startsWith(currentMonth))
    );

    return users.map((u) => {
      const userDelivs = monthDelivs.filter((d) => d.assigneeId === u.id);
      const videos = userDelivs.filter((d) => d.type === 'video').length;
      const reels = userDelivs.filter((d) => d.type === 'reel').length;
      const posts = userDelivs.filter((d) => d.type === 'post').length;
      const stories = userDelivs.filter((d) => d.type === 'story').length;

      return {
        user: u,
        total: userDelivs.length,
        videos,
        reels,
        posts,
        stories,
      };
    }).sort((a, b) => b.total - a.total);
  }, [users, deliverables, currentMonth]);

  const maxDeliverables = Math.max(...productivity.map((p) => p.total), 1);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-control bg-purple-50 text-purple-600">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Worker Productivity</CardTitle>
            <p className="text-[11px] text-text-muted">Completed deliverables per member this month</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {productivity.length === 0 ? (
          <p className="text-xs text-text-muted py-6 text-center">No team members registered.</p>
        ) : (
          <div className="space-y-3.5">
            {productivity.map(({ user, total, videos, reels, posts, stories }, idx) => (
              <div key={user.id} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-muted text-[11px] w-4">#{idx + 1}</span>
                    <span className="font-bold text-text">{user.name}</span>
                    <span className="text-[10px] uppercase font-semibold text-text-muted bg-surface-subtle px-1.5 py-0.2 rounded border border-border/60">
                      {user.role === 'super_admin' ? 'Super Admin' : 'Worker'}
                    </span>
                  </div>
                  <span className="font-bold text-primary-700 tabular-nums">
                    {total} {total === 1 ? 'deliverable' : 'deliverables'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-primary-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((total / maxDeliverables) * 100)}%` }}
                  />
                </div>

                {/* Breakdown tag */}
                <div className="flex items-center gap-2 text-[10px] text-text-muted pt-0.5">
                  {videos > 0 && <span>{videos} Vids</span>}
                  {reels > 0 && <span>{reels} Reels</span>}
                  {posts > 0 && <span>{posts} Posts</span>}
                  {stories > 0 && <span>{stories} Stories</span>}
                  {total === 0 && <span className="italic">0 delivered so far this month</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkerProductivityWidget;
