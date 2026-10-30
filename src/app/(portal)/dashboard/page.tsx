import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  Download,
  FilePlus2,
  Landmark,
  SearchCheck,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { FdrStatusBadge } from "@/components/fdr-status-badge";
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
import { EmptyState } from "@/components/empty-state";
import { Progress } from "@/components/ui/progress";
import {
  BankDistributionChart,
  BankLegend,
  MaturityTimelineChart,
  StatusDonutChart,
} from "@/components/dashboard/charts";
import { AUDIT_ACTION_LABELS, ROLE_SHORT_LABELS } from "@/lib/constants";
import { getDashboardData } from "@/lib/queries";
import { getCurrentUser, isBureauUser } from "@/lib/session";
import {
  formatDate,
  formatDateTime,
  formatINR,
  maturityLabel,
  toNumber,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Executive dashboard" };

const actionTone = {
  danger: {
    card: "border-rose-200 bg-rose-50/70 hover:border-rose-300",
    icon: "bg-rose-100 text-rose-700",
    iconNode: ShieldAlert,
  },
  warning: {
    card: "border-amber-200 bg-amber-50/70 hover:border-amber-300",
    icon: "bg-amber-100 text-amber-800",
    iconNode: CalendarClock,
  },
  info: {
    card: "border-sky-200 bg-sky-50/70 hover:border-sky-300",
    icon: "bg-sky-100 text-sky-700",
    iconNode: SearchCheck,
  },
} as const;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const data = await getDashboardData(user);
  const bureau = isBureauUser(user);

  const totalCrore = (data.totalValue / 1_00_00_000).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const headline =
    user.role === "INSTITUTION_ADMIN"
      ? `Compliance overview for ${user.institutionName ?? "your institution"}`
      : "Security deposit portfolio across AICTE institutions";

  const description =
    user.role === "INSTITUTION_ADMIN"
      ? "Track deposit validity, respond to scrutiny observations, and file renewals or release requests before instruments mature."
      : user.role === "AICTE_SCRUTINY_OFFICER"
        ? "Triage new submissions, validate authorised bank evidence, and recommend eligible release files to the Bureau Head."
        : "Monitor bureau-wide exposure, maturity risk and the approval pipeline from a single executive view.";

  const pipelineTotal =
    data.releasePipeline.PENDING_SCRUTINY +
    data.releasePipeline.RECOMMENDED_BY_OFFICER +
    data.releasePipeline.APPROVED_RELEASED +
    data.releasePipeline.REJECTED;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${bureau ? "Bureau-wide portfolio" : "Institutional compliance"} · ${formatDate(data.today)}`}
        title={headline}
        description={description}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/api/export/fdrs?format=csv" prefetch={false}>
                <Download className="h-4 w-4" aria-hidden />
                Export portfolio
              </Link>
            </Button>
            {user.role === "INSTITUTION_ADMIN" ? (
              <Button asChild size="sm">
                <Link href="/submit-fdr">
                  <FilePlus2 className="h-4 w-4" aria-hidden />
                  Submit new FDR
                </Link>
              </Button>
            ) : user.role === "AICTE_SCRUTINY_OFFICER" ? (
              <Button asChild size="sm">
                <Link href="/repository?verification=INSTITUTION_SUBMITTED">
                  <SearchCheck className="h-4 w-4" aria-hidden />
                  Open scrutiny queue
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/releases">
                  <BadgeCheck className="h-4 w-4" aria-hidden />
                  Release approvals
                </Link>
              </Button>
            )}
          </>
        }
      />

      <section aria-label="Portfolio summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total deposit value"
          value={`₹${totalCrore} Cr`}
          subtext={
            <>
              Across{" "}
              <span className="font-semibold text-foreground">{data.liveCount}</span> live
              instruments · {data.totalFdrs} on register
            </>
          }
          icon={Banknote}
          badge="Net of released"
          href="/repository"
        />
        <StatCard
          label="Active FDRs"
          value={data.activeCount}
          subtext={
            <>
              {formatINR(data.activeValue, { compact: true })} valid beyond 90 days
            </>
          }
          icon={Landmark}
          tone="success"
          href="/repository?status=ACTIVE"
        />
        <StatCard
          label="Expiring in <30 days"
          value={data.expiringCount}
          subtext={
            <>
              {formatINR(data.expiringValue, { compact: true })} needs renewal or release action
            </>
          }
          icon={CalendarClock}
          tone="warning"
          badge="Monitor"
          href="/repository?status=EXPIRING_SOON"
        />
        <StatCard
          label="Overdue / matured"
          value={data.overdueCount}
          subtext={
            <>
              {formatINR(data.overdueValue, { compact: true })} past maturity without closure
            </>
          }
          icon={CircleAlert}
          tone="danger"
          pulse={data.overdueCount > 0}
          href="/repository?status=MATURED"
        />
        <StatCard
          label="Pending releases"
          value={data.pendingReleaseCount}
          subtext={
            <>
              {data.releasePipeline.PENDING_SCRUTINY} at scrutiny ·{" "}
              {data.releasePipeline.RECOMMENDED_BY_OFFICER} awaiting approval
            </>
          }
          icon={BadgeCheck}
          tone="violet"
          href="/releases"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3" aria-label="Portfolio analytics">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-navy-700" aria-hidden />
                Bank-wise distribution
              </CardTitle>
              <CardDescription className="mt-1">
                Live deposit value by issuing bank, ranked by exposure.
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0 text-muted-foreground">
              ₹ Crore
            </Badge>
          </CardHeader>
          <CardContent>
            <BankDistributionChart data={data.bankWise} />
            <BankLegend data={data.bankWise} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Portfolio composition</CardTitle>
            <CardDescription>
              Derived status of live instruments, including renewed parents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDonutChart data={data.statusDistribution} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3" aria-label="Maturity and action centre">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-teal-700" aria-hidden />
                Maturity timeline
              </CardTitle>
              <CardDescription className="mt-1">
                Deposit value falling due over the next eight months, with overdue exposure
                isolated.
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0 border-teal-200 bg-teal-50 text-teal-800">
              Next 8 months
            </Badge>
          </CardHeader>
          <CardContent>
            <MaturityTimelineChart data={data.timeline} />
            <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-600" aria-hidden />
              Values represent principal deposited, not accrued interest.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-saffron-600" aria-hidden />
              Action centre
            </CardTitle>
            <CardDescription>Items requiring a decision in your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.actionItems.length ? (
              data.actionItems.slice(0, 4).map((item) => {
                const style = actionTone[item.tone];
                const Icon = style.iconNode;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className={`group flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${style.card}`}
                  >
                    <span className={`mt-0.5 rounded-md p-1.5 ${style.icon}`}>
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[11.5px] font-semibold leading-snug text-foreground">
                          {item.title}
                        </span>
                        <span className="metric-number shrink-0 text-xs font-bold text-foreground">
                          {item.count}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[10.5px] leading-snug text-muted-foreground">
                        {item.detail}
                      </span>
                    </span>
                    <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                );
              })
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-center">
                <BadgeCheck className="mx-auto h-5 w-5 text-emerald-700" aria-hidden />
                <p className="mt-1.5 text-xs font-semibold text-emerald-900">No urgent actions</p>
                <p className="mt-0.5 text-[10.5px] text-emerald-800/80">
                  All instruments are within their monitoring window.
                </p>
              </div>
            )}

            <div className="mt-3 rounded-lg border border-border bg-muted/25 p-3">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                <span>Release pipeline</span>
                <span>{pipelineTotal} total</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {[
                  { key: "PENDING_SCRUTINY", label: "Pending scrutiny", color: "bg-amber-500" },
                  {
                    key: "RECOMMENDED_BY_OFFICER",
                    label: "Awaiting approval",
                    color: "bg-sky-600",
                  },
                  { key: "APPROVED_RELEASED", label: "Authorised", color: "bg-emerald-600" },
                  { key: "REJECTED", label: "Rejected", color: "bg-rose-500" },
                ].map((row) => {
                  const count = data.releasePipeline[row.key as keyof typeof data.releasePipeline];
                  const pct = pipelineTotal ? Math.round((count / pipelineTotal) * 100) : 0;
                  return (
                    <div key={row.key} className="flex items-center gap-2">
                      <span className="w-[92px] shrink-0 text-[9.5px] text-muted-foreground">
                        {row.label}
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/70">
                        <span
                          className={`block h-full rounded-full ${row.color}`}
                          style={{ width: `${Math.max(pct, count ? 4 : 0)}%` }}
                        />
                      </span>
                      <span className="w-4 text-right text-[10px] font-semibold tabular-nums">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3" aria-label="Upcoming maturities and activity">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Approaching maturity</CardTitle>
              <CardDescription className="mt-1">
                Instruments falling due in the next 90 days, earliest first.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href="/repository?status=EXPIRING_SOON">
                View all
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.expiringSoon.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/70 text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                      <th scope="col" className="py-2 pr-3 font-semibold">Instrument</th>
                      {bureau ? (
                        <th scope="col" className="hidden py-2 pr-3 font-semibold md:table-cell">
                          Institution
                        </th>
                      ) : null}
                      <th scope="col" className="py-2 pr-3 font-semibold">Maturity</th>
                      <th scope="col" className="py-2 pr-3 text-right font-semibold">Amount</th>
                      <th scope="col" className="py-2 pl-2 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expiringSoon.map((fdr) => {
                      const maturity = maturityLabel(fdr.maturityDate);
                      return (
                        <tr key={fdr.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5 pr-3">
                            <Link
                              href={`/scrutiny/${fdr.id}`}
                              className="font-medium text-navy-900 hover:underline"
                            >
                              {fdr.fdrNumber}
                            </Link>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {fdr.issuingBank}
                            </p>
                          </td>
                          {bureau ? (
                            <td className="hidden max-w-[190px] truncate py-2.5 pr-3 text-[11px] text-muted-foreground md:table-cell">
                              {fdr.institutionName}
                            </td>
                          ) : null}
                          <td className="py-2.5 pr-3">
                            <span className="block text-[11px]">{formatDate(fdr.maturityDate)}</span>
                            <span
                              className={`mt-0.5 block text-[10px] font-medium ${
                                maturity.tone === "danger"
                                  ? "text-rose-700"
                                  : maturity.tone === "warning"
                                    ? "text-amber-700"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {maturity.label}
                            </span>
                          </td>
                          <td className="metric-number py-2.5 pr-3 text-right text-[11px] font-medium">
                            {formatINR(toNumber(fdr.amount), { compact: true })}
                          </td>
                          <td className="py-2.5 pl-2 text-right">
                            <FdrStatusBadge status={fdr.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="No instruments maturing in 90 days"
                description="The next maturity window is clear. Continue monitoring renewal and release decisions."
                compact
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {bureau ? (
            <Card>
              <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Scrutiny queue</CardTitle>
                  <CardDescription className="mt-1">
                    Awaiting bank confirmation or discrepancy review.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0 border-sky-200 bg-sky-50 text-sky-800">
                  {data.pendingScrutinyCount} open
                </Badge>
              </CardHeader>
              <CardContent>
                {data.reviewQueue.length ? (
                  <ul className="space-y-1.5">
                    {data.reviewQueue.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/scrutiny/${item.id}`}
                          className="flex items-center justify-between gap-2 rounded-md border border-border/70 px-2.5 py-2 transition-colors hover:border-primary/30 hover:bg-muted/40"
                        >
                          <span className="min-w-0">
                            <span className="block text-[11.5px] font-medium text-navy-900">
                              {item.fdrNumber}
                            </span>
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {item.institutionName}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="metric-number block text-[11px] font-semibold">
                              {formatINR(toNumber(item.amount), { compact: true })}
                            </span>
                            <span className="block text-[9.5px] text-muted-foreground">
                              {formatDate(item.createdAt)}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={SearchCheck}
                    title="Queue is clear"
                    description="All submissions have been reviewed."
                    compact
                  />
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription className="mt-1">
                  Latest immutable events in your workspace.
                </CardDescription>
              </div>
              {bureau ? (
                <Button asChild variant="ghost" size="sm" className="shrink-0">
                  <Link href="/audit">Audit</Link>
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {data.recentAudit.length ? (
                <ol className="relative space-y-3 border-l border-border/80 pl-4">
                  {data.recentAudit.map((event) => (
                    <li key={event.id} className="relative">
                      <span
                        className="absolute -left-[21px] top-1 h-2 w-2 rounded-full border-2 border-card bg-saffron-400"
                        aria-hidden
                      />
                      <Link
                        href={
                          event.entityType === "release"
                            ? "/releases"
                            : event.entityType === "fdr"
                              ? `/scrutiny/${event.entityId}`
                              : "/dashboard"
                        }
                        className="block"
                      >
                        <p className="text-[11.5px] font-medium leading-snug text-foreground">
                          {AUDIT_ACTION_LABELS[event.action] ?? event.summary}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {event.userName ?? "Portal system"}
                          {event.userRole ? ` · ${ROLE_SHORT_LABELS[event.userRole]}` : ""}
                        </p>
                        <p className="text-[9.5px] text-muted-foreground/80">
                          {formatDateTime(event.createdAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState
                  title="No activity yet"
                  description="Audit events will appear as records move through the workflow."
                  compact
                />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {bureau ? (
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Institutions requiring attention</CardTitle>
              <CardDescription className="mt-1">
                Ranked by overdue exposure, then instruments approaching maturity.
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0">
              Top {data.institutionsAtRisk.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/70 text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-semibold">Institution</th>
                    <th scope="col" className="hidden py-2 pr-3 font-semibold sm:table-cell">AICTE ID</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Exposure</th>
                    <th scope="col" className="py-2 pr-3 text-center font-semibold">Overdue</th>
                    <th scope="col" className="py-2 pr-3 text-center font-semibold">Expiring</th>
                    <th scope="col" className="py-2 text-right font-semibold">Register</th>
                  </tr>
                </thead>
                <tbody>
                  {data.institutionsAtRisk.map((institution) => (
                    <tr key={institution.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-navy-900">{institution.name}</p>
                        <p className="text-[10px] text-muted-foreground">{institution.state}</p>
                      </td>
                      <td className="hidden py-2.5 pr-3 font-mono text-[10px] text-muted-foreground sm:table-cell">
                        {institution.aicteId}
                      </td>
                      <td className="metric-number py-2.5 pr-3 font-medium">
                        {formatINR(institution.value, { compact: true })}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {institution.overdue ? (
                          <span className="inline-flex min-w-6 justify-center rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                            {institution.overdue}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {institution.expiring ? (
                          <span className="inline-flex min-w-6 justify-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            {institution.expiring}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/repository?q=${encodeURIComponent(institution.name)}`}>
                            View
                            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-muted/25 px-3 py-2 text-[10.5px] text-muted-foreground">
              <span>
                {data.bankConfirmedCount} bank-confirmed · {data.pendingScrutinyCount} awaiting
                scrutiny · {data.discrepancyCount} discrepancies
              </span>
              <span className="font-semibold text-foreground">{data.verifiedPct}% verified</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Verification health</CardTitle>
            <CardDescription>
              Share of live instruments supported by an authorised bank confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="flex items-end justify-between">
                  <span className="metric-number text-2xl font-semibold text-navy-900">
                    {data.verifiedPct}%
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {data.bankConfirmedCount} of {data.liveCount} verified
                  </span>
                </div>
                <Progress value={data.verifiedPct} className="mt-2 h-2.5" />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:w-[360px]">
                {[
                  { label: "Bank confirmed", value: data.bankConfirmedCount, className: "border-emerald-200 bg-emerald-50 text-emerald-900" },
                  { label: "Awaiting scrutiny", value: data.pendingScrutinyCount, className: "border-sky-200 bg-sky-50 text-sky-900" },
                  { label: "Discrepancies", value: data.discrepancyCount, className: "border-rose-200 bg-rose-50 text-rose-900" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-lg border p-2.5 ${item.className}`}>
                    <p className="metric-number text-lg font-semibold">{item.value}</p>
                    <p className="text-[9.5px] leading-snug opacity-80">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
