// Plain-language helpers for the Orchard admin page. No React in here, so the
// wording and the arithmetic can be tested.

export type ExpiryState = "ENDED" | "ENDS_SOON" | "OK" | "NO_END_DATE";

export interface MandateExpiry {
  state: ExpiryState;
  daysLeft: number | null;
}

export type Tone = "danger" | "warning" | "ok" | "muted";

/**
 * What to say about a mandate's end date. Whether it matters depends on whether
 * money is still owed: a mandate that ended on a repaid loan is just finished.
 */
export function expiryBadge(
  expiry: MandateExpiry | undefined,
  owed: number | null | undefined,
): { label: string; short: string; tone: Tone } {
  if (!expiry || expiry.state === "NO_END_DATE" || expiry.daysLeft === null) {
    return { label: "No end date", short: "No end date", tone: "muted" };
  }
  const stillOwed = (owed ?? 0) > 0;
  if (expiry.state === "ENDED") {
    const ago = Math.abs(expiry.daysLeft);
    const when = ago === 0 ? "today" : `${ago} day${ago === 1 ? "" : "s"} ago`;
    const shortWhen = ago === 0 ? "today" : `${ago}d ago`;
    return stillOwed
      ? { label: `Ended ${when}, money still owed`, short: `Ended ${shortWhen}`, tone: "danger" }
      : { label: `Ended ${when}`, short: `Ended ${shortWhen}`, tone: "muted" };
  }
  const d = expiry.daysLeft;
  const left = `${d} day${d === 1 ? "" : "s"} left`;
  if (expiry.state === "ENDS_SOON") {
    return stillOwed
      ? { label: `Ends soon, ${left}`, short: `Ends in ${d}d`, tone: "warning" }
      : { label: left, short: `${d}d left`, tone: "muted" };
  }
  return { label: left, short: `${d}d left`, tone: "ok" };
}

export const TONE_CLASS: Record<Tone, string> = {
  danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  ok: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  muted: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

/** Loan status chip colour on the mandate table. */
export function loanStatusTone(status?: string | null): Tone {
  switch (status) {
    case "OVERDUE":
    case "DEFAULTED":
      return "danger";
    case "PARTIAL_REPAID":
      return "warning";
    case "ACTIVE":
      return "ok";
    default:
      return "muted";
  }
}

export const hourLabel = (h: number) => {
  const suffix = h < 12 ? "AM" : "PM";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${suffix}`;
};

/** The server uses Mongo's numbering: 1 is Sunday, 7 is Saturday. */
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const weekdayName = (mongoDay: number) => WEEKDAYS[mongoDay - 1] ?? String(mongoDay);

/** Why a mandate was or was not picked for a retry, in words an admin can act on. */
export const SKIP_REASON: Record<string, string> = {
  NO_LOAN: "No loan linked",
  LOAN_FINISHED: "Loan is already finished",
  NOTHING_OWED: "Nothing left to pay",
  NOT_YET_OVERDUE: "Loan is not overdue yet",
  SCHEDULE_NOT_STARTED: "First scheduled debit has not happened yet",
  LAST_DEBIT_SUCCEEDED: "Last debit went through",
  TOO_MANY_FAILURES: "Tried 24 times already, needs a person",
  ATTEMPTED_RECENTLY: "A debit was attempted a few hours ago",
  AMOUNT_EXCEEDS_BALANCE: "Debit amount is more than what is owed, needs a person",
  NOT_CHECKED_THIS_RUN: "Not checked this run (limit on Orchard lookups)",
  NOT_ACTIVE_ON_ORCHARD: "Orchard does not show it as active",
  ORCHARD_STATUS_UNAVAILABLE: "Could not reach Orchard for its status",
  ALREADY_TRIED_TODAY: "Already tried today, one attempt a day",
  WAITING_FOR_SLOT: "Waiting for today's retry hour",
  MANDATE_ENDED: "Mandate has ended, needs renewing",
};

export const skipReasonLabel = (code: string) => SKIP_REASON[code] ?? code;

/** Counts per status for the filter chips, plus the total. */
export function statusCounts(rows: { status: string }[] | undefined): Record<string, number> {
  const out: Record<string, number> = { ALL: rows?.length ?? 0 };
  for (const r of rows ?? []) out[r.status] = (out[r.status] ?? 0) + 1;
  return out;
}

/** The busiest slot as a sentence, or null when there is nothing to say. */
export function busiestSentence(
  rows: { key: number; count: number }[],
  name: (key: number) => string,
): string | null {
  const best = [...rows].sort((a, b) => b.count - a.count)[0];
  if (!best || best.count === 0) return null;
  return `${name(best.key)} (${best.count} payment${best.count === 1 ? "" : "s"})`;
}

/** 1st, 2nd, 3rd, 4th ... 11th, 12th, 13th, 21st. */
export function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

export const money = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Whether a mandate can be renewed now: ended, or close enough to its end that little is given up. */
export const RENEW_WITHIN_DAYS = 7;

export function canRenew(
  expiry: MandateExpiry | undefined,
  status: string,
  owed: number | null | undefined,
): boolean {
  if (status !== "ACTIVE" || !expiry || (owed ?? 0) <= 0) return false;
  if (expiry.state === "ENDED") return true;
  return expiry.state === "ENDS_SOON" && expiry.daysLeft !== null && expiry.daysLeft <= RENEW_WITHIN_DAYS;
}

export const slotLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

const CYCLE_NAME: Record<string, string> = { DLY: "Daily", WKL: "Weekly", MON: "Monthly" };
export const cycleName = (c?: string) => (c ? CYCLE_NAME[c] ?? c : "");
