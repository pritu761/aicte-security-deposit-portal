import { describe, expect, it } from "vitest";

import {
  addDaysToISO,
  todayISO,
} from "@/lib/utils";
import {
  auditFilterSchema,
  bankVerificationSchema,
  discrepancySchema,
  fdrSubmissionSchema,
  headDecisionSchema,
  releaseRequestSchema,
  repositoryFilterSchema,
} from "@/lib/validation";

const validFdr = {
  fdrNumber: "FDR-2026-118",
  issuingBank: "State Bank of India",
  branchName: "Bengaluru Main",
  ifscCode: "SBIN0001234",
  depositAmount: 5_000_000,
  issueDate: addDaysToISO(todayISO(), -30),
  maturityDate: addDaysToISO(todayISO(), 335),
  jointAccountHolder: "Regional Officer, AICTE",
  parentFdrId: "",
};

describe("fdrSubmissionSchema", () => {
  it("accepts a complete, valid instrument", () => {
    const result = fdrSubmissionSchema.safeParse(validFdr);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.depositAmount).toBe(5_000_000);
      expect(result.data.parentFdrId).toBeUndefined();
    }
  });

  it("coerces a numeric string deposit amount", () => {
    const result = fdrSubmissionSchema.safeParse({
      ...validFdr,
      depositAmount: "2500000",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.depositAmount).toBe(2_500_000);
  });

  it("rejects maturity on or before the issue date", () => {
    const result = fdrSubmissionSchema.safeParse({
      ...validFdr,
      maturityDate: validFdr.issueDate,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toContain(
        "maturityDate",
      );
    }
  });

  it("rejects a future issue date", () => {
    const result = fdrSubmissionSchema.safeParse({
      ...validFdr,
      issueDate: addDaysToISO(todayISO(), 1),
      maturityDate: addDaysToISO(todayISO(), 365),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a maturity date already in the past", () => {
    const result = fdrSubmissionSchema.safeParse({
      ...validFdr,
      issueDate: addDaysToISO(todayISO(), -30),
      maturityDate: addDaysToISO(todayISO(), -1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid IFSC codes and non-positive amounts", () => {
    expect(
      fdrSubmissionSchema.safeParse({ ...validFdr, ifscCode: "SBIN001234" }).success,
    ).toBe(false);
    expect(
      fdrSubmissionSchema.safeParse({ ...validFdr, ifscCode: "sbin0001234" }).success,
    ).toBe(false);
    expect(
      fdrSubmissionSchema.safeParse({ ...validFdr, depositAmount: 0 }).success,
    ).toBe(false);
    expect(
      fdrSubmissionSchema.safeParse({ ...validFdr, depositAmount: -10 }).success,
    ).toBe(false);
  });

  it("accepts a valid renewal parent UUID and rejects malformed ones", () => {
    const parentFdrId = "2b3c4d5e-6f70-4a8b-9c0d-1e2f3a4b5c6d";
    expect(
      fdrSubmissionSchema.safeParse({ ...validFdr, parentFdrId }).success,
    ).toBe(true);
    expect(
      fdrSubmissionSchema.safeParse({ ...validFdr, parentFdrId: "not-a-uuid" }).success,
    ).toBe(false);
  });
});

describe("workflow schemas", () => {
  const fdrId = "2b3c4d5e-6f70-4a8b-9c0d-1e2f3a4b5c6d";

  it("requires a bank confirmation reference of at least four characters", () => {
    expect(
      bankVerificationSchema.safeParse({ fdrId, bankConfirmationRef: "ABC" }).success,
    ).toBe(false);
    expect(
      bankVerificationSchema.safeParse({ fdrId, bankConfirmationRef: "BVS/SBI/2026/01" })
        .success,
    ).toBe(true);
  });

  it("forces a meaningful discrepancy remark", () => {
    expect(
      discrepancySchema.safeParse({ fdrId, remarks: "Too short" }).success,
    ).toBe(false);
    expect(
      discrepancySchema.safeParse({
        fdrId,
        remarks: "Amount on the bank letter differs from the declared deposit.",
      }).success,
    ).toBe(true);
  });

  it("requires a substantive release reason", () => {
    expect(
      releaseRequestSchema.safeParse({ fdrId, reason: "Close it" }).success,
    ).toBe(false);
    expect(
      releaseRequestSchema.safeParse({
        fdrId,
        reason: "The institution has closed the underlying programme and settled all dues.",
      }).success,
    ).toBe(true);
  });

  it("allows the Bureau Head to approve without a note but defaults it to empty", () => {
    const result = headDecisionSchema.safeParse({
      requestId: fdrId,
      decision: "approve",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBe("");
  });
});

describe("filter schemas", () => {
  it("treats empty repository enums as unset", () => {
    const result = repositoryFilterSchema.safeParse({
      q: "",
      status: "",
      verification: "",
      state: "",
      region: "",
      page: "2",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeUndefined();
      expect(result.data.verification).toBeUndefined();
      expect(result.data.page).toBe(2);
    }
  });

  it("applies audit defaults and rejects unknown enums", () => {
    const defaults = auditFilterSchema.safeParse({});
    expect(defaults.success).toBe(true);
    if (defaults.success) {
      expect(defaults.data.q).toBe("");
      expect(defaults.data.page).toBe(1);
    }
    expect(
      repositoryFilterSchema.safeParse({ status: "NOT_A_STATUS" }).success,
    ).toBe(false);
  });
});
