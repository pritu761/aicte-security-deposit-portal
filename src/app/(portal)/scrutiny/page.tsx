import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  ChevronRight,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  History,
  SearchCheck,
} from "lucide-react";

import { AccessDenied } from "@/components/access-denied";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getScrutinyQueueData } from "@/lib/queries";
import { getCurrentUser, isBureauUser } from "@/lib/session";
import { formatDate, formatINR, maturityLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Scrutiny queue" };

function queueAgeLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "1 day";
  if (days < 60) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  return `${years} yr${years === 1 ? "" : "s"}${remaining ? ` ${remaining} mo` : ""}`;
}

function priorityFor(days: number): { label: string; className: string } {
  if (days > 90) {
    return { label: "Priority", className: "border-rose-200 bg-rose-50 text-rose-800" };
  }
  if (days > 30) {
    return { label: "Aging", className: "border-amber-200 bg-amber-50 text-amber-900" };
  }
  return { label: "In review", className: "border-sky-200 bg-sky-50 text-sky-800" };
}

export default async function ScrutinyQueuePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  if (!isBureauUser(user)) {
    return (
      <AccessDenied
        user={user}
        title="The scrutiny queue is restricted"
        description="The verification queue is available to AICTE Scrutiny Officers and the Regulation Bureau Head. Institution administrators can follow their own records from the FDR repository."
        requiredRole="AICTE Scrutiny Officer or Regulation Bureau Head"
      />
    );
  }

  const data = await getScrutinyQueueData(user);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Regulation Bureau · Verification control"
        title="Scrutiny queue"
        description="Triage institution submissions, clear bank evidence, and resolve discrepancies before instruments reach maturity. Oldest files appear first."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/api/export/fdrs?verification=INSTITUTION_SUBMITTED&format=csv" prefetch={false}>
                <Download className="h-4 w-4" aria-hidden />
                Export queue
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/audit">
                <History className="h-4 w-4" aria-hidden />
                Audit trail
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="outline" className="border-navy-200 bg-navy-50 text-navy-800">
          <SearchCheck className="h-3 w-3" aria-hidden />
          {data.pendingCount} awaiting verification
        </Badge>
        <span className="flex items-center gap-1">
          <Building2 className="h-3 w-3" aria-hidden />
          Bureau-wide view
        </span>
        <span aria-hidden>·</span>
        <span>Evidence and outcome checks recorded in the audit trail</span>
      </div>

      <section
        aria-label="Scrutiny summary"
        className="stagger-cards grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        <StatCard
          label="Awaiting verification"
          value={data.pendingCount}
          subtext={
            data.pendingCount ? (
              <>
                Oldest {queueAgeLabel(data.oldestQueueDays)} · average{" "}
                {queueAgeLabel(data.averageQueueDays)}
              </>
            ) : (
              "No submissions awaiting verification"
            )
          }
          icon={SearchCheck}
          tone="info"
          badge={data.pendingOver90 ? `${data.pendingOver90} priority` : undefined}
          href="#awaiting-verification"
        />
        <StatCard
          label="Value under scrutiny"
          value={formatINR(data.pendingValue, { compact: true })}
          subtext={`${data.pendingCount} submission${data.pendingCount === 1 ? "" : "s"} awaiting a decision`}
          icon={Banknote}
          tone="neutral"
        />
        <StatCard
          label="Open discrepancies"
          value={data.discrepancyCount}
          subtext={`${formatINR(data.discrepancyValue, { compact: true })} held pending correction`}
          icon={AlertTriangle}
          tone="danger"
          pulse={data.discrepancyCount > 0}
          href="#discrepancy-watch"
        />
        <StatCard
          label="Evidence on file"
          value={data.evidenceOnFile}
          subtext={`${data.pendingEvidence} attached to pending submissions`}
          icon={FileText}
          tone="warning"
        />
        <StatCard
          label="Bank-confirmed"
          value={data.verifiedCount}
          subtext={`${formatINR(data.verifiedValue, { compact: true })} cleared through scrutiny`}
          icon={BadgeCheck}
          tone="success"
          href="/repository?verification=BANK_CONFIRMED"
        />
      </section>

      <Card id="awaiting-verification" className="scroll-mt-28 overflow-hidden">
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SearchCheck className="h-4 w-4 text-teal-700" aria-hidden />
              Awaiting verification
            </CardTitle>
            <CardDescription className="mt-1">
              Institution submissions with evidence on file, ordered by time in the queue.
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {data.pendingOver90 ? (
              <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-800">
                <Clock3 className="h-3 w-3" aria-hidden />
                {data.pendingOver90} over 90 days
              </Badge>
            ) : null}
            <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
              {data.pendingCount} pending
            </Badge>
          </div>
        </CardHeader>

        {data.pending.length ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Submission</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Filed / queue age</TableHead>
                <TableHead>Maturity</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="pr-4 text-right">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.pending.map((item) => {
                const maturity = maturityLabel(item.maturityDate);
                const priority = priorityFor(item.ageDays);
                const ageTone =
                  item.ageDays > 90
                    ? "text-rose-700"
                    : item.ageDays > 30
                      ? "text-amber-700"
                      : "text-muted-foreground";

                return (
                  <TableRow key={item.id} className="group">
                    <TableCell className="pl-4">
                      <Link
                        href={`/scrutiny/${item.id}`}
                        className="font-mono text-[11.5px] font-semibold text-navy-900 hover:underline"
                      >
                        {item.fdrNumber}
                      </Link>
                      <p className="mt-0.5 max-w-[170px] truncate text-[10px] text-muted-foreground">
                        {item.issuingBank}
                        {item.branchName ? ` · ${item.branchName}` : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[230px] truncate text-[11.5px] font-medium">
                        {item.institutionName}
                      </p>
                      <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">
                        {item.institutionAicteId} · {item.institutionState}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <FileCheck2
                          className={`h-3.5 w-3.5 ${item.evidenceCount ? "text-teal-600" : "text-muted-foreground"}`}
                          aria-hidden
                        />
                        {item.evidenceCount} document{item.evidenceCount === 1 ? "" : "s"}
                      </span>
                      <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                        {item.latestEvidenceAt
                          ? `Latest ${formatDate(item.latestEvidenceAt)}`
                          : "No evidence uploaded"}
                      </p>
                    </TableCell>
                    <TableCell className="metric-number text-right text-[11.5px] font-semibold">
                      {formatINR(item.depositAmount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-[10.5px]">{formatDate(item.createdAt)}</p>
                      <p className={`mt-0.5 text-[9.5px] font-medium ${ageTone}`}>
                        {queueAgeLabel(item.ageDays)} in queue
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-[10.5px]">{formatDate(item.maturityDate)}</p>
                      <p
                        className={`mt-0.5 text-[9.5px] font-medium ${
                          maturity.tone === "danger"
                            ? "text-rose-700"
                            : maturity.tone === "warning"
                              ? "text-amber-700"
                              : "text-muted-foreground"
                        }`}
                      >
                        {maturity.label}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] ${priority.className}`}>
                        {priority.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button asChild variant="ghost" size="sm" className="gap-1">
                        <Link
                          href={`/scrutiny/${item.id}`}
                          aria-label={`Review ${item.fdrNumber}`}
                        >
                          Review
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="p-4">
            <EmptyState
              icon={BadgeCheck}
              title="Queue is clear"
              description="Every institution submission has been verified or returned to the institution as a discrepancy."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/repository?verification=BANK_CONFIRMED">
                    Open verified register
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              }
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-4 py-3 text-[10.5px] text-muted-foreground">
          <span>
            {data.pendingCount
              ? `${data.pendingCount} awaiting verification · ${data.pendingEvidence} evidence file${data.pendingEvidence === 1 ? "" : "s"} on file · oldest ${queueAgeLabel(data.oldestQueueDays)}`
              : "No submissions awaiting verification"}
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href="/repository?verification=INSTITUTION_SUBMITTED">
              Open filtered register
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </Card>

      <section
        aria-label="Discrepancies and recent verifications"
        className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]"
      >
        <Card id="discrepancy-watch" className="scroll-mt-28">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-700" aria-hidden />
                Discrepancy watch
              </CardTitle>
              <CardDescription className="mt-1">
                Cases returned to institutions for correction. A fresh bank confirmation
                clears the flag.
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0 border-rose-200 bg-rose-50 text-rose-800">
              {data.discrepancyCount} open
            </Badge>
          </CardHeader>
          <CardContent>
            {data.discrepancies.length ? (
              <ul className="space-y-2.5">
                {data.discrepancies.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-rose-200/70 bg-rose-50/30 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/scrutiny/${item.id}`}
                          className="font-mono text-[11.5px] font-semibold text-navy-900 hover:underline"
                        >
                          {item.fdrNumber}
                        </Link>
                        <p className="mt-0.5 max-w-[300px] truncate text-[10px] text-muted-foreground">
                          {item.institutionName} · {item.institutionAicteId}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="metric-number text-[11px] font-semibold">
                          {formatINR(item.depositAmount, { compact: true })}
                        </p>
                        <p className="text-[9.5px] text-muted-foreground">
                          Last activity {formatDate(item.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-rose-950/80">
                      {item.scrutinyRemarks ?? "Scrutiny observations are recorded on the record."}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-[9.5px] text-muted-foreground">
                        <FileText className="h-3 w-3" aria-hidden />
                        {item.evidenceCount} document{item.evidenceCount === 1 ? "" : "s"} on file
                      </span>
                      <Link
                        href={`/scrutiny/${item.id}`}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                      >
                        Open record
                        <ArrowRight className="h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={BadgeCheck}
                title="No open discrepancies"
                description="Every submission currently on file matches its supporting bank evidence."
                compact
              />
            )}
          </CardContent>
          {data.discrepancyCount ? (
            <div className="border-t border-border/70 px-4 py-2.5">
              <Button asChild variant="ghost" size="sm" className="w-full justify-between">
                <Link href="/repository?verification=DISCREPANCY_FOUND">
                  View discrepancy register
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-700" aria-hidden />
                Recently verified
              </CardTitle>
              <CardDescription className="mt-1">
                Latest bank confirmations recorded by the scrutiny desk.
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0">
              {data.verifiedCount} total
            </Badge>
          </CardHeader>
          <CardContent>
            {data.recentlyVerified.length ? (
              <ul className="divide-y divide-border/60">
                {data.recentlyVerified.map((item) => (
                  <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/scrutiny/${item.id}`}
                          className="font-mono text-[11px] font-semibold text-navy-900 hover:underline"
                        >
                          {item.fdrNumber}
                        </Link>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {item.institutionName}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="metric-number text-[10.5px] font-semibold">
                          {formatINR(item.depositAmount, { compact: true })}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {formatDate(item.verifiedAt)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-[9.5px] text-muted-foreground">
                      <BadgeCheck className="h-3 w-3 text-emerald-600" aria-hidden />
                      {item.verifierName ?? "AICTE scrutiny"}
                      {item.bankConfirmationRef ? ` · ${item.bankConfirmationRef}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={BadgeCheck}
                title="No verifications yet"
                description="Completed bank confirmations will appear here."
                compact
              />
            )}
          </CardContent>
          <div className="border-t border-border/70 px-4 py-2.5">
            <Button asChild variant="ghost" size="sm" className="w-full justify-between">
              <Link href="/repository?verification=BANK_CONFIRMED">
                Open verified register
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
        </Card>
      </section>

      {!data.pending.length && !data.discrepancyCount ? (
        <Card className="border-emerald-200/80 bg-emerald-50/40">
          <CardContent className="flex flex-wrap items-center gap-3 p-4 text-[11.5px] text-emerald-950">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <BadgeCheck className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">No open scrutiny work</p>
              <p className="mt-0.5 text-emerald-900/75">
                The verification desk is current. New institution submissions will appear here
                automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
