// Figures that come from someone else's calculation, not from our loans.
//
// They are kept apart from the portfolio snapshot on purpose. Everything in the
// snapshot is computed from the loans and can be traced to them. A figure here
// cannot, so it is always shown with who reported it and when, never as if the
// system had calculated it, and always beside the calculated one.

export interface ReportedFigure {
  /** The figure as it was given to us, in percent. */
  pct: number;
  /** Who produced it. Shown on screen. */
  source: string;
  /** When it was given to us (YYYY-MM-DD). Shown on screen. */
  asOf: string;
  /** How it was calculated, or null while we have not been given it. */
  method: string | null;
}

/** The default rate reported by Internal Affairs. Update it here when they send a new one. */
export const REPORTED_DEFAULT_RATE: ReportedFigure | null = {
  pct: 5,
  source: "Internal Affairs",
  asOf: "2026-10-14",
  method: null,
};
