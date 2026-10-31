import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileWarning,
  GitBranch,
  History,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { FdrStatusBadge } from "@/components/fdr-status-badge";
import { PageHeader } from "@/components/page-header";
import { ScrutinyPanel } from "@/components/scrutiny/scrutiny-panel";
import { StatCard } from "@/components/stat-card";
import { VerificationBadge } from "@/components/verification-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import {
  AUDIT_ACTION_LABELS,
  DOCUMENT_TYPE_LABELS,
  RELEASE_STATUS_LABELS,
  RELEASE_STATUS_STYLES,
} from "@/lib/constants";
import { getFdrDetail, type FdrDetail } from "@/lib/queries";
import { getCurrentUser, isBureauUser } from "@/lib/session";
import {
  formatDate,
  formatDateTime,
  formatINR,
  maturityLabel,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Scrutiny record" };

type TimelineEntry = FdrDetail["timeline"][number];

function timelineTone(action: string): "success" | "danger" | "info" | "neutral" {
  if (action === "VERIFIED_BANK_CONFIRMED" || action === "RELEASE_APPROVED") return "success";
  if (action === "DISCREPANCY_FLAGGED" || action === "RELEASE_REJECTED") return "danger";
  if (action === "RELEASE_REQUESTED" || action === "RELEASE_RECOMMENDED") return "info";
  return "neutral";
}

const timelineDot: Record<ReturnType<typeof timelineTone>, string> = {
  success: "bg-emerald-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
  neutral: "bg-saffron-400",
};

function describe(entry: TimelineEntry): string | undefined {
  const details = (entry.details ?? {}) as Record<string, unknown>;
  const bits: string[] = [];
  if (typeof details.fdrNumber === "string") bits.push(details.fdrNumber);
  if (typeof details.remarks === "string" && details.remarks) bits.push(details.remarks);
  if (typeof details.reason === "string" && details.reason) bits.push(details.reason);
  if (typeof details.dispatchReference === "string" && details.dispatchReference) {
    bits.push(`Dispatch ${details.dispatchReference}`);
  }
  if (typeof details.fileName === "string") bits.push(details.fileName);
  if (typeof details.bankConfirmationRef === "string") bits.push(details.bankConfirmationRef);
  return bits.length ? bits.join(" · ") : undefined;
}

export default async function ScrutinyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const detail = await getFdrDetail(user, id);
  if (!detail) notFound();

  const { fdr } = detail;
  const maturity = maturityLabel(fdr.maturityDate);
  const confirmed = fdr.verificationStatus === "BANK_CONFIRMED";
  const released = fdr.status === "RELEASED";
  const latestRelease = detail.releaseRequests[0] ?? null;

  const lineageNodes = detail.parent ? [detail.parent, fdr] : [fdr];
  const lineageChildren = detail.children;

  return (
    <div className="space-y-5">
      <PageHeader
        backHref={isBureauUser(user) ? "/scrutiny" : "/repository"}
        backLabel={isBureauUser(user) ? "Back to scrutiny queue" : "Back to FDR repository"}
        eyebrow={`${detail.institution.name} · ${detail.institution.aicteId}`}
        title={fdr.fdrNumber}
        description={`${fdr.issuingBank}${fdr.branchName ? ` · ${fdr.branchName}` : ""} · ${fdr.ifscCode}`}
        actions={
          <>
            <FdrStatusBadge status={detail.effectiveStatus} />
            <VerificationBadge status={fdr.verificationStatus} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/repository?q=${encodeURIComponent(fdr.fdrNumber)}`}>
                <History className="h-3.5 w-3.5" aria-hidden />
                Register entry
              </Link>
            </Button>
          </>
        }
      />

      <section
        aria-label="Instrument summary"
        className="stagger-cards grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Deposit amount"
          value={formatINR(fdr.depositAmount)}
          subtext={`${formatINR(fdr.depositAmount, { compact: true })} principal`}
          icon={Banknote}
        />
        <StatCard
          label={maturity.days < 0 ? "Maturity (overdue)" : "Maturity"}
          value={formatDate(fdr.maturityDate)}
          subtext={maturity.label}
          icon={CalendarClock}
          tone={maturity.tone === "danger" ? "danger" : maturity.tone === "warning" ? "warning" : "neutral"}
          pulse={maturity.days < 0 && !released}
        />
        <StatCard
          label="Verification"
          value={confirmed ? "Bank-confirmed" : detail.fdr.verificationStatus === "DISCREPANCY_FOUND" ? "Discrepancy" : "Pending"}
          subtext={
            confirmed
              ? `Verified by ${detail.verifierName ?? "AICTE"} on ${formatDate(fdr.verifiedAt)}`
              : "Awaiting independent bank evidence"
          }
          icon={confirmed ? ShieldCheck : FileWarning}
          tone={confirmed ? "success" : detail.fdr.verificationStatus === "DISCREPANCY_FOUND" ? "danger" : "warning"}
        />
        <StatCard
          label="Release state"
          value={released ? "Released" : latestRelease ? RELEASE_STATUS_LABELS[latestRelease.status] : "Not requested"}
          subtext={
            released && latestRelease?.dispatchReference
              ? latestRelease.dispatchReference
              : latestRelease
                ? `Raised ${formatDate(latestRelease.createdAt)}`
                : "No release case on record"
          }
          icon={released ? BadgeCheck : LockKeyhole}
          tone={released ? "violet" : latestRelease ? "info" : "neutral"}
          href={latestRelease ? "/releases" : undefined}
        />
      </section>

      <ScrutinyPanel detail={detail} role={user.role} />

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-navy-700" aria-hidden />
                Renewal lineage
              </CardTitle>
              <CardDescription className="mt-1">
                Chain of instruments created when this FDR is renewed or replaced.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/renewals">Renewals register</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {lineageNodes.map((node, index) => (
                <li key={node.id} className="relative">
                  {index < lineageNodes.length - 1 ? (
                    <span
                      aria-hidden
                      className="absolute left-[19px] top-10 h-[calc(100%-4px)] w-px border-l border-dashed border-border"
                    />
                  ) : null}
                  <Link
                    href={`/scrutiny/${node.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/20 p-2.5 transition-colors hover:border-primary/30 hover:bg-muted/40"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        node.id === fdr.id
                          ? "bg-navy-900 text-white"
                          : "border border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {node.id === fdr.id ? (
                        <Landmark className="h-4 w-4" aria-hidden />
                      ) : (
                        <span className="text-[10px] font-bold">{index + 1}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11.5px] font-semibold text-navy-900">
                          {node.fdrNumber}
                        </span>
                        {node.id === fdr.id ? (
                          <Badge variant="outline" className="text-[9px]">
                            This record
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px]">
                            Parent
                          </Badge>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] text-muted-foreground">
                        {node.issuingBank} · {formatINR(node.depositAmount)} · matures{" "}
                        {formatDate(node.maturityDate)}
                      </span>
                    </span>
                    <FdrStatusBadge status={node.hasSuccessor ? "RENEWED" : node.status} />
                  </Link>
                </li>
              ))}
              {lineageChildren.map((child) => (
                <li key={child.id} className="relative pl-6">
                  <span
                    aria-hidden
                    className="absolute left-[19px] top-0 h-5 w-px border-l border-dashed border-border"
                  />
                  <Link
                    href={`/scrutiny/${child.id}`}
                    className="flex items-center gap-3 rounded-lg border border-sky-200/80 bg-sky-50/40 p-2.5 transition-colors hover:border-sky-300 hover:bg-sky-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800">
                      <GitBranch className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11.5px] font-semibold text-navy-900">
                          {child.fdrNumber}
                        </span>
                        <Badge variant="outline" className="border-sky-200 bg-sky-50 text-[9px] text-sky-800">
                          Successor
                        </Badge>
                      </span>
                      <span className="mt-0.5 block text-[10.5px] text-muted-foreground">
                        {child.issuingBank} · {formatINR(child.depositAmount)} · matures{" "}
                        {formatDate(child.maturityDate)}
                      </span>
                    </span>
                    <FdrStatusBadge status={child.status} />
                  </Link>
                </li>
              ))}
            </ol>
            {!detail.parent && !lineageChildren.length ? (
              <p className="mt-3 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-[10.5px] text-muted-foreground">
                This instrument is not linked to a renewal chain. If it is replaced, file the
                successor from the submission form with this FDR selected as parent.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-navy-700" aria-hidden />
              Institution &amp; custody
            </CardTitle>
            <CardDescription>Declared filing and custody details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-[11px]">
            {[
              ["Institution", detail.institution.name],
              ["AICTE ID", detail.institution.aicteId],
              ["Region / state", `${detail.institution.region} · ${detail.institution.state}`],
              ["Category", detail.institution.institutionType],
              ["Joint account holder", fdr.jointAccountHolder],
              ["Issuing branch", fdr.branchName ?? "—"],
              ["IFSC", fdr.ifscCode],
              ["Submitted by", detail.submitterName ?? "Institution administrator"],
              ["Filed on", formatDateTime(fdr.createdAt)],
              ["Last updated", formatDateTime(fdr.updatedAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-right font-medium text-foreground">{value}</span>
              </div>
            ))}
            <div className="rounded-md border border-border/70 bg-muted/20 p-2.5">
              <p className="data-label">Bank confirmation reference</p>
              <p className="mt-1 break-words font-mono text-[10px]">
                {fdr.bankConfirmationRef ?? "Not recorded"}
              </p>
            </div>
            {detail.documents.length ? (
              <div>
                <p className="data-label">Evidence on file</p>
                <ul className="mt-1.5 space-y-1">
                  {detail.documents.slice(0, 4).map((document) => (
                    <li key={document.id} className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-teal-600" aria-hidden />
                      <span className="truncate">{DOCUMENT_TYPE_LABELS[document.docType]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-violet-700" aria-hidden />
                Release history
              </CardTitle>
              <CardDescription className="mt-1">
                Authorisation cases raised against this instrument.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/releases">Open workflow</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {detail.releaseRequests.length ? (
              <ul className="space-y-2.5">
                {detail.releaseRequests.map((release) => (
                  <li key={release.id} className="rounded-lg border border-border/70 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline" className={RELEASE_STATUS_STYLES[release.status]}>
                        {RELEASE_STATUS_LABELS[release.status]}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTime(release.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      {release.reason}
                    </p>
                    {release.dispatchReference ? (
                      <p className="mt-1.5 rounded bg-emerald-50 px-2 py-1 font-mono text-[10px] text-emerald-900">
                        {release.dispatchReference}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      Raised by {release.requesterName ?? "Institution"}
                      {release.scrutinizerName ? ` · reviewed by ${release.scrutinizerName}` : ""}
                      {release.approverName ? ` · decided by ${release.approverName}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={BadgeCheck}
                title="No release requests"
                description="The institution has not raised a release or refund request for this FDR yet."
                compact
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-navy-700" aria-hidden />
              Record activity
            </CardTitle>
            <CardDescription>
              Every state change and document event recorded against this FDR.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detail.timeline.length ? (
              <ol className="relative max-h-[440px] space-y-3 overflow-y-auto border-l border-border/80 pl-4 pr-1">
                {detail.timeline.map((entry) => {
                  const tone = timelineTone(entry.action);
                  const summary = describe(entry);
                  return (
                    <li key={entry.id} className="relative">
                      <span
                        className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border-2 border-card ${timelineDot[tone]}`}
                        aria-hidden
                      />
                      <p className="text-[11.5px] font-medium leading-snug text-foreground">
                        {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                      </p>
                      {summary ? (
                        <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                          {summary}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-[9.5px] text-muted-foreground/80">
                        {entry.userName ?? "Portal system"} · {formatDateTime(entry.createdAt)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState
                icon={History}
                title="No activity recorded"
                description="Events will appear here as the record moves through scrutiny."
                compact
              />
            )}
            {user.role !== "INSTITUTION_ADMIN" ? (
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <Link href={`/audit?q=${encodeURIComponent(fdr.fdrNumber)}`}>
                  <History className="h-3.5 w-3.5" aria-hidden />
                  Open full audit trail
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {detail.fdr.scrutinyRemarks ? (
        <Card className="border-amber-200/80 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 text-amber-700" aria-hidden />
              Scrutiny observations on file
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-amber-950/90">
              {detail.fdr.scrutinyRemarks}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
