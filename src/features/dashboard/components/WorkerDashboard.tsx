import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/data-display/StatCard';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { Button } from '@/components/ui/Button';
import { DashboardSummary } from '../services/dashboardService';
import { useAuth } from '@/features/auth';
import { CheckSquare, Clock, Video, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '@/lib/format';

export interface WorkerDashboardProps {
  data: DashboardSummary;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ data }) => {
  const { user } = useAuth();

  const totalTimeSpentHours = (
    data.workerTasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0) / 60
  ).toFixed(1);

  const pendingTasks = data.workerTasks.filter((t) => t.status !== 'done');
  const completedTasks = data.workerTasks.filter((t) => t.status === 'done');

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-card bg-primary-50 border border-primary-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-primary-700">
            Welcome back, {user?.name}! (My Work Space)
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Here are your active assigned tasks and client deliverables.
          </p>
        </div>
        <Link to="/tasks">
          <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Go to Task Board
          </Button>
        </Link>
      </div>

      {/* Worker Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="My Open Tasks"
          value={pendingTasks.length}
          subtitle={`${completedTasks.length} tasks completed`}
          icon={<CheckSquare className="w-5 h-5" />}
        />
        <StatCard
          title="Time Logged"
          value={`${totalTimeSpentHours} hrs`}
          subtitle="tracked on assigned tasks"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="Deliverables This Month"
          value={data.deliveredThisMonth}
          subtitle="delivered by team"
          icon={<Video className="w-5 h-5" />}
        />
      </div>

      {/* Active Tasks */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary-600" />
            My Current Tasks
          </CardTitle>
          <Link to="/tasks">
            <span className="text-xs text-primary-600 hover:underline">View All Tasks</span>
          </Link>
        </CardHeader>
        <CardContent>
          {data.workerTasks.length === 0 ? (
            <p className="text-xs text-text-muted py-4">No tasks currently assigned to you.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.workerTasks.slice(0, 8).map((task) => (
                <div key={task.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text truncate">{task.title}</p>
                    <span className="text-[11px] text-text-muted">
                      Due: {formatDate(task.dueDate)} · Priority: {task.priority}
                    </span>
                  </div>
                  <StatusBadge status={task.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
