export interface Snapshot {
  total: number;
  count: number;
}

export interface ReportingDashboard {
  loanBook: Snapshot;
  allTimeDisbursement: Snapshot;
  activeUsers: { count: number; period?: string };
  todayDisbursement: Snapshot;
  weekDisbursement: Snapshot;
  newSignupsToday: { count: number; period?: string };
  newSignupsThisWeek: { count: number; period?: string };
  repaymentRate: number;
  defaultRate: number;
  retentionRate: number;
  momDisbursements: {
    year: number;
    month: number;
    total: number;
    count: number;
  }[];
}

