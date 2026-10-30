import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import type { SessionUser } from "@/lib/session";

export function AccessDenied({
  user,
  title = "This workspace is restricted",
  description,
  requiredRole,
}: {
  user: SessionUser;
  title?: string;
  description?: string;
  requiredRole?: string;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-card">
      <span className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
        <ShieldAlert className="h-7 w-7" aria-hidden />
      </span>
      <p className="eyebrow mt-5">Access control</p>
      <h1 className="font-display mt-1 text-2xl font-semibold text-navy-900">{title}</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description ??
          `Your current role, ${ROLE_LABELS[user.role]}, does not include permission for this page.`}
      </p>
      <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
        {requiredRole ? `Required role: ${requiredRole}` : "Role-based access is enforced on the server."}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="outline">
          <Link href="/dashboard">Return to dashboard</Link>
        </Button>
        <Button asChild>
          <Link href="/repository">
            Open FDR repository
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
      <p className="mt-5 text-[11px] text-muted-foreground">
        Access is assigned by role. Contact the Regulation Bureau if your responsibilities change.
      </p>
    </div>
  );
}
