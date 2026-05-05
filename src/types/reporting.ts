export interface Snapshot {
  total: number;
  count: number;
}

export interface ReportingDashboard {
  loanBook: Snapshot;
  allTimeDisbursement: Snapshot;
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
