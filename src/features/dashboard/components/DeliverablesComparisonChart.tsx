import React from 'react';
import { ChartCard } from '@/components/data-display/ChartCard';
import { DashboardSummary } from '../services/dashboardService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface DeliverablesComparisonChartProps {
  data: DashboardSummary;
}

export const DeliverablesComparisonChart: React.FC<DeliverablesComparisonChartProps> = ({
  data,
}) => {
  const types = ['video', 'reel', 'post', 'story'];
  const labels: Record<string, string> = {
    video: 'Videos',
    reel: 'Reels',
    post: 'Posts',
    story: 'Stories',
  };

  const chartData = types.map((type) => ({
    name: labels[type],
    'Delivered': data.deliveredByType[type] || 0,
  }));

  const hasData = chartData.some((d) => d['Delivered'] > 0);

  return (
    <ChartCard
      title="Deliverables by Type (All-Time)"
      subtitle="Total delivered across all clients by content type"
      minHeight={260}
    >
      <div className="w-full h-64">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={12} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="Delivered" fill="#16A34A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-xs text-text-muted">No deliverables logged yet.</p>
              <p className="text-[11px] text-text-subtle mt-1">Add clients and log deliverables to see this chart.</p>
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
};
