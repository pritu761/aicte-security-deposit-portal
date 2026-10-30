import { describe, expect, it } from "vitest";

import {
  dispatchFinancialYear,
  dispatchReference,
  isRenewalEligible,
  statusFromMaturity,
} from "@/lib/fdr-status";
import { addDaysToISO, todayISO } from "@/lib/utils";

describe("statusFromMaturity", () => {
  it("marks instruments beyond 90 days as active", () => {
    expect(statusFromMaturity(addDaysToISO(todayISO(), 91))).toBe("ACTIVE");
  });

  it("opens the 90-day expiring window", () => {
    expect(statusFromMaturity(addDaysToISO(todayISO(), 90))).toBe("EXPIRING_SOON");
    expect(statusFromMaturity(todayISO())).toBe("EXPIRING_SOON");
  });

  it("marks past-maturity instruments as matured", () => {
    expect(statusFromMaturity(addDaysToISO(todayISO(), -1))).toBe("MATURED");
  });
});

describe("isRenewalEligible", () => {
  const base = {
    status: "ACTIVE" as const,
    maturityDate: addDaysToISO(todayISO(), 60),
    hasSuccessor: false,
  };

  it("accepts an instrument inside the 180-day window", () => {
    expect(isRenewalEligible(base)).toBe(true);
    expect(
      isRenewalEligible({ ...base, maturityDate: addDaysToISO(todayISO(), 180) }),
    ).toBe(true);
  });

  it("rejects instruments outside the window or already succeeded", () => {
    expect(
      isRenewalEligible({ ...base, maturityDate: addDaysToISO(todayISO(), 181) }),
    ).toBe(false);
    expect(isRenewalEligible({ ...base, hasSuccessor: true })).toBe(false);
  });

  it("rejects workflow terminal and locked statuses", () => {
    for (const status of [
      "RELEASED",
      "RELEASE_REQUESTED",
      "RENEWAL_PENDING",
      "DISCREPANCY_FLAGGED",
    ] as const) {
      expect(isRenewalEligible({ ...base, status })).toBe(false);
    }
  });
});

describe("dispatch references", () => {
  it("uses the Indian financial year boundary (1 April)", () => {
    expect(dispatchFinancialYear(new Date("2026-03-31T12:00:00Z"))).toBe("2025-26");
    expect(dispatchFinancialYear(new Date("2026-04-01T00:00:00Z"))).toBe("2026-27");
  });

  it("builds the AICTE/REL/FY/8-hex format", () => {
    const reference = dispatchReference(
      "0f8fad5b-d9cb-469f-a165-70867728950e",
      new Date("2026-07-15T00:00:00Z"),
    );
    expect(reference).toBe("AICTE/REL/2026-27/0F8FAD5B");
    expect(reference).toMatch(/^AICTE\/REL\/\d{4}-\d{2}\/[0-9A-F]{8}$/);
  });
});
