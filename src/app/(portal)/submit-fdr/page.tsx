import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/page-header";
import { SubmissionForm } from "@/components/submission/submission-form";
import { Badge } from "@/components/ui/badge";
import { getRenewalParentOptions } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { addDaysToISO, todayISO } from "@/lib/utils";

export const metadata: Metadata = { title: "Submit FDR" };

export default async function SubmitFdrPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/dashboard");

  if (user.role !== "INSTITUTION_ADMIN") {
    return (
      <AccessDenied
        user={user}
        title="Submission is an institution action"
        description="FDRs and renewal instruments are filed by the institution administrator. Use the demo role switcher to open the institution workspace."
        requiredRole="Institution Administrator"
      />
    );
  }

  const sp = await searchParams;
  const parentParam = Array.isArray(sp.parent) ? sp.parent[0] : sp.parent;
  const parents = await getRenewalParentOptions(user);
  const selectedParent = parentParam && parents.some((item) => item.id === parentParam)
    ? parentParam
    : undefined;
  const today = todayISO();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Digital submission · Institution workspace"
        title="File a new security deposit instrument"
        description="Record the FDR particulars, attach the bank-issued evidence, and link a predecessor instrument when this deposit renews or replaces an earlier FDR."
        actions={
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
            Step 1 of 3 · Submission
          </Badge>
        }
      />
      <SubmissionForm
        parents={parents}
        today={today}
        defaultMaturity={addDaysToISO(today, 365)}
        selectedParentId={selectedParent}
        institution={{
          name: user.institutionName ?? "Your institution",
          aicteId: user.institutionAicteId ?? "—",
          state: user.institutionState ?? "—",
        }}
      />
    </div>
  );
}
