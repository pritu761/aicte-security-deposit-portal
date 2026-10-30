import type { FdrStatus } from "@/db/schema";
import { daysUntil } from "@/lib/utils";

/** Status derived purely from date, used at submission, verification and release decisions. */
export function statusFromMaturity(maturityDate: string): FdrStatus {
  const days = daysUntil(maturityDate);
  if (days < 0) return "MATURED";
  if (days <= 90) return "EXPIRING_SOON";
  return "ACTIVE";
}

export function isRenewalEligible(params: {
  status: FdrStatus;
  maturityDate: string;
  hasSuccessor: boolean;
}): boolean {
  if (params.hasSuccessor) return false;
  if (params.status === "RELEASED" || params.status === "RELEASE_REQUESTED") return false;
  if (params.status === "RENEWAL_PENDING") return false;
  if (params.status === "DISCREPANCY_FLAGGED") return false;
  return daysUntil(params.maturityDate) <= 180;
}

export function dispatchFinancialYear(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const start = month >= 3 ? year : year - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

export function dispatchReference(releaseId: string, date = new Date()): string {
  return `AICTE/REL/${dispatchFinancialYear(date)}/${releaseId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
