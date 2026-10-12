import { describe, expect, it } from "vitest";
import {
  busiestSentence, expiryBadge, hourLabel, loanStatusTone, ordinal, skipReasonLabel, statusCounts, weekdayName,
} from "../orchard-insights";

describe("expiryBadge", () => {
  it("is loudest when a mandate has ended and money is still owed", () => {
    expect(expiryBadge({ state: "ENDED", daysLeft: -3 }, 100)).toEqual({ label: "Ended 3 days ago, money still owed", tone: "danger" });
    expect(expiryBadge({ state: "ENDED", daysLeft: -1 }, 5).label).toBe("Ended 1 day ago, money still owed");
    expect(expiryBadge({ state: "ENDED", daysLeft: 0 }, 5).label).toBe("Ended today, money still owed");
  });

  it("is quiet when the mandate ended on a loan that owes nothing", () => {
    expect(expiryBadge({ state: "ENDED", daysLeft: -3 }, 0)).toEqual({ label: "Ended 3 days ago", tone: "muted" });
    expect(expiryBadge({ state: "ENDED", daysLeft: -3 }, null).tone).toBe("muted");
  });

  it("warns about an ending-soon mandate only when money is owed", () => {
    expect(expiryBadge({ state: "ENDS_SOON", daysLeft: 5 }, 50)).toEqual({ label: "Ends soon, 5 days left", tone: "warning" });
    expect(expiryBadge({ state: "ENDS_SOON", daysLeft: 1 }, 50).label).toBe("Ends soon, 1 day left");
    expect(expiryBadge({ state: "ENDS_SOON", daysLeft: 5 }, 0).tone).toBe("muted");
  });

  it("is calm for a mandate with plenty of time left", () => {
    expect(expiryBadge({ state: "OK", daysLeft: 25 }, 50)).toEqual({ label: "25 days left", tone: "ok" });
  });

  it("does not invent an end for a mandate without one, or a row from an older server", () => {
    expect(expiryBadge({ state: "NO_END_DATE", daysLeft: null }, 50).label).toBe("No end date");
    expect(expiryBadge(undefined, 50).label).toBe("No end date");
  });
});

describe("loanStatusTone", () => {
  it("marks trouble red, part-paid amber, current green, anything else grey", () => {
    expect(loanStatusTone("OVERDUE")).toBe("danger");
    expect(loanStatusTone("DEFAULTED")).toBe("danger");
    expect(loanStatusTone("PARTIAL_REPAID")).toBe("warning");
    expect(loanStatusTone("ACTIVE")).toBe("ok");
    expect(loanStatusTone("REPAID")).toBe("muted");
    expect(loanStatusTone(null)).toBe("muted");
  });
});

describe("time labels", () => {
  it("writes hours the way people say them", () => {
    expect([0, 1, 11, 12, 13, 23].map(hourLabel)).toEqual(["12 AM", "1 AM", "11 AM", "12 PM", "1 PM", "11 PM"]);
  });

  it("uses the server's weekday numbering, where 1 is Sunday", () => {
    expect(weekdayName(1)).toBe("Sunday");
    expect(weekdayName(7)).toBe("Saturday");
  });

  it("writes ordinals, including the teens", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinal)).toEqual(
      ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "31st"],
    );
  });
});

describe("busiestSentence", () => {
  const hours = [{ key: 9, count: 3 }, { key: 18, count: 12 }, { key: 12, count: 5 }];

  it("names the busiest slot", () => {
    expect(busiestSentence(hours, hourLabel)).toBe("6 PM (12 payments)");
    expect(busiestSentence([{ key: 3, count: 1 }], hourLabel)).toBe("3 AM (1 payment)");
  });

  it("says nothing when there were no payments", () => {
    expect(busiestSentence([{ key: 3, count: 0 }], hourLabel)).toBeNull();
    expect(busiestSentence([], hourLabel)).toBeNull();
  });
});

describe("statusCounts and skipReasonLabel", () => {
  it("counts per status with a total", () => {
    expect(statusCounts([{ status: "ACTIVE" }, { status: "ACTIVE" }, { status: "CANCELLED" }])).toEqual({ ALL: 3, ACTIVE: 2, CANCELLED: 1 });
    expect(statusCounts(undefined)).toEqual({ ALL: 0 });
  });

  it("explains a skip in words, and falls back to the code for one it does not know", () => {
    expect(skipReasonLabel("LOAN_FINISHED")).toBe("Loan is already finished");
    expect(skipReasonLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
});
