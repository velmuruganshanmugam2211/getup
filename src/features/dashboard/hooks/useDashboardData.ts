import { useQuery } from '@tanstack/react-query';
import { dashboardKeys } from './dashboardKeys';
import { dashboardService, DashboardSummary } from '../services/dashboardService';
import { useAuth } from '@/features/auth';

export function useDashboardData(month: string) {
  const { user } = useAuth();

  return useQuery<DashboardSummary>({
    queryKey: dashboardKeys.summary(month, user?.role, user?.id),
    queryFn: () => dashboardService.getDashboardSummary(month, user?.role, user?.id),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
