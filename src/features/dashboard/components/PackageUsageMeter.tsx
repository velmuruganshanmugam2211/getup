import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { ClientDeliveryUsage } from '../services/dashboardService';
import { AlertTriangle, CheckCircle2, Video, Image, Film, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface PackageUsageMeterProps {
  clientUsage: ClientDeliveryUsage[];
}

export const PackageUsageMeter: React.FC<PackageUsageMeterProps> = ({ clientUsage }) => {
  if (clientUsage.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">Client Package Delivery Health</CardTitle>
          <CardDescription>Delivered vs Promised</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p className="text-xs text-text-muted">No active clients yet.</p>
            <Link to="/clients" className="text-xs text-primary-600 hover:underline font-semibold mt-1 inline-block">
              Add your first client to start tracking deliverables →
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold">Client Package Delivery Health</CardTitle>
          <Link to="/tasks" className="text-xs text-primary-600 hover:underline font-medium">
            View All Tasks →
          </Link>
        </div>
        <CardDescription>
          Delivered vs promised targets for active deliverables (sorted by most behind).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 divide-y divide-border/60">
          {clientUsage.map((usage) => {
            const {
              client,
              totalDelivered,
              totalPromised,
              totalRemaining,
              percent,
              isOnTrack,
              hasPackage,
              activeTypes,
            } = usage;

            const getTypeIcon = (type: string) => {
              switch (type) {
                case 'video':
                  return <Video className="w-3 h-3 text-blue-500" />;
                case 'post':
                  return <Image className="w-3 h-3 text-emerald-500" />;
                case 'reel':
                  return <Film className="w-3 h-3 text-purple-500" />;
                case 'story':
                  return <Sparkles className="w-3 h-3 text-amber-500" />;
                default:
                  return null;
              }
            };

            return (
              <div key={client.id} className="pt-3.5 first:pt-0">
                {/* Client header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/clients/${client.id}`}
                      className="text-xs font-bold text-text hover:text-primary-600 transition-colors"
                    >
                      {client.business}
                    </Link>
                    <span className="text-[11px] text-text-muted">({client.name})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasPackage && totalPromised > 0 ? (
                      <>
                        <span className="text-xs font-semibold text-text tabular-nums">
                          {totalDelivered} / {totalPromised} delivered ({percent}%)
                        </span>
                        {totalRemaining > 0 && (
                          <span className="text-[11px] text-text-muted tabular-nums">
                            ({totalRemaining} remaining)
                          </span>
                        )}
                        {isOnTrack ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> On Track
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Behind
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] font-medium text-text-muted bg-slate-100 px-2 py-0.5 rounded-full">
                        No package set
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      !hasPackage || totalPromised === 0
                        ? 'bg-slate-200'
                        : isOnTrack
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${!hasPackage ? 0 : Math.min(100, percent)}%` }}
                  />
                </div>

                {/* ONLY Active Types Chips */}
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  {activeTypes && activeTypes.length > 0 ? (
                    activeTypes.map((at) => (
                      <span
                        key={at.type}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-text"
                      >
                        {getTypeIcon(at.type)}
                        <strong>{at.label}:</strong> {at.displayBadge || `${at.done} / ${at.promised}`}
                        {at.remaining > 0 && (
                          <span className="text-text-muted">({at.remaining} left)</span>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-text-muted italic">No package deliverables configured</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
