import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronRight,
  Database,
  FilePlus2,
  Landmark,
  SearchX,
} from "lucide-react";

import { FdrStatusBadge, type DisplayFdrStatus } from "@/components/fdr-status-badge";
import { PageHeader } from "@/components/page-header";
import { RepositoryFilters } from "@/components/repository/repository-filters";
import { VerificationBadge } from "@/components/verification-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { getRepositoryData } from "@/lib/queries";
import { getCurrentUser, isBureauUser } from "@/lib/session";
import {
  daysUntil,
  formatDate,
  formatINR,
  getEffectiveFdrStatus,
  maturityLabel,
  toNumber,
} from "@/lib/utils";
import { repositoryFilterSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "FDR repository" };

function param(
  value: string | string[] | undefined,
  fallback = "",
): string {
  return Array.isArray(value) ? (value[0] ?? fallback) : (value ?? fallback);
}

function displayStatus(row: {
  status: Parameters<typeof getEffectiveFdrStatus>[0]["status"];
  maturityDate: string;
  hasSuccessor?: boolean;
}): DisplayFdrStatus {
  if (row.hasSuccessor) return "RENEWED";
  return getEffectiveFdrStatus(row);
}

export default async function RepositoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const sp = await searchParams;
  const parsed = repositoryFilterSchema.safeParse({
    q: param(sp.q),
    status: param(sp.status),
    verification: param(sp.verification),
    state: param(sp.state),
    region: param(sp.region),
    page: param(sp.page, "1"),
  });
  const filters = parsed.success
    ? parsed.data
    : { q: "", status: undefined, verification: undefined, state: "", region: "", page: 1 };

  const data = await getRepositoryData(user, filters);
  const bureau = isBureauUser(user);

  const queryFor = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const values = {
      q: filters.q,
      status: filters.status ?? "",
      verification: filters.verification ?? "",
      state: filters.state,
      region: filters.region,
      page: String(filters.page),
      ...overrides,
    };
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    return `/repository${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const firstRow = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const lastRow = Math.min(data.page * data.pageSize, data.total);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="FDR register · Regulation Bureau"
        title={bureau ? "Security deposit repository" : "Your FDR register"}
        description={
          bureau
            ? "Search every FDR held on the AICTE register, monitor verification evidence, and open a record for scrutiny."
            : "Track the security deposit instruments held for your institution, including verification state and approaching maturities."
        }
        actions={
          user.role === "INSTITUTION_ADMIN" ? (
            <Button asChild size="sm">
              <Link href="/submit-fdr">
                <FilePlus2 className="h-4 w-4" aria-hidden />
                Submit new FDR
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href="/releases">
                Release pipeline
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="outline" className="border-navy-200 bg-navy-50 text-navy-800">
          <Database className="h-3 w-3" aria-hidden />
          {data.total} instrument{data.total === 1 ? "" : "s"}
        </Badge>
        {bureau ? (
          <span className="flex items-center gap-1">
            <Landmark className="h-3 w-3" aria-hidden />
            Bureau-wide view
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" aria-hidden />
            Scoped to {user.institutionName}
          </span>
        )}
        <span aria-hidden>·</span>
        <span>Derived maturity status recalculated daily</span>
      </div>

      <RepositoryFilters
        initial={{
          q: filters.q,
          status: filters.status ?? "",
          verification: filters.verification ?? "",
          state: filters.state,
          region: filters.region,
        }}
        states={data.states}
        regions={data.regions}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">FDR register</h2>
            <p className="text-[10.5px] text-muted-foreground">
              {data.total
                ? `Showing ${firstRow}–${lastRow} of ${data.total} records`
                : "No records match the current filters"}
            </p>
          </div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            High-density view · {data.pageSize} per page
          </p>
        </div>

        {data.rows.length ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Instrument</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Bank / branch</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Issue date</TableHead>
                <TableHead>Maturity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead className="pr-4 text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((fdr) => {
                const maturity = maturityLabel(fdr.maturityDate);
                const status = displayStatus(fdr);
                return (
                  <TableRow key={fdr.id} className="group">
                    <TableCell className="pl-4">
                      <Link
                        href={`/scrutiny/${fdr.id}`}
                        className="font-mono text-[11.5px] font-semibold text-navy-900 hover:underline"
                      >
                        {fdr.fdrNumber}
                      </Link>
                      <p className="mt-0.5 max-w-[150px] truncate text-[10px] text-muted-foreground">
                        {fdr.jointAccountHolder}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[220px] truncate text-[11.5px] font-medium">
                        {fdr.institutionName}
                      </p>
                      <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">
                        {fdr.institutionAicteId} · {fdr.institutionState}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[160px] truncate text-[11.5px]">{fdr.issuingBank}</p>
                      <p className="mt-0.5 max-w-[160px] truncate text-[9.5px] text-muted-foreground">
                        {fdr.branchName ?? "—"} · {fdr.ifscCode}
                      </p>
                    </TableCell>
                    <TableCell className="metric-number text-right text-[11.5px] font-semibold">
                      {formatINR(toNumber(fdr.depositAmount))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[10.5px] text-muted-foreground">
                      {formatDate(fdr.issueDate)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-[10.5px]">{formatDate(fdr.maturityDate)}</p>
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
                        {daysUntil(fdr.maturityDate) < 0 && fdr.status !== "RELEASED"
                          ? " · action due"
                          : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <FdrStatusBadge status={status} />
                    </TableCell>
                    <TableCell>
                      <VerificationBadge status={fdr.verificationStatus} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button asChild variant="ghost" size="icon-sm" aria-label={`Open ${fdr.fdrNumber}`}>
                        <Link href={`/scrutiny/${fdr.id}`}>
                          <ChevronRight className="h-4 w-4" aria-hidden />
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
              icon={SearchX}
              title="No instruments match these filters"
              description="Try a broader search term or clear one of the status, verification, state or region filters."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/repository">Reset the register</Link>
                </Button>
              }
            />
          </div>
        )}

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/70 px-4 py-3 sm:flex-row">
          <p className="text-[10.5px] text-muted-foreground">
            Page {data.page} of {data.pageCount} · {data.total} matching record
            {data.total === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              asChild={data.page > 1}
              variant="outline"
              size="sm"
              disabled={data.page <= 1}
            >
              {data.page > 1 ? (
                <Link href={queryFor({ page: data.page - 1 })}>
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  Previous
                </Link>
              ) : (
                <span>
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  Previous
                </span>
              )}
            </Button>
            <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-[10.5px] font-medium">
              {data.page} / {data.pageCount}
            </span>
            <Button
              asChild={data.page < data.pageCount}
              variant="outline"
              size="sm"
              disabled={data.page >= data.pageCount}
            >
              {data.page < data.pageCount ? (
                <Link href={queryFor({ page: data.page + 1 })}>
                  Next
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              ) : (
                <span>
                  Next
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
