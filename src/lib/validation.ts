import { z } from "zod";

import { todayISO } from "@/lib/utils";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .max(200, "Email address is too long.")
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(200, "Password is too long."),
});

export const fdrSubmissionSchema = z
  .object({
    fdrNumber: z
      .string()
      .trim()
      .min(3, "FDR number must be at least 3 characters.")
      .max(80, "FDR number is too long.")
      .regex(/^[A-Za-z0-9][A-Za-z0-9/_. -]*$/, "Use letters, numbers, slashes, hyphens or underscores."),
    issuingBank: z.string().trim().min(2, "Select the issuing bank.").max(160),
    branchName: z.string().trim().min(2, "Enter the issuing branch.").max(160),
    ifscCode: z
      .string()
      .trim()
      .regex(ifscRegex, "Enter a valid 11-character IFSC code (e.g. SBIN0001234)."),
    depositAmount: z.coerce
      .number({ error: "Enter a valid deposit amount." })
      .positive("Deposit amount must be greater than zero.")
      .max(100_00_00_000, "Amount exceeds the portal limit."),
    issueDate: z.string().regex(isoDateRegex, "Select a valid issue date."),
    maturityDate: z.string().regex(isoDateRegex, "Select a valid maturity date."),
    jointAccountHolder: z
      .string()
      .trim()
      .min(2, "Enter the joint account holder.")
      .max(160)
      .default("Regional Officer, AICTE"),
    parentFdrId: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? undefined : value),
      z.string().regex(uuidRegex, "Select a valid parent FDR.").optional(),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.maturityDate <= data.issueDate) {
      ctx.addIssue({
        code: "custom",
        path: ["maturityDate"],
        message: "Maturity date must be after the issue date.",
      });
    }
    if (data.issueDate > todayISO()) {
      ctx.addIssue({
        code: "custom",
        path: ["issueDate"],
        message: "Issue date cannot be in the future.",
      });
    }
    if (data.maturityDate < todayISO()) {
      ctx.addIssue({
        code: "custom",
        path: ["maturityDate"],
        message: "Maturity date cannot be in the past for a new submission.",
      });
    }
  });

export type FdrSubmissionInput = z.infer<typeof fdrSubmissionSchema>;

export const bankVerificationSchema = z.object({
  fdrId: z.string().regex(uuidRegex),
  bankConfirmationRef: z
    .string()
    .trim()
    .min(4, "Enter the bank confirmation reference.")
    .max(120, "Reference is too long."),
  remarks: z.string().trim().max(3000).optional().default(""),
});

export const discrepancySchema = z.object({
  fdrId: z.string().regex(uuidRegex),
  remarks: z
    .string()
    .trim()
    .min(10, "Describe the discrepancy in at least 10 characters.")
    .max(3000, "Remarks are too long."),
});

export const scrutinyNoteSchema = z.object({
  fdrId: z.string().regex(uuidRegex),
  remarks: z.string().trim().min(5, "Enter a scrutiny observation.").max(3000),
});

export const releaseRequestSchema = z.object({
  fdrId: z.string().regex(uuidRegex, "Select an eligible FDR."),
  reason: z
    .string()
    .trim()
    .min(10, "Provide the reason for release (at least 10 characters).")
    .max(2000, "Reason is too long."),
});

export const officerReviewSchema = z.object({
  requestId: z.string().regex(uuidRegex),
  decision: z.enum(["recommend", "reject"]),
  notes: z.string().trim().min(10, "Record your scrutiny notes (at least 10 characters).").max(3000),
});

export const headDecisionSchema = z.object({
  requestId: z.string().regex(uuidRegex),
  decision: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(3000).optional().default(""),
});

export const uploadDocumentSchema = z.object({
  fdrId: z.string().regex(uuidRegex),
  docType: z.enum(["ORIGINAL_FDR_SCAN", "BANK_CONFIRMATION_LETTER", "DISCHARGE_VOUCHER"]),
});

export const repositoryFilterSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  status: z
    .enum([
      "ACTIVE",
      "EXPIRING_SOON",
      "MATURED",
      "RENEWAL_PENDING",
      "RELEASE_REQUESTED",
      "RELEASED",
      "DISCREPANCY_FLAGGED",
    ])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  verification: z
    .enum(["INSTITUTION_SUBMITTED", "BANK_CONFIRMED", "DISCREPANCY_FOUND"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  state: z.string().trim().max(80).optional().default(""),
  region: z.string().trim().max(80).optional().default(""),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
});

export const auditFilterSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  action: z.string().trim().max(80).optional().default(""),
  entityType: z.string().trim().max(60).optional().default(""),
  userId: z.string().trim().max(64).optional().default(""),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
});

/* -------------------------------------------------------------------------- */
/* Upload validation                                                          */
/* -------------------------------------------------------------------------- */

export const ACCEPTED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function validateUpload(file: File | null, { required = false } = {}): string | null {
  if (!file || file.size === 0) {
    return required ? "Upload the original FDR scan (PDF, PNG or JPEG)." : null;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Each document must be 10 MB or smaller.";
  }
  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return "Only PDF, PNG or JPEG files are accepted.";
  }
  return null;
}

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  data?: Record<string, unknown>;
};

export class ActionError extends Error {
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ActionError";
    this.fieldErrors = fieldErrors;
  }
}

export function flattenFieldErrors(error: z.ZodError): Record<string, string[]> {
  const flattened: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "form";
    flattened[key] = [...(flattened[key] ?? []), issue.message];
  }
  return flattened;
}

export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ActionError("Please correct the highlighted fields.", flattenFieldErrors(result.error));
  }
  return result.data;
}
