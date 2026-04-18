export interface BucketMeta {
  label: string;
  short: string;
  color: string;           // tailwind bg class
  textColor: string;       // tailwind text class
  ringColor: string;       // tailwind ring class
  badgeBg: string;         // badge background
  description: string;
}

export function getBucketMeta(bucket: number): BucketMeta {
  if (bucket >= 8) return {
    label: 'DD+8+', short: '+8+',
    color: 'bg-red-600', textColor: 'text-white', ringColor: 'ring-red-600',
    badgeBg: 'bg-red-100 text-red-700 border-red-200',
    description: 'Critical — 8+ days overdue',
  };
  if (bucket === 7) return {
    label: 'DD+7', short: '+7',
    color: 'bg-red-500', textColor: 'text-white', ringColor: 'ring-red-500',
    badgeBg: 'bg-red-100 text-red-600 border-red-200',
    description: '7 days overdue',
  };
  if (bucket === 6) return {
    label: 'DD+6', short: '+6',
    color: 'bg-orange-500', textColor: 'text-white', ringColor: 'ring-orange-500',
    badgeBg: 'bg-orange-100 text-orange-700 border-orange-200',
    description: '6 days overdue',
  };
  if (bucket === 5) return {
    label: 'DD+5', short: '+5',
    color: 'bg-orange-400', textColor: 'text-white', ringColor: 'ring-orange-400',
    badgeBg: 'bg-orange-100 text-orange-600 border-orange-200',
    description: '5 days overdue',
  };
  if (bucket === 4) return {
    label: 'DD+4', short: '+4',
    color: 'bg-amber-500', textColor: 'text-white', ringColor: 'ring-amber-500',
    badgeBg: 'bg-amber-100 text-amber-700 border-amber-200',
    description: '4 days overdue',
  };
  if (bucket === 3) return {
    label: 'DD+3', short: '+3',
    color: 'bg-amber-400', textColor: 'text-black', ringColor: 'ring-amber-400',
    badgeBg: 'bg-amber-100 text-amber-700 border-amber-200',
    description: '3 days overdue',
  };
  if (bucket === 2) return {
    label: 'DD+2', short: '+2',
    color: 'bg-yellow-400', textColor: 'text-black', ringColor: 'ring-yellow-400',
    badgeBg: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    description: '2 days overdue',
  };
  if (bucket === 1) return {
    label: 'DD+1', short: '+1',
    color: 'bg-yellow-300', textColor: 'text-black', ringColor: 'ring-yellow-300',
    badgeBg: 'bg-yellow-100 text-yellow-600 border-yellow-200',
    description: '1 day overdue',
  };
  if (bucket === 0) return {
    label: 'DD 0', short: 'DD',
    color: 'bg-blue-500', textColor: 'text-white', ringColor: 'ring-blue-500',
    badgeBg: 'bg-blue-100 text-blue-700 border-blue-200',
    description: 'Due today',
  };
  if (bucket === -1) return {
    label: 'DD-1', short: '-1',
    color: 'bg-emerald-500', textColor: 'text-white', ringColor: 'ring-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    description: 'Due tomorrow',
  };
  if (bucket === -2) return {
    label: 'DD-2', short: '-2',
    color: 'bg-emerald-400', textColor: 'text-white', ringColor: 'ring-emerald-400',
    badgeBg: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    description: 'Due in 2 days',
  };
  // bucket === -3
  return {
    label: 'DD-3', short: '-3',
    color: 'bg-emerald-300', textColor: 'text-black', ringColor: 'ring-emerald-300',
    badgeBg: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    description: 'Due in 3 days',
  };
}

export const BUCKET_ORDER = [8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3];

export function formatNetwork(network: string, msisdn?: string) {
  // 1. If we have an MSISDN, use heuristic detection to verify/fallback
  if (msisdn) {
    const cleanNum = msisdn.replace(/\D/g, '');
    const local = cleanNum.startsWith('0') ? cleanNum.slice(0, 3) : '';
    const intl = cleanNum.startsWith('233') ? cleanNum.slice(0, 5) : '';

    // Telecel detection
    if (['020', '050'].includes(local) || ['23320', '23350'].includes(intl)) return 'Telecel';
    // AT detection
    if (['027', '057', '026', '056'].includes(local) || ['23327', '23357', '23326', '23356'].includes(intl)) return 'AirtelTigo';
    // MTN detection
    if (['024', '054', '055', '059', '025', '053'].includes(local) || ['23324', '23354', '23355', '23359', '23325', '23353'].includes(intl)) return 'MTN';
  }

  // 2. Fallback to provided network field
  if (network === 'VODAFONE') return 'Telecel';
  if (network === 'ARTLTIGO') return 'AirtelTigo';
  if (network === 'UNKNOWN' || !network) return 'Unknown';
  return network;
}

export function formatGHS(amount: number) {
  return `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatOutcome(outcome: string) {
  const map: Record<string, string> = {
    NO_ANSWER: 'No Answer',
    CALLED_BACK_LATER: 'Call Back Later',
    PROMISE_TO_PAY: 'Promise to Pay',
    PARTIAL_PAYMENT: 'Partial Payment',
    PAID: 'Paid',
    DISPUTED: 'Disputed',
    WRONG_NUMBER: 'Wrong Number',
    REFUSED: 'Refused',
    GUARANTOR_CALLED: 'Guarantor Called',
    SMS_SENT: 'SMS Sent',
    OTHER: 'Other',
  };
  return map[outcome] ?? outcome;
}

export function outcomeColor(outcome: string) {
  const map: Record<string, string> = {
    PROMISE_TO_PAY: 'bg-blue-100 text-blue-700 border-blue-200',
    PARTIAL_PAYMENT: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    NO_ANSWER: 'bg-muted text-muted-foreground border-border',
    CALLED_BACK_LATER: 'bg-amber-100 text-amber-700 border-amber-200',
    REFUSED: 'bg-red-100 text-red-700 border-red-200',
    WRONG_NUMBER: 'bg-red-100 text-red-600 border-red-200',
    DISPUTED: 'bg-orange-100 text-orange-700 border-orange-200',
    GUARANTOR_CALLED: 'bg-purple-100 text-purple-700 border-purple-200',
    SMS_SENT: 'bg-sky-100 text-sky-700 border-sky-200',
    OTHER: 'bg-muted text-muted-foreground border-border',
  };
  return map[outcome] ?? 'bg-muted text-muted-foreground border-border';
}
