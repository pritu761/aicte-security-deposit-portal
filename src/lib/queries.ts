import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  auditLogs,
  fdrDocuments,
  fdrInstruments,
  institutions,
  releaseRequests,
  users,
  type BankVerifiedSnapshot,
  type FdrStatus,
  type ReleaseStatus,
  type UserRole,
  type VerificationStatus,
} from "@/db/schema";
import type { SessionUser } from "@/lib/session";
import { canViewAudit, isBureauUser } from "@/lib/session";
import {
  addDaysToISO,
  daysUntil,
  formatMonth,
  getEffectiveFdrStatus,
  monthKey,
  todayISO,
  toNumber,
} from "@/lib/utils";

const PAGE_SIZE = 15;
const AUDIT_PAGE_SIZE = 20;

export type FdrRow = {
  id: string;
  institutionId: string;
  fdrNumber: string;
  issuingBank: string;
  branchName: string | null;
  ifscCode: string;
  depositAmount: string;
  issueDate: string;
  maturityDate: string;
  jointAccountHolder: string;
  status: FdrStatus;
  verificationStatus: VerificationStatus;
  parentFdrId: string | null;
  scrutinyRemarks: string | null;
  bankVerifiedData: BankVerifiedSnapshot | null;
  bankConfirmationRef: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  institutionName: string;
  institutionAicteId: string;
  institutionRegion: string;
  institutionState: string;
  institutionType: string;
  /** Presentation flag: the instrument has been succeeded by a renewal. */
  hasSuccessor?: boolean;
};

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function mapFdr(row: {
  fdr: typeof fdrInstruments.$inferSelect;
  institution: typeof institutions.$inferSelect;
}): FdrRow {
  return {
    id: row.fdr.id,
    institutionId: row.fdr.institutionId,
    fdrNumber: row.fdr.fdrNumber,
    issuingBank: row.fdr.issuingBank,
    branchName: row.fdr.branchName,
    ifscCode: row.fdr.ifscCode,
    depositAmount: row.fdr.depositAmount,
    issueDate: row.fdr.issueDate,
    maturityDate: row.fdr.maturityDate,
    jointAccountHolder: row.fdr.jointAccountHolder,
    status: row.fdr.status,
    verificationStatus: row.fdr.verificationStatus,
    parentFdrId: row.fdr.parentFdrId,
    scrutinyRemarks: row.fdr.scrutinyRemarks,
    bankVerifiedData: row.fdr.bankVerifiedData ?? null,
    bankConfirmationRef: row.fdr.bankConfirmationRef,
    verifiedAt: iso(row.fdr.verifiedAt),
    createdAt: row.fdr.createdAt.toISOString(),
    updatedAt: row.fdr.updatedAt.toISOString(),
    institutionName: row.institution.name,
    institutionAicteId: row.institution.aicteId,
    institutionRegion: row.institution.region,
    institutionState: row.institution.state,
    institutionType: row.institution.institutionType,
  };
}

function institutionScope(user: SessionUser): SQL | undefined {
  if (user.role === "INSTITUTION_ADMIN") {
    return user.institutionId ? eq(fdrInstruments.institutionId, user.institutionId) : sql`false`;
  }
  return undefined;
}

async function allFdrs(user: SessionUser): Promise<FdrRow[]> {
  const rows = await db
    .select({ fdr: fdrInstruments, institution: institutions })
    .from(fdrInstruments)
    .innerJoin(institutions, eq(fdrInstruments.institutionId, institutions.id))
    .where(institutionScope(user))
    .orderBy(asc(fdrInstruments.maturityDate));
  return rows.map(mapFdr);
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData(user: SessionUser) {
  const fdrs = await allFdrs(user);
  const scope = institutionScope(user);

  const releaseRows = await db
    .select({ request: releaseRequests, fdr: fdrInstruments, institution: institutions })
    .from(releaseRequests)
    .innerJoin(fdrInstruments, eq(releaseRequests.fdrId, fdrInstruments.id))
    .innerJoin(institutions, eq(fdrInstruments.institutionId, institutions.id))
    .where(scope)
    .orderBy(desc(releaseRequests.createdAt));

  const parentIds = new Set(fdrs.map((fdr) => fdr.parentFdrId).filter(Boolean));
  const now = todayISO();

  const live = fdrs.filter((fdr) => fdr.status !== "RELEASED" && !parentIds.has(fdr.id));
  const released = fdrs.filter((fdr) => fdr.status === "RELEASED");
  const superseded = fdrs.filter((fdr) => parentIds.has(fdr.id));

  const withDerived = live.map((fdr) => ({
    ...fdr,
    effectiveStatus: getEffectiveFdrStatus(fdr),
    daysLeft: daysUntil(fdr.maturityDate, now),
    amount: toNumber(fdr.depositAmount),
  }));

  const totalValue = withDerived.reduce((sum, fdr) => sum + fdr.amount, 0);
  const active = withDerived.filter((fdr) => fdr.effectiveStatus === "ACTIVE");
  const expiring = withDerived.filter(
    (fdr) => fdr.daysLeft >= 0 && fdr.daysLeft <= 30 && fdr.status !== "RELEASE_REQUESTED",
  );
  const overdue = withDerived.filter(
    (fdr) =>
      fdr.daysLeft < 0 &&
      fdr.status !== "RELEASE_REQUESTED" &&
      fdr.status !== "RENEWAL_PENDING",
  );
  const pendingReleases = releaseRows.filter(
    (row) =>
      row.request.status === "PENDING_SCRUTINY" ||
      row.request.status === "RECOMMENDED_BY_OFFICER",
  );
  const approvedReleases = releaseRows.filter(
    (row) => row.request.status === "APPROVED_RELEASED",
  );
  const discrepancyCount = withDerived.filter(
    (fdr) => fdr.verificationStatus === "DISCREPANCY_FOUND",
  ).length;
  const pendingScrutiny = withDerived.filter(
    (fdr) => fdr.verificationStatus === "INSTITUTION_SUBMITTED",
  ).length;
  const bankConfirmed = withDerived.filter(
    (fdr) => fdr.verificationStatus === "BANK_CONFIRMED",
  ).length;
  const verifiedPct = withDerived.length
    ? Math.round((bankConfirmed / withDerived.length) * 100)
    : 0;

  const bankMap = new Map<string, { bank: string; value: number; count: number }>();
  for (const fdr of withDerived) {
    const current = bankMap.get(fdr.issuingBank) ?? {
      bank: fdr.issuingBank,
      value: 0,
      count: 0,
    };
    current.value += fdr.amount;
    current.count += 1;
    bankMap.set(fdr.issuingBank, current);
  }
  const bankWise = [...bankMap.values()].sort((a, b) => b.value - a.value);
  const topBanks = bankWise.slice(0, 6);
  const otherBanks = bankWise.slice(6);
  if (otherBanks.length) {
    topBanks.push({
      bank: "Other banks",
      value: otherBanks.reduce((sum, item) => sum + item.value, 0),
      count: otherBanks.reduce((sum, item) => sum + item.count, 0),
    });
  }

  const monthStart = `${now.slice(0, 7)}-01`;
  const timelineBuckets: { key: string; label: string; value: number; count: number }[] = [];
  if (overdue.length) {
    timelineBuckets.push({
      key: "overdue",
      label: "Overdue",
      value: overdue.reduce((sum, fdr) => sum + fdr.amount, 0),
      count: overdue.length,
    });
  }
  const cursor = new Date(`${monthStart}T00:00:00.000Z`);
  for (let index = 0; index < 8; index += 1) {
    const month = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + index, 1));
    const key = month.toISOString().slice(0, 7);
    const matching = withDerived.filter((fdr) => monthKey(fdr.maturityDate) === key);
    timelineBuckets.push({
      key,
      label: formatMonth(key),
      value: matching.reduce((sum, fdr) => sum + fdr.amount, 0),
      count: matching.length,
    });
  }

  const statusCounts = new Map<string, { key: string; count: number; value: number }>();
  for (const fdr of live) {
    const effective = getEffectiveFdrStatus(fdr);
    const entry = statusCounts.get(effective) ?? { key: effective, count: 0, value: 0 };
    entry.count += 1;
    entry.value += toNumber(fdr.depositAmount);
    statusCounts.set(effective, entry);
  }
  if (superseded.length) {
    statusCounts.set("RENEWED", {
      key: "RENEWED",
      count: superseded.length,
      value: superseded.reduce((sum, fdr) => sum + toNumber(fdr.depositAmount), 0),
    });
  }
  if (released.length) {
    statusCounts.set("RELEASED", {
      key: "RELEASED",
      count: released.length,
      value: released.reduce((sum, fdr) => sum + toNumber(fdr.depositAmount), 0),
    });
  }
  const statusDistribution = [...statusCounts.values()].sort((a, b) => b.count - a.count);

  const audit = await getRecentAudit(user, 8);

  const actionItems: {
    tone: "danger" | "warning" | "info";
    title: string;
    detail: string;
    count: number;
    href: string;
  }[] = [];
  if (overdue.length) {
    actionItems.push({
      tone: "danger",
      title: "Matured instruments need closure",
      detail: `${overdue.length} instrument${overdue.length === 1 ? "" : "s"} past maturity without renewal or release.`,
      count: overdue.length,
      href: "/repository?status=MATURED",
    });
  }
  if (expiring.length) {
    actionItems.push({
      tone: "warning",
      title: "Maturity within 30 days",
      detail: "Confirm renewal or release instructions before the due date.",
      count: expiring.length,
      href: "/repository?status=EXPIRING_SOON",
    });
  }
  if (discrepancyCount) {
    actionItems.push({
      tone: "danger",
      title: "Open scrutiny discrepancies",
      detail: "Records flagged by the scrutiny desk require institution action.",
      count: discrepancyCount,
      href: "/repository?status=DISCREPANCY_FLAGGED",
    });
  }
  if (pendingScrutiny && isBureauUser(user)) {
    actionItems.push({
      tone: "info",
      title: "Submissions awaiting scrutiny",
      detail: "Verify documents or flag discrepancies to move cases forward.",
      count: pendingScrutiny,
      href: "/repository?verification=INSTITUTION_SUBMITTED",
    });
  }
  if (pendingReleases.length) {
    actionItems.push({
      tone: "info",
      title:
        user.role === "REGULATION_BUREAU_HEAD"
          ? "Release files awaiting your approval"
          : "Release requests in the pipeline",
      detail: "Review the eligibility and scrutiny recommendation.",
      count: pendingReleases.length,
      href: "/releases",
    });
  }

  const expiringSoonList = [...withDerived]
    .filter((fdr) => fdr.daysLeft >= 0 && fdr.daysLeft <= 90)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  const reviewQueue = [...withDerived]
    .filter((fdr) => fdr.verificationStatus === "INSTITUTION_SUBMITTED")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 5);

  const institutionRisk = new Map<
    string,
    {
      id: string;
      name: string;
      aicteId: string;
      state: string;
      value: number;
      count: number;
      expiring: number;
      overdue: number;
    }
  >();
  for (const fdr of withDerived) {
    const entry = institutionRisk.get(fdr.institutionId) ?? {
      id: fdr.institutionId,
      name: fdr.institutionName,
      aicteId: fdr.institutionAicteId,
      state: fdr.institutionState,
      value: 0,
      count: 0,
      expiring: 0,
      overdue: 0,
    };
    entry.value += fdr.amount;
    entry.count += 1;
    if (fdr.daysLeft >= 0 && fdr.daysLeft <= 30) entry.expiring += 1;
    if (fdr.daysLeft < 0) entry.overdue += 1;
    institutionRisk.set(fdr.institutionId, entry);
  }
  const institutionsAtRisk = [...institutionRisk.values()]
    .sort((a, b) => b.overdue * 3 + b.expiring - (a.overdue * 3 + a.expiring) || b.value - a.value)
    .slice(0, 5);

  const releasePipeline: Record<ReleaseStatus, number> = {
    PENDING_SCRUTINY: 0,
    RECOMMENDED_BY_OFFICER: 0,
    REJECTED: 0,
    APPROVED_RELEASED: 0,
  };
  for (const row of releaseRows) releasePipeline[row.request.status] += 1;

  return {
    generatedAt: new Date().toISOString(),
    today: now,
    totalFdrs: fdrs.length,
    liveCount: withDerived.length,
    releasedCount: released.length,
    renewedCount: superseded.length,
    totalValue,
    activeCount: active.length,
    activeValue: active.reduce((sum, fdr) => sum + fdr.amount, 0),
    expiringCount: expiring.length,
    expiringValue: expiring.reduce((sum, fdr) => sum + fdr.amount, 0),
    overdueCount: overdue.length,
    overdueValue: overdue.reduce((sum, fdr) => sum + fdr.amount, 0),
    pendingReleaseCount: pendingReleases.length,
    approvedReleaseCount: approvedReleases.length,
    pendingScrutinyCount: pendingScrutiny,
    discrepancyCount,
    bankConfirmedCount: bankConfirmed,
    verifiedPct,
    bankWise: topBanks,
    timeline: timelineBuckets,
    statusDistribution,
    actionItems,
    expiringSoon: expiringSoonList.map((fdr) => ({
      id: fdr.id,
      fdrNumber: fdr.fdrNumber,
      institutionName: fdr.institutionName,
      issuingBank: fdr.issuingBank,
      amount: fdr.amount,
      maturityDate: fdr.maturityDate,
      daysLeft: fdr.daysLeft,
      status: fdr.effectiveStatus,
      verificationStatus: fdr.verificationStatus,
    })),
    reviewQueue: reviewQueue.map((fdr) => ({
      id: fdr.id,
      fdrNumber: fdr.fdrNumber,
      institutionName: fdr.institutionName,
      amount: fdr.amount,
      createdAt: fdr.createdAt,
      verificationStatus: fdr.verificationStatus,
    })),
    institutionsAtRisk,
    releasePipeline,
    recentAudit: audit,
  };
}

/* -------------------------------------------------------------------------- */
/* Repository                                                                 */
/* -------------------------------------------------------------------------- */

export type RepositoryData = Awaited<ReturnType<typeof getRepositoryData>>;

export async function getRepositoryData(
  user: SessionUser,
  filters: {
    q: string;
    status?: FdrStatus;
    verification?: VerificationStatus;
    state: string;
    region: string;
    page: number;
  },
) {
  const conditions: SQL[] = [];
  const scope = institutionScope(user);
  if (scope) conditions.push(scope);
  if (filters.q) {
    const term = `%${filters.q}%`;
    const search = or(
      ilike(fdrInstruments.fdrNumber, term),
      ilike(fdrInstruments.issuingBank, term),
      ilike(fdrInstruments.ifscCode, term),
      ilike(institutions.name, term),
      ilike(institutions.aicteId, term),
    );
    if (search) conditions.push(search);
  }
  if (filters.status) conditions.push(eq(fdrInstruments.status, filters.status));
  if (filters.verification) {
    conditions.push(eq(fdrInstruments.verificationStatus, filters.verification));
  }
  if (filters.state) conditions.push(eq(institutions.state, filters.state));
  if (filters.region) conditions.push(eq(institutions.region, filters.region));
  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (filters.page - 1) * PAGE_SIZE;

  const [rows, totalRow] = await Promise.all([
    db
      .select({ fdr: fdrInstruments, institution: institutions })
      .from(fdrInstruments)
      .innerJoin(institutions, eq(fdrInstruments.institutionId, institutions.id))
      .where(where)
      .orderBy(asc(fdrInstruments.maturityDate), asc(fdrInstruments.fdrNumber))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ value: sql<number>`cast(count(*) as int)` })
      .from(fdrInstruments)
      .innerJoin(institutions, eq(fdrInstruments.institutionId, institutions.id))
      .where(where),
  ]);

  const total = Number(totalRow[0]?.value ?? 0);
  const ids = rows.map((row) => row.fdr.id);
  const successorRows = ids.length
    ? await db
        .select({ parentFdrId: fdrInstruments.parentFdrId })
        .from(fdrInstruments)
        .where(inArray(fdrInstruments.parentFdrId, ids))
    : [];
  const successors = new Set(
    successorRows.map((row) => row.parentFdrId).filter((value): value is string => Boolean(value)),
  );
  const options = await db
    .select({ state: institutions.state, region: institutions.region })
    .from(institutions)
    .orderBy(asc(institutions.state));

  return {
    rows: rows.map((row) => ({
      ...mapFdr(row),
      hasSuccessor: successors.has(row.fdr.id),
    })),
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    pageSize: PAGE_SIZE,
    states: [...new Set(options.map((row) => row.state))],
    regions: [...new Set(options.map((row) => row.region))],
  };
}

export async function getRepositoryExportRows(
  user: SessionUser,
  filters: {
    q: string;
    status?: FdrStatus;
    verification?: VerificationStatus;
    state: string;
    region: string;
  },
) {
  const conditions: SQL[] = [];
  const scope = institutionScope(user);
  if (scope) conditions.push(scope);
  if (filters.q) {
    const term = `%${filters.q}%`;
    const search = or(
      ilike(fdrInstruments.fdrNumber, term),
      ilike(fdrInstruments.issuingBank, term),
      ilike(institutions.name, term),
      ilike(institutions.aicteId, term),
    );
    if (search) conditions.push(search);
  }
  if (filters.status) conditions.push(eq(fdrInstruments.status, filters.status));
  if (filters.verification) {
    conditions.push(eq(fdrInstruments.verificationStatus, filters.verification));
  }
  if (filters.state) conditions.push(eq(institutions.state, filters.state));
  if (filters.region) conditions.push(eq(institutions.region, filters.region));

  const rows = await db
    .select({ fdr: fdrInstruments, institution: institutions })
    .from(fdrInstruments)
    .innerJoin(institutions, eq(fdrInstruments.institutionId, institutions.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(fdrInstruments.maturityDate))
    .limit(5000);

  const ids = rows.map((row) => row.fdr.id);
  const successorRows = ids.length
    ? await db
        .select({ parentFdrId: fdrInstruments.parentFdrId })
        .from(fdrInstruments)
        .where(inArray(fdrInstruments.parentFdrId, ids))
    : [];
  const successors = new Set(
    successorRows.map((row) => row.parentFdrId).filter((value): value is string => Boolean(value)),
  );

  return rows.map((row) => ({
    ...mapFdr(row),
    hasSuccessor: successors.has(row.fdr.id),
  }));
}

/* -------------------------------------------------------------------------- */
/* FDR detail / scrutiny desk                                                 */
/* -------------------------------------------------------------------------- */

export type FdrDetail = NonNullable<Awaited<ReturnType<typeof getFdrDetail>>>;

export async function getFdrDetail(user: SessionUser, fdrId: string) {
  const submitter = alias(users, "submitter");
  const verifier = alias(users, "verifier");
  const uploader = alias(users, "uploader");
  const requester = alias(users, "release_requester");
  const approver = alias(users, "release_approver");
  const scrutinizer = alias(users, "release_scrutinizer");

  const [row] = await db
    .select({
      fdr: fdrInstruments,
      institution: institutions,
      submitterName: submitter.name,
      verifierName: verifier.name,
    })
    .from(fdrInstruments)
    .innerJoin(institutions, eq(fdrInstruments.institutionId, institutions.id))
    .leftJoin(submitter, eq(fdrInstruments.submittedBy, submitter.id))
    .leftJoin(verifier, eq(fdrInstruments.verifiedBy, verifier.id))
    .where(eq(fdrInstruments.id, fdrId))
    .limit(1);

  if (!row) return null;
  if (user.role === "INSTITUTION_ADMIN" && row.fdr.institutionId !== user.institutionId) {
    return null;
  }

  const [docs, parentRow, childRows, releaseRows, auditRows] = await Promise.all([
    db
      .select({ document: fdrDocuments, uploadedByName: uploader.name })
      .from(fdrDocuments)
      .leftJoin(uploader, eq(fdrDocuments.uploadedBy, uploader.id))
      .where(eq(fdrDocuments.fdrId, fdrId))
      .orderBy(desc(fdrDocuments.uploadedAt)),
    row.fdr.parentFdrId
      ? db
          .select({ fdr: fdrInstruments, institution: institutions })
          .from(fdrInstruments)
          .innerJoin(institutions, eq(fdrInstruments.institutionId, institutions.id))
          .where(eq(fdrInstruments.id, row.fdr.parentFdrId))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({ fdr: fdrInstruments, institution: institutions })
      .from(fdrInstruments)
      .innerJoin(institutions, eq(fdrInstruments.institutionId, institutions.id))
      .where(eq(fdrInstruments.parentFdrId, fdrId))
      .orderBy(asc(fdrInstruments.issueDate)),
    db
      .select({
        request: releaseRequests,
        requesterName: requester.name,
        approverName: approver.name,
        scrutinizerName: scrutinizer.name,
      })
      .from(releaseRequests)
      .leftJoin(requester, eq(releaseRequests.requestedBy, requester.id))
      .leftJoin(approver, eq(releaseRequests.approvedBy, approver.id))
      .leftJoin(scrutinizer, eq(releaseRequests.scrutinizedBy, scrutinizer.id))
      .where(eq(releaseRequests.fdrId, fdrId))
      .orderBy(desc(releaseRequests.createdAt)),
    db
      .select({ log: auditLogs, userName: users.name, userRole: users.role })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.entityId, fdrId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(30),
  ]);

  const fdr = mapFdr({ fdr: row.fdr, institution: row.institution });
  const effectiveStatus = getEffectiveFdrStatus(fdr);

  return {
    fdr,
    effectiveStatus,
    daysLeft: daysUntil(fdr.maturityDate),
    submitterName: row.submitterName,
    verifierName: row.verifierName,
    institution: {
      id: row.institution.id,
      aicteId: row.institution.aicteId,
      name: row.institution.name,
      region: row.institution.region,
      state: row.institution.state,
      institutionType: row.institution.institutionType,
    },
    documents: docs.map((doc) => ({
      id: doc.document.id,
      docType: doc.document.docType,
      fileUrl: doc.document.fileUrl,
      fileName: doc.document.fileName,
      mimeType: doc.document.mimeType,
      sizeBytes: doc.document.sizeBytes,
      sha256: doc.document.sha256,
      uploadedAt: doc.document.uploadedAt.toISOString(),
      uploadedByName: doc.uploadedByName,
    })),
    parent: parentRow[0] ? mapFdr({ fdr: parentRow[0].fdr, institution: parentRow[0].institution }) : null,
    children: childRows.map((child) => mapFdr(child)),
    releaseRequests: releaseRows.map((release) => ({
      id: release.request.id,
      status: release.request.status,
      reason: release.request.reason,
      officerNotes: release.request.officerNotes,
      approvalNote: release.request.approvalNote,
      rejectionReason: release.request.rejectionReason,
      dispatchReference: release.request.dispatchReference,
      createdAt: release.request.createdAt.toISOString(),
      approvedAt: iso(release.request.approvedAt),
      requesterName: release.requesterName,
      approverName: release.approverName,
      scrutinizerName: release.scrutinizerName,
    })),
    timeline: auditRows.map((entry) => ({
      id: entry.log.id,
      action: entry.log.action,
      details: entry.log.details,
      createdAt: entry.log.createdAt.toISOString(),
      userName: entry.userName,
      userRole: entry.userRole,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Renewals                                                                   */
/* -------------------------------------------------------------------------- */

export type RenewalNode = {
  fdr: FdrRow;
  effectiveStatus: FdrStatus;
  daysLeft: number;
  hasChildren: boolean;
  children: RenewalNode[];
};

export type RenewalsData = Awaited<ReturnType<typeof getRenewalsData>>;

export async function getRenewalsData(user: SessionUser) {
  const fdrs = await allFdrs(user);
  const byId = new Map(fdrs.map((fdr) => [fdr.id, fdr]));
  const childrenByParent = new Map<string, FdrRow[]>();
  for (const fdr of fdrs) {
    if (fdr.parentFdrId && byId.has(fdr.parentFdrId)) {
      const list = childrenByParent.get(fdr.parentFdrId) ?? [];
      list.push(fdr);
      childrenByParent.set(fdr.parentFdrId, list);
    }
  }

  const buildNode = (fdr: FdrRow, depth = 0): RenewalNode => {
    const children = (childrenByParent.get(fdr.id) ?? [])
      .sort((a, b) => a.issueDate.localeCompare(b.issueDate))
      .map((child) => buildNode(child, depth + 1));
    return {
      fdr,
      effectiveStatus: getEffectiveFdrStatus(fdr),
      daysLeft: daysUntil(fdr.maturityDate),
      hasChildren: children.length > 0,
      children,
    };
  };

  const roots = fdrs
    .filter((fdr) => !fdr.parentFdrId || !byId.has(fdr.parentFdrId))
    .map((fdr) => buildNode(fdr));

  const chains = roots
    .filter((root) => root.hasChildren)
    .sort((a, b) => (b.children[0]?.fdr.issueDate ?? "").localeCompare(a.children[0]?.fdr.issueDate ?? ""));

  const candidates = fdrs
    .filter(
      (fdr) =>
        !fdr.parentFdrId &&
        fdr.status !== "RELEASED" &&
        (fdr.status === "MATURED" || fdr.status === "EXPIRING_SOON" || fdr.status === "ACTIVE") &&
        daysUntil(fdr.maturityDate) <= 180 &&
        !childrenByParent.has(fdr.id),
    )
    .sort((a, b) => a.maturityDate.localeCompare(b.maturityDate));

  const pendingRoots = chains.filter((chain) => chain.fdr.status === "RENEWAL_PENDING");
  const allNodes = chains.flatMap(function flatten(node: RenewalNode): RenewalNode[] {
    return [node, ...node.children.flatMap(flatten)];
  });
  const renewedCount = new Set(
    chains.flatMap((chain) => chain.children.map((child) => child.fdr.id)),
  ).size;

  return {
    chains,
    candidates,
    summary: {
      chains: chains.length,
      nodes: allNodes.length,
      pending: pendingRoots.length,
      renewed: renewedCount,
      maturedWithoutRenewal: candidates.filter((fdr) => daysUntil(fdr.maturityDate) < 0).length,
    },
  };
}

/** Parent instruments that can be selected on the submission form. */
export async function getRenewalParentOptions(user: SessionUser) {
  const fdrs = await allFdrs(user);
  const parentIds = new Set(fdrs.map((fdr) => fdr.parentFdrId).filter(Boolean));
  return fdrs
    .filter(
      (fdr) =>
        fdr.status !== "RELEASED" && !parentIds.has(fdr.id),
    )
    .sort((a, b) => a.maturityDate.localeCompare(b.maturityDate))
    .map((fdr) => ({
      id: fdr.id,
      fdrNumber: fdr.fdrNumber,
      issuingBank: fdr.issuingBank,
      depositAmount: fdr.depositAmount,
      maturityDate: fdr.maturityDate,
      status: fdr.status,
      verificationStatus: fdr.verificationStatus,
      institutionName: fdr.institutionName,
    }));
}

/* -------------------------------------------------------------------------- */
/* Releases                                                                   */
/* -------------------------------------------------------------------------- */

export type ReleasesData = Awaited<ReturnType<typeof getReleasesData>>;

export async function getReleasesData(user: SessionUser) {
  const requester = alias(users, "requester");
  const approver = alias(users, "approver");
  const scrutinizer = alias(users, "scrutinizer");

  const conditions: SQL[] = [];
  if (user.role === "INSTITUTION_ADMIN") {
    conditions.push(
      user.institutionId ? eq(fdrInstruments.institutionId, user.institutionId) : sql`false`,
    );
  }

  const rows = await db
    .select({
      request: releaseRequests,
      fdr: fdrInstruments,
      institution: institutions,
      requesterName: requester.name,
      approverName: approver.name,
      scrutinizerName: scrutinizer.name,
    })
    .from(releaseRequests)
    .innerJoin(fdrInstruments, eq(releaseRequests.fdrId, fdrInstruments.id))
    .innerJoin(institutions, eq(fdrInstruments.institutionId, institutions.id))
    .leftJoin(requester, eq(releaseRequests.requestedBy, requester.id))
    .leftJoin(approver, eq(releaseRequests.approvedBy, approver.id))
    .leftJoin(scrutinizer, eq(releaseRequests.scrutinizedBy, scrutinizer.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(releaseRequests.createdAt));

  const summary: Record<ReleaseStatus, number> = {
    PENDING_SCRUTINY: 0,
    RECOMMENDED_BY_OFFICER: 0,
    REJECTED: 0,
    APPROVED_RELEASED: 0,
  };
  for (const row of rows) summary[row.request.status] += 1;

  let eligibleFdrs: FdrRow[] = [];
  if (user.role === "INSTITUTION_ADMIN") {
    const all = await allFdrs(user);
    const activeRequestIds = new Set(
      rows
        .filter(
          (row) =>
            row.request.status === "PENDING_SCRUTINY" ||
            row.request.status === "RECOMMENDED_BY_OFFICER",
        )
        .map((row) => row.request.fdrId),
    );
    const childParents = new Set(all.map((fdr) => fdr.parentFdrId).filter(Boolean));
    eligibleFdrs = all.filter(
      (fdr) =>
        fdr.verificationStatus === "BANK_CONFIRMED" &&
        fdr.status !== "RELEASED" &&
        !activeRequestIds.has(fdr.id) &&
        !childParents.has(fdr.id),
    );
  }

  return {
    rows: rows.map((row) => ({
      id: row.request.id,
      fdrId: row.request.fdrId,
      fdrNumber: row.fdr.fdrNumber,
      issuingBank: row.fdr.issuingBank,
      depositAmount: row.fdr.depositAmount,
      maturityDate: row.fdr.maturityDate,
      fdrStatus: row.fdr.status,
      verificationStatus: row.fdr.verificationStatus,
      institutionId: row.institution.id,
      institutionName: row.institution.name,
      institutionAicteId: row.institution.aicteId,
      state: row.institution.state,
      reason: row.request.reason,
      status: row.request.status,
      officerNotes: row.request.officerNotes,
      approvalNote: row.request.approvalNote,
      rejectionReason: row.request.rejectionReason,
      dispatchReference: row.request.dispatchReference,
      requesterName: row.requesterName,
      approverName: row.approverName,
      scrutinizerName: row.scrutinizerName,
      createdAt: row.request.createdAt.toISOString(),
      scrutinizedAt: iso(row.request.scrutinizedAt),
      approvedAt: iso(row.request.approvedAt),
    })),
    summary,
    eligibleFdrs,
  };
}

/* -------------------------------------------------------------------------- */
/* Audit trail                                                                */
/* -------------------------------------------------------------------------- */

export type AuditData = NonNullable<Awaited<ReturnType<typeof getAuditData>>>;

export async function getAuditData(
  user: SessionUser,
  filters: { q: string; action: string; entityType: string; userId: string; page: number },
) {
  if (!canViewAudit(user)) return null;

  const conditions: SQL[] = [];
  if (filters.q) {
    const term = `%${filters.q}%`;
    const search = or(
      ilike(auditLogs.action, term),
      ilike(auditLogs.entityType, term),
      ilike(users.name, term),
      sql`${auditLogs.details}::text ilike ${term}`,
    );
    if (search) conditions.push(search);
  }
  if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
  if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (filters.page - 1) * AUDIT_PAGE_SIZE;

  const [rows, totalRow, actions, actors, totals] = await Promise.all([
    db
      .select({ log: auditLogs, userName: users.name, userRole: users.role })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(AUDIT_PAGE_SIZE)
      .offset(offset),
    db
      .select({ value: sql<number>`cast(count(*) as int)` })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where),
    db.selectDistinct({ action: auditLogs.action }).from(auditLogs).orderBy(asc(auditLogs.action)),
    db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .orderBy(asc(users.name)),
    db
      .select({
        total: sql<number>`cast(count(*) as int)`,
        actors: sql<number>`cast(count(distinct ${auditLogs.userId}) as int)`,
      })
      .from(auditLogs),
  ]);

  const total = Number(totalRow[0]?.value ?? 0);
  return {
    rows: rows.map((row) => ({
      id: row.log.id,
      entityType: row.log.entityType,
      entityId: row.log.entityId,
      action: row.log.action,
      details: row.log.details,
      createdAt: row.log.createdAt.toISOString(),
      userId: row.log.userId,
      userName: row.userName ?? "System",
      userRole: (row.userRole ?? null) as UserRole | null,
    })),
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
    pageSize: AUDIT_PAGE_SIZE,
    actionOptions: actions.map((row) => row.action),
    actorOptions: actors,
    summary: {
      total: Number(totals[0]?.total ?? 0),
      actors: Number(totals[0]?.actors ?? 0),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Recent activity / header notifications                                     */
/* -------------------------------------------------------------------------- */

export type RecentAuditItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  userName: string | null;
  userRole: UserRole | null;
  summary: string;
};

export async function getRecentAudit(user: SessionUser, limit = 6): Promise<RecentAuditItem[]> {
  let where: SQL | undefined;
  if (user.role === "INSTITUTION_ADMIN") {
    const own = await db
      .select({ id: fdrInstruments.id })
      .from(fdrInstruments)
      .where(eq(fdrInstruments.institutionId, user.institutionId ?? ""));
    const releaseIds = await db
      .select({ id: releaseRequests.id })
      .from(releaseRequests)
      .innerJoin(fdrInstruments, eq(releaseRequests.fdrId, fdrInstruments.id))
      .where(eq(fdrInstruments.institutionId, user.institutionId ?? ""));
    const ids = [...own.map((row) => row.id), ...releaseIds.map((row) => row.id)];
    if (!ids.length) return [];
    where = inArray(auditLogs.entityId, ids);
  }

  const rows = await db
    .select({ log: auditLogs, userName: users.name, userRole: users.role })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  const { AUDIT_ACTION_LABELS } = await import("@/lib/constants");
  return rows.map((row) => ({
    id: row.log.id,
    action: row.log.action,
    entityType: row.log.entityType,
    entityId: row.log.entityId,
    createdAt: row.log.createdAt.toISOString(),
    userName: row.userName,
    userRole: row.userRole,
    summary:
      AUDIT_ACTION_LABELS[row.log.action] ??
      row.log.action.replaceAll("_", " ").toLowerCase(),
  }));
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                       */
/* -------------------------------------------------------------------------- */

export async function getInstitutionCount(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(institutions);
  return Number(row?.value ?? 0);
}

export async function getRoleCounts() {
  const rows = await db
    .select({ role: users.role, value: count() })
    .from(users)
    .where(eq(users.isActive, true))
    .groupBy(users.role);
  return rows;
}

export async function getUnreadCount(_user: SessionUser): Promise<number> {
  const [row] = await db.select({ value: count() }).from(auditLogs);
  return Math.min(Number(row?.value ?? 0), 99);
}

export async function getExpiringForWindow(
  user: SessionUser,
  days = 30,
): Promise<FdrRow[]> {
  const fdrs = await allFdrs(user);
  const end = addDaysToISO(todayISO(), days);
  return fdrs.filter(
    (fdr) =>
      fdr.status !== "RELEASED" &&
      fdr.maturityDate >= todayISO() &&
      fdr.maturityDate <= end,
  );
}
