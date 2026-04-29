export interface ReportingDashboard {
  allTimeDisbursement: number;
  repaymentRate: number;
  defaultRate: number;
  retentionRate: number;
  disbursementToday: number;
  disbursementThisWeek: number;
  momDisbursements: {
    month: string;
    amount: number;
    count: number;
  }[];
}
