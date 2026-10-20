export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: (month: string, role?: string, userId?: string) =>
    [...dashboardKeys.all, 'summary', month, role, userId] as const,
};
