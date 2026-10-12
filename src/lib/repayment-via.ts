// How a repayment came in, as the backend reports it.
//
// The repayments screen used to print "Organic" on every row. That word only says
// no collections agent was credited; it never said whether the money arrived by
// auto-debit, USSD, the app or an admin recording it. The backend now sends that
// per row (paidVia), with how sure it is. This file turns it into labels, tooltips,
// colours and the summary strip, and is kept free of React so it can be tested.

export type PaidViaCode = "AUTO_DEBIT" | "USSD" | "APP" | "AGENT" | "ADMIN" | "UNKNOWN";

export interface PaidVia {
  code: PaidViaCode;
  label: string;
  provider: string | null;
  basis: "recorded" | "traced" | "unknown";
}

export interface RepaymentRow {
  repaymentId?: string;
  amountPaid?: number;
  paidVia?: PaidVia | null;
  collectionSource?: "collections" | "organic" | string;
  assignedCsaName?: string | null;
  campaign?: { cohort: number } | null;
}

/** What to show when an older server (or a cached tab) sends a row with no paidVia. */
export const NOT_REPORTED: PaidVia = { code: "UNKNOWN", label: "Not recorded", provider: null, basis: "unknown" };

export const VIA_ORDER: PaidViaCode[] = ["AUTO_DEBIT", "USSD", "APP", "AGENT", "ADMIN", "UNKNOWN"];

export const VIA_STYLE: Record<PaidViaCode, string> = {
  AUTO_DEBIT: "bg-violet-500/10 text-violet-700 border-violet-200 dark:text-violet-300 dark:border-violet-900",
  USSD: "bg-sky-500/10 text-sky-700 border-sky-200 dark:text-sky-300 dark:border-sky-900",
  APP: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-300 dark:border-emerald-900",
  AGENT: "bg-pink-500/10 text-pink-700 border-pink-200 dark:text-pink-300 dark:border-pink-900",
  ADMIN: "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300 dark:border-amber-900",
  UNKNOWN: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
};

export const viaOf = (row: RepaymentRow): PaidVia => row.paidVia ?? NOT_REPORTED;

/** The label on the badge: the real way it was paid, with the provider when known. */
export function viaLabel(via: PaidVia): string {
  return via.provider && via.code !== "ADMIN" && via.code !== "UNKNOWN"
    ? `${via.label} · ${via.provider}`
    : via.label;
}

/** Hover text: says how the label was arrived at, so a traced one is not mistaken for a recorded one. */
export function viaTitle(via: PaidVia): string {
  if (via.basis === "unknown") return "Nothing recorded how this payment was made, and no payment log matches it.";
  if (via.basis === "traced") return "Worked out from the payment log for this reference. This older payment did not record its channel.";
  return "Recorded when the payment was made.";
}

/** The second badge: a collections agent, or the campaign cohort that settled the loan. */
export function sourceTags(row: RepaymentRow): string[] {
  const tags: string[] = [];
  if (row.collectionSource === "collections") tags.push(row.assignedCsaName ? `Collections · ${row.assignedCsaName}` : "Collections");
  if (row.campaign) tags.push(`Campaign · cohort ${row.campaign.cohort}`);
  return tags;
}

export function filterByVia<T extends RepaymentRow>(rows: T[], code: PaidViaCode | "ALL"): T[] {
  return code === "ALL" ? rows : rows.filter((r) => viaOf(r).code === code);
}

export interface ViaSummary {
  code: PaidViaCode;
  label: string;
  count: number;
  amount: number;
}

/** Count and money per way of paying, for the strip above the list. Only ways that occur. */
export function summariseByVia(rows: RepaymentRow[]): ViaSummary[] {
  const by = new Map<PaidViaCode, ViaSummary>();
  for (const r of rows) {
    const via = viaOf(r);
    const cur = by.get(via.code) ?? { code: via.code, label: via.label, count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += Number(r.amountPaid ?? 0);
    by.set(via.code, cur);
  }
  return [...by.values()].sort((a, b) => VIA_ORDER.indexOf(a.code) - VIA_ORDER.indexOf(b.code));
}
