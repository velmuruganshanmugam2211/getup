import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { taskService, clientService, teamService } from '@/services';
import { Task, Client, User } from '@/types';
import { formatDate } from '@/lib/format';
import { Clock, AlertCircle, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TasksDueWidget: React.FC = () => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);
  const in3DaysStr = in3Days.toISOString().split('T')[0];

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'list'],
    queryFn: () => taskService.getTasks(),
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients', 'list'],
    queryFn: () => clientService.getClients(),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['team', 'list'],
    queryFn: () => teamService.getUsers(),
  });

  const getClientName = (cId?: string) => {
    if (!cId) return null;
    return clients.find((c) => c.id === cId)?.business || null;
  };

  const getUserName = (uId: string) => {
    return users.find((u) => u.id === uId)?.name || 'Assignee';
  };

  const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < todayStr);
  const dueSoon = tasks.filter(
    (t) => t.status !== 'done' && t.dueDate && t.dueDate >= todayStr && t.dueDate <= in3DaysStr
  );

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-control bg-rose-50 text-rose-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Tasks Due & Overdue</CardTitle>
            <p className="text-[11px] text-text-muted">Urgent deadlines requiring attention</p>
          </div>
        </div>
        <Link to="/tasks" className="text-xs text-primary-600 hover:underline font-semibold">
          Tasks Board →
        </Link>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Overdue Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Overdue ({overdue.length})
            </span>
          </div>
          {overdue.length === 0 ? (
            <p className="text-xs text-text-muted italic py-1">No overdue tasks. All caught up!</p>
          ) : (
            <div className="space-y-2">
              {overdue.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 rounded-control bg-rose-50/50 border border-rose-200 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-text truncate">{task.title}</p>
                    <p className="text-[11px] text-text-muted">
                      {getClientName(task.clientId)} · Assigned to {getUserName(task.assigneeId)}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-rose-700 whitespace-nowrap">
                    Due {formatDate(task.dueDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Due Soon Section */}
        <div className="pt-3 border-t border-border/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary-600" /> Due in Next 3 Days ({dueSoon.length})
            </span>
          </div>
          {dueSoon.length === 0 ? (
            <p className="text-xs text-text-muted italic py-1">No immediate deadlines.</p>
          ) : (
            <div className="space-y-2">
              {dueSoon.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 rounded-control bg-surface-subtle border border-border flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-text truncate">{task.title}</p>
                    <p className="text-[11px] text-text-muted">
                      {getClientName(task.clientId)} · {getUserName(task.assigneeId)}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-text-muted whitespace-nowrap">
                    {formatDate(task.dueDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TasksDueWidget;
