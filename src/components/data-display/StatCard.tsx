import React from 'react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number; // e.g. 12 for +12%
    isPositive?: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  progress?: {
    current: number;
    total: number;
    label?: string;
  };
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  progress,
  className,
  onClick,
}) => {
  return (
    <Card
      onClick={onClick}
      hoverable={!!onClick}
      className={cn(
        'p-5 flex flex-col justify-between transition-all duration-150',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{title}</p>
        {icon && (
          <div className="p-2 rounded-control bg-primary-50 text-primary-700 shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold text-text tabular-nums tracking-tight">{value}</div>

        {(trend || subtitle) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center text-xs font-semibold tabular-nums',
                  trend.value > 0 && (trend.isPositive !== false ? 'text-semantic-success' : 'text-semantic-danger'),
                  trend.value < 0 && (trend.isPositive !== false ? 'text-semantic-danger' : 'text-semantic-success'),
                  trend.value === 0 && 'text-text-muted'
                )}
              >
                {trend.value > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                ) : trend.value < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5 mr-0.5" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
            {subtitle && <span className="text-xs text-text-muted">{subtitle}</span>}
          </div>
        )}

        {progress && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-text-muted mb-1 tabular-nums">
              <span>{progress.label || 'Progress'}</span>
              <span>
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-pill h-1.5 overflow-hidden">
              <div
                className="bg-primary-600 h-full rounded-pill transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round((progress.current / (progress.total || 1)) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
