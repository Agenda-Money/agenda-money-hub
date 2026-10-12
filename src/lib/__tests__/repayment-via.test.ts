import { describe, expect, it } from "vitest";
import {
  filterByVia, sourceTags, summariseByVia, viaLabel, viaOf, viaTitle,
  type PaidVia, type RepaymentRow,
} from "../repayment-via";

const via = (code: PaidVia["code"], over: Partial<PaidVia> = {}): PaidVia => ({
  code, label: code, provider: null, basis: "recorded", ...over,
});
const row = (code: PaidVia["code"], amountPaid = 10, over: Partial<RepaymentRow> = {}): RepaymentRow => ({
  amountPaid, paidVia: via(code), ...over,
});

describe("viaOf", () => {
  it("says not recorded, never organic, for a row from an older server with no paidVia", () => {
    expect(viaOf({})).toMatchObject({ code: "UNKNOWN", label: "Not recorded" });
    expect(viaOf({ paidVia: null })).toMatchObject({ code: "UNKNOWN" });
  });
});

describe("viaLabel", () => {
  it("adds the provider where it helps", () => {
    expect(viaLabel(via("USSD", { label: "USSD", provider: "Paystack" }))).toBe("USSD · Paystack");
    expect(viaLabel(via("AUTO_DEBIT", { label: "Auto-debit", provider: "Orchard" }))).toBe("Auto-debit · Orchard");
  });

  it("leaves it off for an admin entry or a payment with no known route", () => {
    expect(viaLabel(via("ADMIN", { label: "Recorded by admin", provider: "Paystack" }))).toBe("Recorded by admin");
    expect(viaLabel(via("UNKNOWN", { label: "Not recorded" }))).toBe("Not recorded");
  });
});

describe("viaTitle", () => {
  it("tells a traced label from a recorded one, and says when nothing is known", () => {
    expect(viaTitle(via("USSD", { basis: "recorded" }))).toMatch(/recorded when/i);
    expect(viaTitle(via("USSD", { basis: "traced" }))).toMatch(/worked out from the payment log/i);
    expect(viaTitle(via("UNKNOWN", { basis: "unknown" }))).toMatch(/nothing recorded/i);
  });
});

describe("sourceTags", () => {
  it("tags a collections payment with the agent", () => {
    expect(sourceTags({ collectionSource: "collections", assignedCsaName: "Efua" })).toEqual(["Collections · Efua"]);
    expect(sourceTags({ collectionSource: "collections" })).toEqual(["Collections"]);
  });

  it("tags the payment that settled a campaign loan", () => {
    expect(sourceTags({ collectionSource: "organic", campaign: { cohort: 2 } })).toEqual(["Campaign · cohort 2"]);
  });

  it("adds no tag, and so no 'Organic' word, to an ordinary payment", () => {
    expect(sourceTags({ collectionSource: "organic", campaign: null })).toEqual([]);
  });
});

describe("filterByVia and summariseByVia", () => {
  const rows = [row("USSD", 10), row("USSD", 15), row("AUTO_DEBIT", 100), row("UNKNOWN", 5)];

  it("filters to one way of paying, or returns everything", () => {
    expect(filterByVia(rows, "USSD")).toHaveLength(2);
    expect(filterByVia(rows, "ALL")).toHaveLength(4);
    expect(filterByVia(rows, "AGENT")).toHaveLength(0);
  });

  it("counts and totals each way, in a fixed order, only for ways that occur", () => {
    expect(summariseByVia(rows).map((s) => [s.code, s.count, s.amount])).toEqual([
      ["AUTO_DEBIT", 1, 100],
      ["USSD", 2, 25],
      ["UNKNOWN", 1, 5],
    ]);
  });

  it("copes with an empty list and a missing amount", () => {
    expect(summariseByVia([])).toEqual([]);
    expect(summariseByVia([{ paidVia: via("APP") }])[0].amount).toBe(0);
  });
});
