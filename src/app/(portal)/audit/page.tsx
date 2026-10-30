import type { Metadata } from "next";
import { Braces, Fingerprint, History, ShieldCheck, Users } from "lucide-react";

import { AccessDenied } from "@/components/access-denied";
import { AuditClient } from "@/components/audit/audit-client";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { getAuditData } from "@/lib/queries";
import { canViewAudit, getCurrentUser } from "@/lib/session";
import { auditFilterSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Immutable audit trail" };

function param(value: string | string[] | undefined, fallback = ""): string {
  return Array.isArray(value) ? (value[0] ?? fallback) : (value ?? fallback);
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  if (!canViewAudit(user)) {
    return (
      <AccessDenied
        user={user}
        title="The audit trail is restricted"
        description="The immutable audit log is available to AICTE scrutiny officers and the Regulation Bureau Head. Your institution workspace shows record-level activity on each FDR instead."
        requiredRole="AICTE Scrutiny Officer or Regulation Bureau Head"
      />
    );
  }

  const sp = await searchParams;
  const parsed = auditFilterSchema.safeParse({
    q: param(sp.q),
    action: param(sp.action),
    entityType: param(sp.entityType),
    userId: param(sp.userId),
    page: param(sp.page, "1"),
  });
  const filters = parsed.success
    ? parsed.data
    : { q: "", action: "", entityType: "", userId: "", page: 1 };

  const data = await getAuditData(user, filters);
  if (!data) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Regulatory desk · Audit & assurance"
        title="Immutable audit trail"
        description="Every submission, verification, discrepancy, release decision and export is written to an append-only log. Database triggers block updates and deletions, preserving the evidence chain for regulatory review."
        actions={
          <Badge
            variant="outline"
            className="border-teal-200 bg-teal-50 px-3 py-1 text-teal-800"
          >
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Append-only enforcement active
          </Badge>
        }
      />

      <section aria-label="Audit summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total events"
          value={data.summary.total.toLocaleString("en-IN")}
          subtext="All workflow events across the portal"
          icon={History}
          tone="neutral"
        />
        <StatCard
          label="Distinct actors"
          value={data.summary.actors}
          subtext="Officers, bureau heads and institution administrators"
          icon={Users}
          tone="info"
        />
        <StatCard
          label="Matching events"
          value={data.total.toLocaleString("en-IN")}
          subtext={
            filters.q || filters.action || filters.entityType || filters.userId
              ? "Current filter selection"
              : "Full register, newest first"
          }
          icon={Braces}
          tone="violet"
        />
        <StatCard
          label="Log integrity"
          value="Sealed"
          subtext="UPDATE and DELETE revoked by trigger on audit_logs"
          icon={Fingerprint}
          tone="success"
          badge="Append-only"
        />
      </section>

      <AuditClient
        data={data}
        initial={{
          q: filters.q,
          action: filters.action,
          entityType: filters.entityType,
          userId: filters.userId,
          page: filters.page,
        }}
      />

      <p className="text-[10.5px] leading-relaxed text-muted-foreground">
        Retention notice: audit events are retained in the live register and protected by an
        append-only database trigger. Operational deployments should also forward sealed audit
        exports to the departmental record office in line with the AICTE records-retention schedule.
      </p>
    </div>
  );
}
