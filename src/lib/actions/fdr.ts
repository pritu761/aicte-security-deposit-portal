"use server";

import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  fdrDocuments,
  fdrInstruments,
  type BankVerifiedSnapshot,
  type FdrStatus,
} from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { statusFromMaturity } from "@/lib/fdr-status";
import { getCurrentUser, assertCanScrutinize } from "@/lib/session";
import { storeUploadedFile } from "@/lib/storage";
import { daysUntil, todayISO } from "@/lib/utils";
import {
  ActionError,
  bankVerificationSchema,
  discrepancySchema,
  fdrSubmissionSchema,
  parseOrThrow,
  scrutinyNoteSchema,
  uploadDocumentSchema,
  validateUpload,
  type ActionState,
} from "@/lib/validation";
import {
  appendRemark,
  fieldString,
  optionalFile,
  success,
  toActionError,
} from "@/lib/actions/helpers";

function revalidateFdr(fdrId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/repository");
  revalidatePath("/scrutiny");
  revalidatePath("/renewals");
  revalidatePath("/releases");
  revalidatePath("/audit");
  revalidatePath(`/scrutiny/${fdrId}`);
}

async function requireDocumentFile(formData: FormData, name = "document"): Promise<File> {
  const value = formData.get(name);
  if (!(value instanceof File) || value.size === 0) {
    throw new ActionError("Choose a PDF, PNG or JPEG document to upload.", {
      [name]: ["A document is required."],
    });
  }
  const error = validateUpload(value, { required: true });
  if (error) throw new ActionError(error, { [name]: [error] });
  return value;
}

/* -------------------------------------------------------------------------- */
/* Submission                                                                 */
/* -------------------------------------------------------------------------- */

export async function createFdrAction(formData: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Your session expired. Refresh the page and try again.");
    if (user.role !== "INSTITUTION_ADMIN") {
      throw new ActionError("Only an institution administrator can submit an FDR.");
    }
    if (!user.institutionId) {
      throw new ActionError("Your user account is not linked to an institution.");
    }

    const originalFile = await requireDocumentFile(formData, "originalFdr");
    const bankLetterFile = optionalFile(formData, "bankConfirmation");
    if (bankLetterFile) {
      const err = validateUpload(bankLetterFile);
      if (err) throw new ActionError(err, { bankConfirmation: [err] });
    }

    const payload = {
      fdrNumber: fieldString(formData, "fdrNumber"),
      issuingBank: fieldString(formData, "issuingBank"),
      branchName: fieldString(formData, "branchName"),
      ifscCode: fieldString(formData, "ifscCode").toUpperCase(),
      depositAmount: fieldString(formData, "depositAmount"),
      issueDate: fieldString(formData, "issueDate"),
      maturityDate: fieldString(formData, "maturityDate"),
      jointAccountHolder: fieldString(formData, "jointAccountHolder") || "Regional Officer, AICTE",
      parentFdrId: fieldString(formData, "parentFdrId"),
    };

    const data = parseOrThrow(fdrSubmissionSchema, payload);

    if (data.maturityDate < todayISO()) {
      throw new ActionError("The new FDR must have a maturity date on or after today.", {
        maturityDate: ["Maturity date cannot be in the past."],
      });
    }

    const duplicate = await db
      .select({ id: fdrInstruments.id })
      .from(fdrInstruments)
      .where(
        and(
          sql`upper(${fdrInstruments.fdrNumber}) = ${data.fdrNumber.toUpperCase()}`,
          sql`upper(${fdrInstruments.issuingBank}) = ${data.issuingBank.toUpperCase()}`,
        ),
      )
      .limit(1);
    if (duplicate.length) {
      throw new ActionError("This FDR number is already recorded for the selected bank.", {
        fdrNumber: ["An FDR with this number and bank already exists."],
      });
    }

    if (data.parentFdrId) {
      const [parent] = await db
        .select()
        .from(fdrInstruments)
        .where(
          and(
            eq(fdrInstruments.id, data.parentFdrId),
            eq(fdrInstruments.institutionId, user.institutionId),
          ),
        )
        .limit(1);
      if (!parent) {
        throw new ActionError("The selected parent FDR does not belong to your institution.", {
          parentFdrId: ["Select a valid parent FDR."],
        });
      }
      if (parent.status === "RELEASED") {
        throw new ActionError("A released FDR cannot be renewed.", {
          parentFdrId: ["This FDR has already been released."],
        });
      }
      if (parent.status === "RELEASE_REQUESTED") {
        throw new ActionError("A release request is already in progress for this FDR.", {
          parentFdrId: ["Close the release request before filing a renewal."],
        });
      }
      const [childCount] = await db
        .select({ value: sql<number>`cast(count(*) as int)` })
        .from(fdrInstruments)
        .where(eq(fdrInstruments.parentFdrId, parent.id));
      if (Number(childCount?.value ?? 0) > 0) {
        throw new ActionError("A renewal or replacement is already linked to this FDR.", {
          parentFdrId: ["This FDR already has a successor instrument."],
        });
      }
      if (daysUntil(parent.maturityDate) > 180) {
        throw new ActionError(
          "Renewal can be filed only within 180 days of the parent FDR's maturity date.",
          { parentFdrId: ["This FDR is not yet within the renewal window."] },
        );
      }
    }

    const storedOriginal = await storeUploadedFile(originalFile);
    const storedBankLetter = bankLetterFile
      ? await storeUploadedFile(bankLetterFile)
      : null;
    const fdrId = randomUUID();
    const initialStatus = statusFromMaturity(data.maturityDate);
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.insert(fdrInstruments).values({
        id: fdrId,
        institutionId: user.institutionId as string,
        fdrNumber: data.fdrNumber,
        issuingBank: data.issuingBank,
        branchName: data.branchName,
        ifscCode: data.ifscCode,
        depositAmount: data.depositAmount.toFixed(2),
        issueDate: data.issueDate,
        maturityDate: data.maturityDate,
        jointAccountHolder: data.jointAccountHolder,
        status: initialStatus,
        verificationStatus: "INSTITUTION_SUBMITTED",
        parentFdrId: data.parentFdrId ?? null,
        submittedBy: user.id,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(fdrDocuments).values({
        id: storedOriginal.storageKey,
        fdrId,
        docType: "ORIGINAL_FDR_SCAN",
        fileUrl: storedOriginal.fileUrl,
        fileName: storedOriginal.fileName,
        mimeType: storedOriginal.mimeType,
        sizeBytes: storedOriginal.sizeBytes,
        sha256: storedOriginal.sha256,
        storageKey: storedOriginal.storageKey,
        uploadedBy: user.id,
        uploadedAt: now,
      });

      if (storedBankLetter) {
        await tx.insert(fdrDocuments).values({
          id: storedBankLetter.storageKey,
          fdrId,
          docType: "BANK_CONFIRMATION_LETTER",
          fileUrl: storedBankLetter.fileUrl,
          fileName: storedBankLetter.fileName,
          mimeType: storedBankLetter.mimeType,
          sizeBytes: storedBankLetter.sizeBytes,
          sha256: storedBankLetter.sha256,
          storageKey: storedBankLetter.storageKey,
          uploadedBy: user.id,
          uploadedAt: now,
        });
      }

      if (data.parentFdrId) {
        await tx
          .update(fdrInstruments)
          .set({ status: "RENEWAL_PENDING", updatedAt: now })
          .where(eq(fdrInstruments.id, data.parentFdrId));
      }

      await logAudit(tx, {
        entityType: "fdr",
        entityId: fdrId,
        userId: user.id,
        action: data.parentFdrId ? "RENEWAL_SUBMITTED" : "SUBMITTED",
        details: {
          after: {
            fdrNumber: data.fdrNumber,
            issuingBank: data.issuingBank,
            depositAmount: data.depositAmount,
            issueDate: data.issueDate,
            maturityDate: data.maturityDate,
            status: initialStatus,
            parentFdrId: data.parentFdrId ?? null,
            documents: storedBankLetter ? 2 : 1,
          },
          source: "Institution submission",
        },
      });
    });

    revalidateFdr(fdrId);
    return success(
      data.parentFdrId
        ? "Renewal submitted successfully and linked to the parent FDR."
        : "FDR submitted successfully. The scrutiny desk has been notified.",
      { id: fdrId },
    );
  } catch (error) {
    return toActionError(error, "createFdr");
  }
}

/* -------------------------------------------------------------------------- */
/* Scrutiny actions                                                           */
/* -------------------------------------------------------------------------- */

export async function verifyFdrAction(formData: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Your session expired. Refresh the page and try again.");
    assertCanScrutinize(user);

    const fdrId = fieldString(formData, "fdrId");
    const data = parseOrThrow(bankVerificationSchema, {
      fdrId,
      bankConfirmationRef: fieldString(formData, "bankConfirmationRef"),
      remarks: fieldString(formData, "remarks"),
    });

    const [fdr] = await db
      .select()
      .from(fdrInstruments)
      .where(eq(fdrInstruments.id, data.fdrId))
      .limit(1);
    if (!fdr) throw new ActionError("FDR record not found.");
    if (fdr.status === "RELEASED") {
      throw new ActionError("A released FDR cannot be re-verified.");
    }

    const file = optionalFile(formData, "bankConfirmation");
    if (file) {
      const error = validateUpload(file);
      if (error) throw new ActionError(error, { bankConfirmation: [error] });
    }
    const storedLetter = file ? await storeUploadedFile(file) : null;

    const now = new Date();
    const lockedStatuses: FdrStatus[] = ["RELEASE_REQUESTED", "RENEWAL_PENDING"];
    const nextStatus = lockedStatuses.includes(fdr.status)
      ? fdr.status
      : statusFromMaturity(fdr.maturityDate);
    const snapshot: BankVerifiedSnapshot = {
      issuingBank: fdr.issuingBank,
      branchName: fdr.branchName ?? undefined,
      ifscCode: fdr.ifscCode,
      depositAmount: fdr.depositAmount,
      issueDate: fdr.issueDate,
      maturityDate: fdr.maturityDate,
      confirmationReference: data.bankConfirmationRef,
      capturedAt: now.toISOString(),
    };
    const nextRemarks = data.remarks
      ? appendRemark(fdr.scrutinyRemarks, data.remarks)
      : fdr.scrutinyRemarks;

    await db.transaction(async (tx) => {
      await tx
        .update(fdrInstruments)
        .set({
          verificationStatus: "BANK_CONFIRMED",
          status: nextStatus,
          bankVerifiedData: snapshot,
          bankConfirmationRef: data.bankConfirmationRef,
          scrutinyRemarks: nextRemarks,
          verifiedBy: user.id,
          verifiedAt: now,
          updatedAt: now,
        })
        .where(eq(fdrInstruments.id, fdr.id));

      if (storedLetter) {
        await tx.insert(fdrDocuments).values({
          id: storedLetter.storageKey,
          fdrId: fdr.id,
          docType: "BANK_CONFIRMATION_LETTER",
          fileUrl: storedLetter.fileUrl,
          fileName: storedLetter.fileName,
          mimeType: storedLetter.mimeType,
          sizeBytes: storedLetter.sizeBytes,
          sha256: storedLetter.sha256,
          storageKey: storedLetter.storageKey,
          uploadedBy: user.id,
          uploadedAt: now,
        });
      }

      if (fdr.parentFdrId) {
        const [parent] = await tx
          .select()
          .from(fdrInstruments)
          .where(eq(fdrInstruments.id, fdr.parentFdrId))
          .limit(1);
        if (parent && parent.status === "RENEWAL_PENDING") {
          await tx
            .update(fdrInstruments)
            .set({
              status: statusFromMaturity(parent.maturityDate),
              updatedAt: now,
            })
            .where(eq(fdrInstruments.id, parent.id));
        }
      }

      await logAudit(tx, {
        entityType: "fdr",
        entityId: fdr.id,
        userId: user.id,
        action: "VERIFIED_BANK_CONFIRMED",
        details: {
          fdrNumber: fdr.fdrNumber,
          before: {
            verificationStatus: fdr.verificationStatus,
            status: fdr.status,
          },
          after: {
            verificationStatus: "BANK_CONFIRMED",
            status: nextStatus,
            bankConfirmationRef: data.bankConfirmationRef,
            bankLetterAttached: Boolean(storedLetter),
          },
          remarks: data.remarks || null,
          source: "Authorised bank confirmation",
        },
      });
    });

    revalidateFdr(fdr.id);
    return success("FDR verified as bank-confirmed.");
  } catch (error) {
    return toActionError(error, "verifyFdr");
  }
}

export async function flagDiscrepancyAction(formData: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Your session expired. Refresh the page and try again.");
    assertCanScrutinize(user);

    const data = parseOrThrow(discrepancySchema, {
      fdrId: fieldString(formData, "fdrId"),
      remarks: fieldString(formData, "remarks"),
    });
    const [fdr] = await db
      .select()
      .from(fdrInstruments)
      .where(eq(fdrInstruments.id, data.fdrId))
      .limit(1);
    if (!fdr) throw new ActionError("FDR record not found.");
    if (fdr.status === "RELEASED") {
      throw new ActionError("A released FDR cannot be flagged for a discrepancy.");
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(fdrInstruments)
        .set({
          verificationStatus: "DISCREPANCY_FOUND",
          status: "DISCREPANCY_FLAGGED",
          scrutinyRemarks: appendRemark(fdr.scrutinyRemarks, data.remarks),
          updatedAt: now,
        })
        .where(eq(fdrInstruments.id, fdr.id));

      await logAudit(tx, {
        entityType: "fdr",
        entityId: fdr.id,
        userId: user.id,
        action: "DISCREPANCY_FLAGGED",
        details: {
          fdrNumber: fdr.fdrNumber,
          before: {
            verificationStatus: fdr.verificationStatus,
            status: fdr.status,
          },
          after: {
            verificationStatus: "DISCREPANCY_FOUND",
            status: "DISCREPANCY_FLAGGED",
          },
          remarks: data.remarks,
        },
      });
    });

    revalidateFdr(fdr.id);
    return success("Discrepancy recorded. The institution can now respond with corrected documents.");
  } catch (error) {
    return toActionError(error, "flagDiscrepancy");
  }
}

export async function recordScrutinyNoteAction(formData: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Your session expired. Refresh the page and try again.");
    assertCanScrutinize(user);

    const data = parseOrThrow(scrutinyNoteSchema, {
      fdrId: fieldString(formData, "fdrId"),
      remarks: fieldString(formData, "remarks"),
    });
    const [fdr] = await db
      .select()
      .from(fdrInstruments)
      .where(eq(fdrInstruments.id, data.fdrId))
      .limit(1);
    if (!fdr) throw new ActionError("FDR record not found.");

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(fdrInstruments)
        .set({
          scrutinyRemarks: appendRemark(fdr.scrutinyRemarks, data.remarks),
          updatedAt: now,
        })
        .where(eq(fdrInstruments.id, fdr.id));
      await logAudit(tx, {
        entityType: "fdr",
        entityId: fdr.id,
        userId: user.id,
        action: "SCRUTINY_REMARK_UPDATED",
        details: {
          fdrNumber: fdr.fdrNumber,
          before: { scrutinyRemarks: fdr.scrutinyRemarks },
          after: { scrutinyRemarks: appendRemark(fdr.scrutinyRemarks, data.remarks) },
        },
      });
    });

    revalidateFdr(fdr.id);
    return success("Scrutiny observation recorded.");
  } catch (error) {
    return toActionError(error, "recordScrutinyNote");
  }
}

/* -------------------------------------------------------------------------- */
/* Documents                                                                  */
/* -------------------------------------------------------------------------- */

export async function uploadDocumentAction(formData: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Your session expired. Refresh the page and try again.");
    if (user.role === "REGULATION_BUREAU_HEAD") {
      throw new ActionError("The Bureau Head has read-only access to scrutiny records.");
    }
    if (user.role !== "INSTITUTION_ADMIN" && user.role !== "AICTE_SCRUTINY_OFFICER") {
      throw new ActionError("You do not have permission to upload documents.");
    }

    const data = parseOrThrow(uploadDocumentSchema, {
      fdrId: fieldString(formData, "fdrId"),
      docType: fieldString(formData, "docType"),
    });
    const [fdr] = await db
      .select()
      .from(fdrInstruments)
      .where(eq(fdrInstruments.id, data.fdrId))
      .limit(1);
    if (!fdr) throw new ActionError("FDR record not found.");
    if (user.role === "INSTITUTION_ADMIN") {
      if (fdr.institutionId !== user.institutionId) {
        throw new ActionError("You can upload documents only for your institution.");
      }
      if (data.docType === "DISCHARGE_VOUCHER") {
        throw new ActionError("The discharge voucher is recorded by the AICTE scrutiny desk.");
      }
    }

    const file = await requireDocumentFile(formData);
    const stored = await storeUploadedFile(file);
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.insert(fdrDocuments).values({
        id: stored.storageKey,
        fdrId: fdr.id,
        docType: data.docType,
        fileUrl: stored.fileUrl,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
        storageKey: stored.storageKey,
        uploadedBy: user.id,
        uploadedAt: now,
      });
      await tx
        .update(fdrInstruments)
        .set({ updatedAt: now })
        .where(eq(fdrInstruments.id, fdr.id));
      await logAudit(tx, {
        entityType: "fdr",
        entityId: fdr.id,
        userId: user.id,
        action: "DOCUMENT_UPLOADED",
        details: {
          fdrNumber: fdr.fdrNumber,
          after: {
            docType: data.docType,
            fileName: stored.fileName,
            sha256: stored.sha256,
            sizeBytes: stored.sizeBytes,
          },
        },
      });
    });

    revalidateFdr(fdr.id);
    return success("Document uploaded securely.");
  } catch (error) {
    return toActionError(error, "uploadDocument");
  }
}
