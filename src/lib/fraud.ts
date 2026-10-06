// Shared shape and wording for the fraud review queue.
//
// The API sends rule names in SHOUTING_SNAKE. Reviewers should never have to
// read those, so the plain-English version lives here, in one place, and a
// rule the hub has not been taught about falls back to something readable
// rather than a blank.

export type FraudRule =
  | "REFERENCE_SHARED"
  | "REFERENCE_IS_DEFAULTER"
  | "REFERRER_IN_DEFAULT"
  | "REMOTE_AGENT_LINK"
  | "AGENT_RISK"
  | "DEVICE_SHARED"
  | "DEVICE_OF_DEFAULTER";

export type FraudSeverity = "low" | "medium" | "high";
export type FraudStatus = "OPEN" | "CONFIRMED" | "DISMISSED";

export interface FraudFlag {
  _id: string;
  rule: FraudRule | string;
  severity: FraudSeverity;
  subjectType: "user" | "loan" | "agent" | "reference" | "device";
  subjectKey: string;
  msisdn?: string;
  loanReference?: string;
  agentCode?: string;
  summary: string;
  evidence: Record<string, unknown>;
  status: FraudStatus;
  shadow: boolean;
  decidedByName?: string;
  decidedAt?: string;
  decisionNote?: string;
  createdAt: string;
}

export interface RuleScore {
  rule: string;
  live: boolean;
  total: number;
  open: number;
  confirmed: number;
  dismissed: number;
  decided: number;
  /** Null until at least one flag has been decided. */
  precision: number | null;
}

export const RULE_LABELS: Record<string, { title: string; hint: string }> = {
  REFERENCE_SHARED: {
    title: "Reference used by several applicants",
    hint: "Two siblings naming a parent is ordinary. Three or more people naming the same number is worth a call.",
  },
  REFERENCE_IS_DEFAULTER: {
    title: "Reference is in default",
    hint: "The person named as a reference currently has a defaulted loan with us.",
  },
  REFERRER_IN_DEFAULT: {
    title: "Referred by a customer in default",
    hint: "A good borrower whose friend fell behind looks the same, so check before judging.",
  },
  REMOTE_AGENT_LINK: {
    title: "Applied through a shared agent link",
    hint: "Attributed to an agent but raised on the public form, not in the agent app. Verify with a call before disbursing.",
  },
  AGENT_RISK: {
    title: "Agent book looks unusual",
    hint: "Two or more independent signals on one agent. Look at their customers, not just the numbers.",
  },
  DEVICE_SHARED: {
    title: "Several customers on one device",
    hint: "A family phone or an agent signing people up on their own handset looks the same as made-up customers. Check which agent they sit under, then call a few.",
  },
  DEVICE_OF_DEFAULTER: {
    title: "Applied from a defaulter's device",
    hint: "Same device as someone in default. A relative sharing a phone is the innocent case, so ask before judging.",
  },
};

export function ruleTitle(rule: string): string {
  return RULE_LABELS[rule]?.title ?? rule.toLowerCase().replace(/_/g, " ");
}

export function ruleHint(rule: string): string {
  return RULE_LABELS[rule]?.hint ?? "";
}

export const SEVERITY_LABEL: Record<FraudSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/**
 * How much weight a rule's hit rate can bear.
 *
 * With only a handful of decisions a figure like 80% is noise, and showing it
 * unqualified invites someone to promote or retire a rule on four cases. There
 * are no published benchmarks for this market, so the threshold is a judgement,
 * set low enough to be reachable and high enough not to flatter small samples.
 */
export const MIN_DECISIONS_TO_TRUST = 20;

export function precisionLabel(score: Pick<RuleScore, "precision" | "decided">): string {
  if (score.precision === null) return "No decisions yet";
  const pct = `${Math.round(score.precision * 100)}%`;
  return score.decided < MIN_DECISIONS_TO_TRUST ? `${pct} (too few to trust)` : pct;
}

// ── Signals: what each rule is doing, and the switches ──

export interface SignalRow {
  rule: FraudRule | string;
  live: boolean;
  /** Live because the code says so; cannot be switched off from the page. */
  pinned: boolean;
  needsDeviceCapture: boolean;
  /** Open flags hidden now that would join the queue if this went live. */
  hiddenOpen: number;
  /** Open flags the queue is showing now. */
  shownOpen: number;
}

export interface SignalsResponse {
  deviceCapture: {
    enabled: boolean;
    noticePublished: boolean;
    noticeVersion: number | null;
    /** Customer-and-device pairs recorded so far. */
    sightings: number;
  };
  rules: SignalRow[];
}

// ── Privacy notice ──

export interface NoticeText {
  shortNotice: string;
  policyText: string;
}

export interface PublishedNotice extends NoticeText {
  version: number;
  publishedAt: string;
  publishedBy: string;
}

export interface NoticeResponse {
  draft: NoticeText;
  draftUpdatedAt: string | null;
  draftUpdatedBy: string | null;
  published: PublishedNotice | null;
  hasUnpublishedChanges: boolean;
  placeholders: string[];
  history: { version: number; publishedAt: string; publishedBy: string }[];
  limits: { shortNotice: { min: number; max: number }; policyText: { min: number; max: number } };
}

/**
 * Anything in square brackets is a blank still waiting to be filled in. The
 * server refuses to publish while any remain; the editor uses the same rule so
 * it can say so as the person types.
 */
export function placeholdersIn(text: string): string[] {
  return [...new Set((text.match(/\[[^\]]{1,120}\]/g) ?? []).map((p) => p.trim()))];
}
