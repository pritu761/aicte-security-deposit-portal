"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[portal] Unhandled route error", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-card">
      <span className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
        <ShieldAlert className="h-7 w-7" aria-hidden />
      </span>
      <p className="eyebrow mt-5">Unexpected error</p>
      <h1 className="font-display mt-1 text-2xl font-semibold text-navy-900">
        This workspace could not be loaded
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        The portal could not complete the request. The failure has been logged without exposing
        record contents. You can retry, or return to the dashboard.
      </p>
      {error.digest ? (
        <p className="mt-3 rounded-md border border-border bg-muted/40 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Return to dashboard</Link>
        </Button>
      </div>
      <p className="mt-5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
        <AlertTriangle className="h-3 w-3" aria-hidden />
        If the database is unavailable, confirm PostgreSQL is running and the schema is seeded.
      </p>
    </div>
  );
}
