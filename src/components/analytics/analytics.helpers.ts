import type { CardStatus, Badge, Trend } from './analytics.types';

export const safeNum = (val: unknown): number => typeof val === 'number' && !isNaN(val) ? val : 0;

export const fGHS = (n: number | unknown): string => "GHS " + safeNum(n).toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const fPct = (n: number | unknown): string => safeNum(n).toFixed(1) + "%";
export const fCount = (n: number | unknown): string => safeNum(n).toLocaleString('en-GH');

export const getTrend = (direction: 'up' | 'down' | 'flat', value: string, label: string = 'vs yesterday'): Trend => ({
  direction,
  value,
  label
});

export const getDisbursedTodayStatus = (val: number): { status: CardStatus; badge: Badge } => ({
  status: 'green',
  badge: { text: "Active", variant: 'green' }
});

export const getWeeklyDisbursementStatus = (val: number): { status: CardStatus; badge: Badge } => {
  if (val > 0) return { status: 'green', badge: { text: "On track", variant: 'green' } };
  return { status: 'amber', badge: { text: "Below target", variant: 'amber' } };
};

export const getRepaymentRateStatus = (val: number): { status: CardStatus; badge: Badge } => {
  if (val >= 80) return { status: 'green', badge: { text: "Healthy", variant: 'green' } };
  if (val >= 50) return { status: 'neutral', badge: { text: "Moderate", variant: 'amber' } };
  return { status: 'red', badge: { text: "Underperforming", variant: 'red' } };
};

export const getCollectionRateStatus = (val: number): { status: CardStatus; badge: Badge } => {
  if (val >= 60) return { status: 'green', badge: { text: "Good", variant: 'green' } };
  if (val >= 30) return { status: 'neutral', badge: { text: "Moderate", variant: 'amber' } };
  return { status: 'red', badge: { text: "Action needed", variant: 'red' } };
};

export const getLoanBookStatus = (val: number): { status: CardStatus; badge: Badge } => {
  if (val > 0) return { status: 'green', badge: { text: "Active", variant: 'green' } };
  return { status: 'neutral', badge: { text: "Low", variant: 'neutral' } };
};

export const getOverdueLoansStatus = (val: number): { status: CardStatus; badge: Badge } => {
  if (val === 0) return { status: 'green', badge: { text: "Clear", variant: 'green' } };
  if (val <= 5) return { status: 'neutral', badge: { text: "Monitor", variant: 'amber' } };
  return { status: 'red', badge: { text: "Action needed", variant: 'red' } };
};

export const getDefaultRateStatus = (val: number): { status: CardStatus; badge: Badge } => {
  if (val < 5) return { status: 'green', badge: { text: "Healthy", variant: 'green' } };
  if (val < 15) return { status: 'neutral', badge: { text: "Monitor", variant: 'amber' } };
  return { status: 'red', badge: { text: "High risk", variant: 'red' } };
};

export const getPAR15Status = (val: number): { status: CardStatus; badge: Badge } => {
  if (val < 5) return { status: 'green', badge: { text: "", variant: 'neutral' } }; // Use default green
  if (val < 15) return { status: 'amber', badge: { text: "", variant: 'neutral' } };
  return { status: 'red', badge: { text: "", variant: 'neutral' } };
};

export const getPAR15StatusCustom = (val: number): CardStatus => {
  // Just returns the top-level card status for PAR15
  if (val < 5) return 'green';
  if (val < 15) return 'neutral'; // Wait, the spec says "neutral amber"
  return 'red';
};
// Fixing per spec: "if < 5 → green. If < 15 → neutral amber. If >= 15 → red"
// Since KpiCard takes status (background/text) and badge, I will map it:
// Status: neutral, badge variant: amber for neutral case.

export const getApprovalRateStatus = (val: number): { status: CardStatus; badge: Badge } => {
  if (val >= 70) return { status: 'green', badge: { text: "Healthy", variant: 'green' } }; // No specific badge text for approval rate in spec, defaulting to standard
  if (val >= 50) return { status: 'neutral', badge: { text: "Moderate", variant: 'amber' } }; 
  return { status: 'red', badge: { text: "Action needed", variant: 'red' } };
};

export const getChurnStatus = (val: number): { status: CardStatus; badge: Badge } => {
  if (val > 10) return { status: 'red', badge: { text: "High risk", variant: 'red' } };
  return { status: 'neutral', badge: { text: "Healthy", variant: 'neutral' } }; // using neutral status, neutral badge
};
