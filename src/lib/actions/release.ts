"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { fdrInstruments, releaseRequests } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { dispatchReference, statusFromMaturity } from "@/lib/fdr-status";
import {
  assertCanApprove,
  assertCanScrutinize,
  getCurrentUser,
} from "@/lib/session";
import {
  ActionError,
  headDecisionSchema,
  officerReviewSchema,
  parseOrThrow,
  releaseRequestSchema,
  type ActionState,
} from "@/lib/validation";
import { fieldString, success, toActionError } from "@/lib/actions/helpers";

function revalidateRelease() {
  revalidatePath("/dashboard");
  revalidatePath("/repository");
  revalidatePath("/releases");
  revalidatePath("/renewals");
  revalidatePath("/audit");
}

export async function requestReleaseAction(formData: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Your session expired. Refresh the page and try again.");
    if (user.role !== "INSTITUTION_ADMIN" || !user.institutionId) {
      throw new ActionError("Only the institution administrator can raise a release request.");
    }

    const data = parseOrThrow(releaseRequestSchema, {
      fdrId: fieldString(formData, "fdrId"),
      reason: fieldString(formData, "reason"),
    });

    const result = await db.transaction(async (tx) => {
      const [fdr] = await tx
        .select()
        .from(fdrInstruments)
        .where(
          and(
            eq(fdrInstruments.id, data.fdrId),
            eq(fdrInstruments.institutionId, user.institutionId as string),
          ),
        )
        .for("update")
        .limit(1);
      if (!fdr) throw new ActionError("The selected FDR was not found for your institution.");
      if (fdr.status === "RELEASED") throw new ActionError("This FDR has already been released.");
      if (fdr.verificationStatus !== "BANK_CONFIRMED") {
        throw new ActionError(
          "Only bank-confirmed FDRs are eligible for release. Complete scrutiny verification first.",
        );
      }
      if (fdr.status === "DISCREPANCY_FLAGGED") {
        throw new ActionError("Resolve the open discrepancy before requesting release.");
      }

      const [active] = await tx
        .select({ id: releaseRequests.id })
        .from(releaseRequests)
        .where(
          and(
            eq(releaseRequests.fdrId, fdr.id),
            sql`${releaseRequests.status} in ('PENDING_SCRUTINY', 'RECOMMENDED_BY_OFFICER')`,
          ),
        )
        .limit(1);
      if (active) throw new ActionError("An active release request already exists for this FDR.");

      const [successor] = await tx
        .select({ id: fdrInstruments.id })
        .from(fdrInstruments)
        .where(eq(fdrInstruments.parentFdrId, fdr.id))
        .limit(1);
      if (successor) {
        throw new ActionError("This FDR has been renewed and is no longer available for release.");
      }

      const now = new Date();
      const [created] = await tx
        .insert(releaseRequests)
        .values({
          fdrId: fdr.id,
          requestedBy: user.id,
          reason: data.reason,
          status: "PENDING_SCRUTINY",
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: releaseRequests.id });

      await tx
        .update(fdrInstruments)
        .set({ status: "RELEASE_REQUESTED", updatedAt: now })
        .where(eq(fdrInstruments.id, fdr.id));

      await logAudit(tx, {
        entityType: "release",
        entityId: created.id,
        userId: user.id,
        action: "RELEASE_REQUESTED",
        details: {
          fdrId: fdr.id,
          fdrNumber: fdr.fdrNumber,
          amount: fdr.depositAmount,
          reason: data.reason,
          after: { status: "PENDING_SCRUTINY", fdrStatus: "RELEASE_REQUESTED" },
        },
      });

      return created;
    });

    revalidateRelease();
    revalidatePath(`/scrutiny/${data.fdrId}`);
    return success("Release request submitted for scrutiny.", { id: result.id });
  } catch (error) {
    return toActionError(error, "requestRelease");
  }
}

export async function reviewReleaseAction(formData: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Your session expired. Refresh the page and try again.");
    assertCanScrutinize(user);

    const data = parseOrThrow(officerReviewSchema, {
      requestId: fieldString(formData, "requestId"),
      decision: fieldString(formData, "decision"),
      notes: fieldString(formData, "notes"),
    });

    const nextStatus = data.decision === "recommend" ? "RECOMMENDED_BY_OFFICER" : "REJECTED";

    await db.transaction(async (tx) => {
      const [row] = await tx
        .select({ request: releaseRequests, fdr: fdrInstruments })
        .from(releaseRequests)
        .innerJoin(fdrInstruments, eq(releaseRequests.fdrId, fdrInstruments.id))
        .where(eq(releaseRequests.id, data.requestId))
        .for("update")
        .limit(1);

      if (!row) throw new ActionError("Release request not found.");
      if (row.request.status !== "PENDING_SCRUTINY") {
        throw new ActionError("This request has already been reviewed.");
      }
      if (data.decision === "recommend" && row.fdr.verificationStatus !== "BANK_CONFIRMED") {
        throw new ActionError(
          "The FDR is not bank-confirmed or has an open discrepancy. It cannot be recommended for release.",
        );
      }

      const now = new Date();
      await tx
        .update(releaseRequests)
        .set({
          status: nextStatus,
          officerNotes: data.notes,
          rejectionReason: data.decision === "reject" ? data.notes : null,
          scrutinizedBy: user.id,
          scrutinizedAt: now,
          updatedAt: now,
        })
        .where(eq(releaseRequests.id, row.request.id));

      if (data.decision === "reject") {
        await tx
          .update(fdrInstruments)
          .set({
            status: statusFromMaturity(row.fdr.maturityDate),
            updatedAt: now,
          })
          .where(eq(fdrInstruments.id, row.fdr.id));
      }

      await logAudit(tx, {
        entityType: "release",
        entityId: row.request.id,
        userId: user.id,
        action: data.decision === "recommend" ? "RELEASE_RECOMMENDED" : "RELEASE_REJECTED",
        details: {
          fdrId: row.fdr.id,
          fdrNumber: row.fdr.fdrNumber,
          before: { status: row.request.status },
          after: { status: nextStatus },
          reason: data.notes,
        },
      });
    });

    revalidateRelease();
    return success(
      data.decision === "recommend"
        ? "Case recommended to the Regulation Bureau Head."
        : "Release request rejected and returned to the institution.",
    );
  } catch (error) {
    return toActionError(error, "reviewRelease");
  }
}

export async function decideReleaseAction(formData: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Your session expired. Refresh the page and try again.");
    assertCanApprove(user);

    const data = parseOrThrow(headDecisionSchema, {
      requestId: fieldString(formData, "requestId"),
      decision: fieldString(formData, "decision"),
      notes: fieldString(formData, "notes"),
    });
    if (data.decision === "reject" && !data.notes) {
      throw new ActionError("Record the reason for rejecting the release.", {
        notes: ["A rejection reason is required."],
      });
    }

    const outcome = await db.transaction(async (tx) => {
      const [row] = await tx
        .select({ request: releaseRequests, fdr: fdrInstruments })
        .from(releaseRequests)
        .innerJoin(fdrInstruments, eq(releaseRequests.fdrId, fdrInstruments.id))
        .where(eq(releaseRequests.id, data.requestId))
        .for("update")
        .limit(1);

      if (!row) throw new ActionError("Release request not found.");
      if (row.request.status !== "RECOMMENDED_BY_OFFICER") {
        throw new ActionError("Only a case recommended by the scrutiny officer can be decided by the Bureau Head.");
      }
      if (data.decision === "approve" && row.fdr.verificationStatus !== "BANK_CONFIRMED") {
        throw new ActionError(
          "This FDR is not currently bank-confirmed. The approval cannot be issued until verification is restored.",
        );
      }

      const now = new Date();
      if (data.decision === "reject") {
        await tx
          .update(releaseRequests)
          .set({
            status: "REJECTED",
            approvedBy: user.id,
            approvedAt: now,
            rejectionReason: data.notes,
            updatedAt: now,
          })
          .where(eq(releaseRequests.id, row.request.id));
        await tx
          .update(fdrInstruments)
          .set({ status: statusFromMaturity(row.fdr.maturityDate), updatedAt: now })
          .where(eq(fdrInstruments.id, row.fdr.id));

        await logAudit(tx, {
          entityType: "release",
          entityId: row.request.id,
          userId: user.id,
          action: "RELEASE_REJECTED",
          details: {
            fdrId: row.fdr.id,
            fdrNumber: row.fdr.fdrNumber,
            amount: row.fdr.depositAmount,
            before: { status: row.request.status },
            after: { status: "REJECTED" },
            reason: data.notes,
            decidedBy: "REGULATION_BUREAU_HEAD",
          },
        });
        return { rejected: true, dispatch: null as string | null };
      }

      const dispatch = dispatchReference(row.request.id, now);
      await tx
        .update(releaseRequests)
        .set({
          status: "APPROVED_RELEASED",
          approvedBy: user.id,
          approvedAt: now,
          approvalNote: data.notes || null,
          dispatchReference: dispatch,
          updatedAt: now,
        })
        .where(eq(releaseRequests.id, row.request.id));
      await tx
        .update(fdrInstruments)
        .set({ status: "RELEASED", updatedAt: now })
        .where(eq(fdrInstruments.id, row.fdr.id));

      await logAudit(tx, {
        entityType: "release",
        entityId: row.request.id,
        userId: user.id,
        action: "RELEASE_APPROVED",
        details: {
          fdrId: row.fdr.id,
          fdrNumber: row.fdr.fdrNumber,
          amount: row.fdr.depositAmount,
          before: { status: row.request.status, fdrStatus: row.fdr.status },
          after: { status: "APPROVED_RELEASED", fdrStatus: "RELEASED" },
          dispatchReference: dispatch,
          remarks: data.notes || null,
          decidedBy: "REGULATION_BUREAU_HEAD",
        },
      });

      return { rejected: false, dispatch };
    });

    revalidateRelease();
    if (outcome.rejected) {
      return success("Release request rejected. The institution has been notified through the status tracker.");
    }
    return success(`Release authorised. Dispatch reference ${outcome.dispatch}.`, {
      dispatchReference: outcome.dispatch,
    });
  } catch (error) {
    return toActionError(error, "decideRelease");
  }
}
