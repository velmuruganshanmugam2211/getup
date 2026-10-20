import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Client, Deliverable, DeliverableType } from '@/types';
import { computeClientDeliverables } from '@/lib/selectors';
import { Video, Image, Film, Sparkles, Plus, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface ClientWorkloadHeaderProps {
  client: Client;
  deliverables: Deliverable[];
  onAddTask: (clientId: string, type?: DeliverableType) => void;
  isSelected?: boolean;
  onFilterByClient?: (clientId: string) => void;
}

export const ClientWorkloadHeader: React.FC<ClientWorkloadHeaderProps> = ({
  client,
  deliverables,
  onAddTask,
  isSelected,
  onFilterByClient,
}) => {
  const d = computeClientDeliverables(client, deliverables);
  const videosTotal = d.videosDone + d.videosRemaining;
  const postsTotal = d.postsDone + d.postsRemaining;
  const reelsTotal = d.reelsDone + d.reelsRemaining;
  const storiesTotal = d.storiesDone + d.storiesRemaining;

  return (
    <Card
      className={`border transition-all ${
        isSelected
          ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-md bg-white'
          : 'border-border hover:border-slate-300 bg-surface shadow-card'
      }`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Client Top Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/clients/${client.id}`}
                className="text-sm font-bold text-text hover:text-primary-600 truncate transition-colors"
              >
                {client.business}
              </Link>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {client.status}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Contact: {client.contactPerson} · Fee: ₹{client.monthlyFee.toLocaleString('en-IN')}/mo
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onFilterByClient && (
              <Button
                variant={isSelected ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => onFilterByClient(client.id)}
                className="text-xs"
              >
                {isSelected ? 'Viewing Tasks' : 'Filter Tasks'}
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAddTask(client.id)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Add Task
            </Button>
          </div>
        </div>

        {/* Main highlight: Videos remaining */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Video className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-text">
                Videos remaining to make: {d.videosRemaining} of {videosTotal}
              </span>
            </div>
            <span className="text-xs font-semibold text-text tabular-nums">
              {d.videosDone} completed
            </span>
          </div>

          {/* Videos progress bar */}
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{
                width: `${
                  videosTotal > 0
                    ? Math.min(100, Math.round((d.videosDone / videosTotal) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Remaining breakdown for Posts, Reels, Stories */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Videos Mini */}
          <div className="p-2 rounded border border-border bg-white flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted text-[11px] mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Video className="w-3 h-3 text-blue-500" /> Videos
              </span>
              <span className="font-bold text-text">{d.videosRemaining} left</span>
            </div>
            <span className="text-[11px] text-text-muted">
              {d.videosDone} of {videosTotal} made
            </span>
          </div>

          {/* Posts Mini */}
          <div className="p-2 rounded border border-border bg-white flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted text-[11px] mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Image className="w-3 h-3 text-emerald-500" /> Posts
              </span>
              <span className="font-bold text-text">{d.postsRemaining} left</span>
            </div>
            <span className="text-[11px] text-text-muted">
              {d.postsDone} of {postsTotal} made
            </span>
          </div>

          {/* Reels Mini */}
          <div className="p-2 rounded border border-border bg-white flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted text-[11px] mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Film className="w-3 h-3 text-purple-500" /> Reels
              </span>
              <span className="font-bold text-text">{d.reelsRemaining} left</span>
            </div>
            <span className="text-[11px] text-text-muted">
              {d.reelsDone} of {reelsTotal} made
            </span>
          </div>

          {/* Stories Mini */}
          <div className="p-2 rounded border border-border bg-white flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted text-[11px] mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-amber-500" /> Stories
              </span>
              <span className="font-bold text-text">{d.storiesRemaining} left</span>
            </div>
            <span className="text-[11px] text-text-muted">
              {d.storiesDone} of {storiesTotal} made
            </span>
          </div>
        </div>

        {/* Total Deliverables summary bar */}
        <div className="flex items-center justify-between pt-1 text-xs text-text-muted border-t border-border/60">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Total Deliverables: <strong className="text-text">{d.totalDone} / {d.totalPromised}</strong>
          </span>
          <span className="font-semibold text-text">
            {d.totalRemaining} remaining overall ({d.percent}%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
