export type DashboardData = {
  recordsCount?: number;
  totalRecords?: number;
  records?: number;

  tasksCount?: number;
  totalTasks?: number;
  tasks?: number;

  openTasksCount?: number;
  openTasks?: number;

  reportsCount?: number;
  totalReports?: number;
  reports?: number;

  usersCount?: number;
  totalUsers?: number;

  recentActivity?: unknown[];
  activity?: unknown[];

  [key: string]: unknown;
};

export type DashboardResponse = {
  data?: DashboardData;
  meta?: unknown;
  [key: string]: unknown;
};