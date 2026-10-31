import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CircleAlert,
  FilePlus2,
  GitBranch,
  Link2,
  RefreshCw,
  SearchCheck,
  TreePine,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { FdrStatusBadge } from "@/components/fdr-status-badge";
import { PageHeader } from "@/components/page-header";
import { ChainPathLabel, RenewalTreeNode } from "@/components/renewals/renewal-tree";
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
import { getRenewalsData } from "@/lib/queries";
import { getCurrentUser, isBureauUser } from "@/lib/session";
import { formatDate, formatINR, maturityLabel, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Renewals & succession" };

export default async function RenewalsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const data = await getRenewalsData(user);
  const bureau = isBureauUser(user);
  const canFile = user.role === "INSTITUTION_ADMIN";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="FDR lifecycle · Renewals & succession"
        title="Renewal lineage and succession"
        description={
          bureau
            ? "Trace every renewed, replaced or consolidated instrument across the bureau register. Parents remain visible for audit even after a successor is filed."
            : "Track which of your institution's deposits have been renewed, and file a successor instrument before a deposit matures."
        }
        actions={
          canFile ? (
            <Button asChild size="sm">
              <Link href="/submit-fdr">
                <FilePlus2 className="h-4 w-4" aria-hidden />
                File renewal
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/repository">
                <SearchCheck className="h-3.5 w-3.5" aria-hidden />
                Open repository
              </Link>
            </Button>
          )
        }
      />

      <section
        aria-label="Renewal summary"
        className="stagger-cards grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Renewal chains"
          value={data.summary.chains}
          subtext="Linked predecessor–successor families on the register"
          icon={TreePine}
          tone="info"
        />
        <StatCard
          label="Linked instruments"
          value={data.summary.nodes}
          subtext={`${data.summary.renewed} successor instrument${data.summary.renewed === 1 ? "" : "s"} recorded`}
          icon={Link2}
          tone="success"
        />
        <StatCard
          label="Awaiting renewal"
          value={data.summary.pending}
          subtext="Parent marked renewal-pending until the successor clears scrutiny"
          icon={RefreshCw}
          tone="warning"
        />
        <StatCard
          label="Matured, not renewed"
          value={data.summary.maturedWithoutRenewal}
          subtext="Past maturity without a successor or release"
          icon={CircleAlert}
          tone={data.summary.maturedWithoutRenewal ? "danger" : "neutral"}
          pulse={data.summary.maturedWithoutRenewal > 0}
        />
      </section>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-navy-700" aria-hidden />
              Succession chains
            </CardTitle>
            <CardDescription className="mt-1">
              Each chain follows the instrument from its origin through every renewal. Open any
              node to inspect the underlying evidence.
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0">
            {data.summary.chains} chain{data.summary.chains === 1 ? "" : "s"}
          </Badge>
        </CardHeader>
        <CardContent>
          {data.chains.length ? (
            <div className="grid items-start gap-3 xl:grid-cols-2">
              {data.chains.map((chain) => (
                <article
                  key={chain.fdr.id}
                  className="rounded-xl border border-border/80 bg-muted/15 p-3"
                >
                  <header className="mb-2 flex items-start justify-between gap-2 border-b border-border/60 pb-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Chain starting {formatDate(chain.fdr.issueDate)}
                      </p>
                      <ChainPathLabel chain={chain} />
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-teal-200 bg-teal-50 text-[9px] text-teal-800"
                    >
                      {chain.children.length + 1} instrument
                      {chain.children.length === 0 ? "" : "s"}
                    </Badge>
                  </header>
                  <ul className="space-y-0">
                    <RenewalTreeNode node={chain} institutionView={!bureau} />
                  </ul>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={TreePine}
              title="No renewal chains yet"
              description="When a new FDR is filed against an existing instrument, the succession chain will appear here with a full timeline."
              action={
                canFile ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/submit-fdr">
                      <FilePlus2 className="h-3.5 w-3.5" aria-hidden />
                      File a renewal
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-700" aria-hidden />
              Renewal window
            </CardTitle>
            <CardDescription className="mt-1">
              Instruments maturing within 180 days, or already matured, without a successor on
              record. Renewals may be filed inside this window.
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 border-amber-200 bg-amber-50 text-amber-900">
            {data.candidates.length} eligible
          </Badge>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {data.candidates.length ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-5">Instrument</TableHead>
                  {bureau ? <TableHead>Institution</TableHead> : null}
                  <TableHead>Bank</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Maturity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.candidates.map((fdr) => {
                  const maturity = maturityLabel(fdr.maturityDate);
                  return (
                    <TableRow key={fdr.id}>
                      <TableCell className="pl-5">
                        <Link
                          href={`/scrutiny/${fdr.id}`}
                          className="font-mono text-[11.5px] font-semibold text-navy-900 hover:underline"
                        >
                          {fdr.fdrNumber}
                        </Link>
                        <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                          Issued {formatDate(fdr.issueDate)}
                        </p>
                      </TableCell>
                      {bureau ? (
                        <TableCell>
                          <p className="max-w-[230px] truncate text-[11px]">{fdr.institutionName}</p>
                          <p className="font-mono text-[9.5px] text-muted-foreground">
                            {fdr.institutionAicteId}
                          </p>
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <p className="text-[11px]">{fdr.issuingBank}</p>
                        <p className="text-[9.5px] text-muted-foreground">{fdr.branchName ?? "—"}</p>
                      </TableCell>
                      <TableCell className="metric-number text-right text-[11.5px] font-semibold">
                        {formatINR(toNumber(fdr.depositAmount))}
                      </TableCell>
                      <TableCell>
                        <p className="text-[10.5px]">{formatDate(fdr.maturityDate)}</p>
                        <p
                          className={
                            maturity.tone === "danger"
                              ? "text-[9.5px] font-medium text-rose-700"
                              : maturity.tone === "warning"
                                ? "text-[9.5px] font-medium text-amber-700"
                                : "text-[9.5px] text-muted-foreground"
                          }
                        >
                          {maturity.label}
                        </p>
                      </TableCell>
                      <TableCell>
                        <FdrStatusBadge status={fdr.status} />
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        {canFile ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/submit-fdr?parent=${fdr.id}`}>
                              Renew
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            </Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/scrutiny/${fdr.id}`}>
                              Inspect
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-4">
              <EmptyState
                icon={CalendarClock}
                title="No instruments in the renewal window"
                description="All live deposits are more than 180 days from maturity or already linked to a successor."
                compact
              />
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-[10.5px] leading-relaxed text-muted-foreground">
        Renewal rule: a successor may reference a predecessor up to 180 days before maturity.
        Once the successor is filed, the parent is marked renewal-pending and cannot be released.
        Released instruments are never eligible as renewal parents.
      </p>
    </div>
  );
}
