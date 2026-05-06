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

