import type { Metadata } from "next";
import {
  BadgeCheck,
  CircleAlert,
  Clock3,
  Landmark,
  ShieldCheck,
  Stamp,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ReleasesClient } from "@/components/releases/releases-client";
import { StatCard } from "@/components/stat-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getReleasesData } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { formatINR, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Release authorisations" };

export default async function ReleasesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const data = await getReleasesData(user);

  const releasedValue = data.rows
    .filter((row) => row.status === "APPROVED_RELEASED")
    .reduce((sum, row) => sum + toNumber(row.depositAmount), 0);
  const pendingValue = data.rows
    .filter(
      (row) =>
        row.status === "PENDING_SCRUTINY" || row.status === "RECOMMENDED_BY_OFFICER",
    )
    .reduce((sum, row) => sum + toNumber(row.depositAmount), 0);

  const roleGuidance =
    user.role === "INSTITUTION_ADMIN"
      ? "Raise a release request for a bank-confirmed FDR with no renewal successor. Follow the case through scrutiny and Bureau Head approval."
      : user.role === "AICTE_SCRUTINY_OFFICER"
        ? "Validate that the instrument is bank-confirmed, free of discrepancies and has no successor, then recommend or reject the case with a recorded note."
        : "Decide recommended cases as the competent authority. Approval generates a unique dispatch reference and a printable authorisation receipt.";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="FDR lifecycle · Release authorisations"
        title="Security deposit release workflow"
        description="A three-stage approval chain from institution request to scrutiny recommendation to competent-authority authorisation, with a permanent dispatch reference for every release."
        actions={
          <Badge
            variant="outline"
            className="border-violet-200 bg-violet-50 px-3 py-1 text-violet-800"
          >
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Competent-authority control
          </Badge>
        }
      />

      <Alert variant="info" title="Your role in this workflow" icon>
        {roleGuidance}
      </Alert>

      <section
        aria-label="Release summary"
        className="stagger-cards grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Pending scrutiny"
          value={data.summary.PENDING_SCRUTINY}
          subtext="Cases awaiting verification by the AICTE desk"
          icon={Clock3}
          tone="warning"
          pulse={data.summary.PENDING_SCRUTINY > 0}
        />
        <StatCard
          label="Awaiting approval"
          value={data.summary.RECOMMENDED_BY_OFFICER}
          subtext="Recommended cases before the Bureau Head"
          icon={Stamp}
          tone="info"
        />
        <StatCard
          label="Authorised & released"
          value={data.summary.APPROVED_RELEASED}
          subtext={`${formatINR(releasedValue, { compact: true })} released value`}
          icon={BadgeCheck}
          tone="success"
        />
        <StatCard
          label="Rejected / returned"
          value={data.summary.REJECTED}
          subtext={
            pendingValue
              ? `${formatINR(pendingValue, { compact: true })} still in the pipeline`
              : "No value currently in the pipeline"
          }
          icon={CircleAlert}
          tone={data.summary.REJECTED ? "danger" : "neutral"}
        />
      </section>

      <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Landmark className="h-3 w-3" aria-hidden />
          {user.role === "INSTITUTION_ADMIN" ? user.institutionName : "Bureau-wide queue"}
        </span>
        <span aria-hidden>·</span>
        <span>{data.rows.length} total release case{data.rows.length === 1 ? "" : "s"}</span>
        {user.role === "INSTITUTION_ADMIN" ? (
          <>
            <span aria-hidden>·</span>
            <span>{data.eligibleFdrs.length} eligible instrument{data.eligibleFdrs.length === 1 ? "" : "s"}</span>
          </>
        ) : null}
      </div>

      <ReleasesClient
        data={data}
        role={user.role}
        institutionName={user.institutionName}
      />
    </div>
  );
}
