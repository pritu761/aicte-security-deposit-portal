import { describe, expect, it } from "vitest";

import {
  addDaysToISO,
  csvEscape,
  daysUntil,
  formatINR,
  getEffectiveFdrStatus,
  initials,
  maturityLabel,
  monthKey,
  toCsv,
  todayISO,
} from "@/lib/utils";

describe("date helpers", () => {
  it("computes whole-day differences without timezone drift", () => {
    expect(daysUntil("2026-04-11", "2026-04-01")).toBe(10);
    expect(daysUntil("2026-04-01", "2026-04-11")).toBe(-10);
    expect(daysUntil("2026-04-01", "2026-04-01")).toBe(0);
  });

  it("adds days across leap-year boundaries", () => {
    expect(addDaysToISO("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDaysToISO("2024-02-28", 2)).toBe("2024-03-01");
    expect(addDaysToISO("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("returns a stable ISO month key", () => {
    expect(monthKey("2026-07-15")).toBe("2026-07");
  });
});

describe("currency formatting", () => {
  it("formats Indian rupee amounts", () => {
    expect(formatINR(5000000)).toBe("₹50,00,000");
  });

  it("formats compact crore and lakh values", () => {
    expect(formatINR(12500000, { compact: true })).toBe("₹1.25 Cr");
    expect(formatINR(250000, { compact: true })).toBe("₹2.5 L");
  });
});

describe("maturity presentation", () => {
  it("flags overdue instruments", () => {
    const label = maturityLabel(addDaysToISO(todayISO(), -1));
    expect(label.tone).toBe("danger");
    expect(label.label).toBe("Matured 1 day ago");
  });

  it("treats today as the expiry boundary", () => {
    const label = maturityLabel(todayISO());
    expect(label.tone).toBe("warning");
    expect(label.label).toBe("Matures today");
  });

  it("counts forward days", () => {
    const warning = maturityLabel(addDaysToISO(todayISO(), 10));
    expect(warning.tone).toBe("warning");
    expect(warning.label).toBe("10 days left");

    const neutral = maturityLabel(addDaysToISO(todayISO(), 60));
    expect(neutral.tone).toBe("neutral");
    expect(neutral.label).toBe("60 days left");
  });
});

describe("effective FDR status", () => {
  it("derives ACTIVE, EXPIRING_SOON and MATURED from dates", () => {
    expect(
      getEffectiveFdrStatus({
        status: "ACTIVE",
        maturityDate: addDaysToISO(todayISO(), 120),
      }),
    ).toBe("ACTIVE");
    expect(
      getEffectiveFdrStatus({
        status: "ACTIVE",
        maturityDate: addDaysToISO(todayISO(), 30),
      }),
    ).toBe("EXPIRING_SOON");
    expect(
      getEffectiveFdrStatus({
        status: "ACTIVE",
        maturityDate: addDaysToISO(todayISO(), -1),
      }),
    ).toBe("MATURED");
  });

  it("preserves workflow-controlled statuses", () => {
    for (const status of [
      "RELEASED",
      "DISCREPANCY_FLAGGED",
      "RELEASE_REQUESTED",
      "RENEWAL_PENDING",
    ] as const) {
      expect(
        getEffectiveFdrStatus({
          status,
          maturityDate: addDaysToISO(todayISO(), 10),
        }),
      ).toBe(status);
    }
  });
});

describe("CSV serialisation", () => {
  it("escapes quotes, commas and newlines", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape('Dr. "Rao"')).toBe('"Dr. ""Rao"""');
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });

  it("serialises rows with a header in the requested column order", () => {
    const csv = toCsv(
      [
        { id: "FDR-1", amount: 100 },
        { id: "FDR-2", amount: 200 },
      ],
      [
        { key: "id", header: "FDR Number" },
        { key: "amount", header: "Amount" },
      ],
    );
    expect(csv).toBe("FDR Number,Amount\r\nFDR-1,100\r\nFDR-2,200");
  });
});

describe("initials", () => {
  it("drops honorifics and keeps two initials", () => {
    expect(initials("Dr. Meera Krishnan")).toBe("MK");
    expect(initials("Prof. Anil Kumar Verma")).toBe("AK");
  });
});
