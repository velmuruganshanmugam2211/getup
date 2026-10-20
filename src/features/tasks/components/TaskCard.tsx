import React from 'react';
import { Task, TaskPriority, TaskStatus } from '@/types';
import { formatDate } from '@/lib/format';
import { Calendar, Trash2, Video, Image, Film, Sparkles, Check, ArrowRight, RotateCcw } from 'lucide-react';

export interface TaskCardProps {
  task: Task;
  clientName?: string;
  assigneeName?: string;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string, title: string) => void;
}

const priorityColors: Record<TaskPriority, string> = {
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  low: 'bg-slate-50 text-slate-700 border-slate-200',
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  clientName,
  assigneeName,
  onUpdateStatus,
  onDeleteTask,
}) => {
  const isOverdue =
    task.status !== 'done' &&
    new Date(task.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

  return (
    <div className="p-3.5 rounded-lg bg-surface border border-border shadow-card hover:border-slate-300 transition-all flex flex-col justify-between gap-3">
      {/* Top badges: Client & Priority */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          {clientName && (
            <span className="text-[11px] font-bold text-primary-700 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded-full truncate max-w-[140px]">
              {clientName}
            </span>
          )}
          <span
            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
              priorityColors[task.priority] || priorityColors.medium
            }`}
          >
            {task.priority}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-xs font-bold text-text leading-snug line-clamp-2">{task.title}</h4>

        {/* Optional description */}
        {task.description && (
          <p className="text-[11px] text-text-muted line-clamp-2 mt-1">{task.description}</p>
        )}

        {/* Deliverable Type Tag if any */}
        {task.deliverableType && (
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-text-muted">
            {task.deliverableType === 'video' && <Video className="w-3 h-3 text-blue-500" />}
            {task.deliverableType === 'post' && <Image className="w-3 h-3 text-emerald-500" />}
            {task.deliverableType === 'reel' && <Film className="w-3 h-3 text-purple-500" />}
            {task.deliverableType === 'story' && <Sparkles className="w-3 h-3 text-amber-500" />}
            <span className="capitalize">{task.deliverableType} Deliverable</span>
          </div>
        )}
      </div>

      {/* Meta & Actions */}
      <div className="pt-2 border-t border-border/60 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <span className="font-medium text-text">{assigneeName || 'Unassigned'}</span>
          <span
            className={`flex items-center gap-1 ${
              isOverdue ? 'text-rose-600 font-bold' : 'text-text-muted'
            }`}
          >
            <Calendar className="w-3 h-3" />
            {formatDate(task.dueDate)}
          </span>
        </div>

        {/* Quick Transition Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {task.status === 'todo' && (
            <button
              onClick={() => onUpdateStatus(task.id, 'in_progress')}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded inline-flex items-center gap-1 transition-colors"
            >
              Start <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {task.status === 'in_progress' && (
            <button
              onClick={() => onUpdateStatus(task.id, 'done')}
              className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-colors"
            >
              <Check className="w-3 h-3" /> Complete
            </button>
          )}

          {task.status === 'done' && (
            <button
              onClick={() => onUpdateStatus(task.id, 'in_progress')}
              className="text-[11px] text-text-muted hover:text-text px-2 py-1 rounded inline-flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reopen
            </button>
          )}

          <button
            onClick={() => onDeleteTask(task.id, task.title)}
            className="text-text-subtle hover:text-rose-600 p-1 rounded transition-colors ml-auto"
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
