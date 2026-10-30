import "server-only";

import type { AuditDetails } from "@/db/schema";
import { auditLogs } from "@/db/schema";
import { db, type PortalDatabase } from "@/db";

export type DbTransaction = Parameters<Parameters<PortalDatabase["transaction"]>[0]>[0];
export type DbExecutor = PortalDatabase | DbTransaction;

type AuditInput = {
  entityType: string;
  entityId: string;
  userId: string | null;
  action: string;
  details?: AuditDetails;
};

/**
 * Append an immutable audit entry. Always call this inside the same transaction
 * as the mutation so the trail cannot drift from the business record.
 */
export async function logAudit(executor: DbExecutor, input: AuditInput): Promise<void> {
  const writer = executor as PortalDatabase;
  await writer.insert(auditLogs).values({
    entityType: input.entityType,
    entityId: input.entityId,
    userId: input.userId,
    action: input.action,
    details: input.details ?? {},
  });
}

export async function logAuditOutsideTransaction(input: AuditInput): Promise<void> {
  await logAudit(db, input);
}

export function auditDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  extra: Record<string, unknown> = {},
): AuditDetails {
  return { before, after, ...extra };
}
