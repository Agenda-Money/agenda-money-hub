/**
 * Analytics Dashboard Configuration
 * Defines thresholds, formatting, and state logic for portfolio metrics.
 */

export type MetricState = 'green' | 'amber' | 'red' | 'pink' | 'neutral';

export interface MetricDefinition {
  id: string;
  label: string;
  sub: string;
  format: (value: number) => string;
  state: (value: number) => MetricState;
  status: (value: number) => string;
}

export const METRIC_CONFIGS: Record<string, MetricDefinition> = {
  disbursed: {
    id: 'disbursed',
    label: 'Disbursed today',
    sub: '24hr volume',
    format: (v) => 'GHS ' + v.toLocaleString(),
    state: (v) => (v === 0 ? 'pink' : v > 1000 ? 'green' : 'amber'),
    status: (v) => (v === 0 ? 'No activity' : v > 1000 ? 'Active' : 'Low'),
  },
  weekly: {
    id: 'weekly',
    label: 'Weekly disbursement',
    sub: 'Last 7 days',
    format: (v) => 'GHS ' + (v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toLocaleString()),
    state: (v) => (v > 400000 ? 'green' : v > 100000 ? 'amber' : 'red'),
    status: (v) => (v > 400000 ? 'On track' : 'Below target'),
  },
  collection: {
    id: 'collection',
    label: 'Repayment Rate',
    sub: 'On-time performance',
    format: (v) => v + '%',
    state: (v) => (v >= 80 ? 'green' : v >= 60 ? 'amber' : 'red'),
    status: (v) => (v >= 80 ? 'Healthy' : v >= 60 ? 'Watch' : 'Underperforming'),
  },
  par: {
    id: 'par',
    label: 'Recovery Rate',
    sub: 'Overdue collections',
    format: (v) => v.toFixed(1) + '%',
    state: (v) => (v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'),
    status: (v) => (v >= 80 ? 'Healthy' : v >= 50 ? 'Improving' : 'Action Needed'),
  },
  activedebt: {
    id: 'activedebt',
    label: 'Loan Book',
    sub: 'Outstanding principal',
    format: (v) => 'GHS ' + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    state: (v) => (v < 1000 ? 'green' : v < 5000 ? 'amber' : 'red'),
    status: (v) => (v < 1000 ? 'Low' : v < 5000 ? 'Moderate' : 'High'),
  },
  overdue: {
    id: 'overdue',
    label: 'Overdue',
    sub: 'Requiring attention',
    format: (v) => v.toString(),
    state: (v) => (v === 0 ? 'green' : v <= 3 ? 'amber' : 'red'),
    status: (v) => (v === 0 ? 'All clear' : v <= 3 ? 'Monitor' : 'Action needed'),
  },
};

export const STATE_COLORS = {
  green: {
    bg: '#f0fdf7',
    border: '#c3f0de',
    label: '#0f6e56',
    val: '#085041',
    badgeBg: '#c3f0de',
    iconBg: '#c3f0de'
  },
  pink: {
    bg: '#fdf4fb',
    border: '#f5d9ef',
    label: '#993556',
    val: '#72243e',
    badgeBg: '#f5d9ef',
    iconBg: '#f5d9ef'
  },
  red: {
    bg: '#fff0f0',
    border: '#ffc5c5',
    label: '#a32d2d',
    val: '#791f1f',
    badgeBg: '#ffc5c5',
    iconBg: '#ffc5c5'
  },
  amber: {
    bg: '#fffbf0',
    border: '#fde4a0',
    label: '#854f0b',
    val: '#633806',
    badgeBg: '#fde4a0',
    iconBg: '#fde4a0'
  },
  neutral: {
    bg: '#f7f7fb',
    border: '#e8e8f0',
    label: '#888780',
    val: '#2c2c2a',
    badgeBg: '#e8e8f0',
    iconBg: '#e8e8f0'
  }
};
