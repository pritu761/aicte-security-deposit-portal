import Link from "next/link";
import { FileQuestion, SearchX, ShieldQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PortalNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-card">
      <span className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
        <FileQuestion className="h-7 w-7" aria-hidden />
      </span>
      <p className="eyebrow mt-5">404 · Record not found</p>
      <h1 className="font-display mt-1 text-2xl font-semibold text-navy-900">
        We could not find that page or instrument
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        The record may have been removed, belongs to another institution, or the link may be
        incomplete. Search the register to locate the correct instrument.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ShieldQuestion className="h-4 w-4" aria-hidden />
            Return to dashboard
          </Link>
        </Button>
        <Button asChild>
          <Link href="/repository">
            <SearchX className="h-4 w-4" aria-hidden />
            Search the FDR repository
          </Link>
        </Button>
      </div>
      <p className="mt-5 text-[10.5px] text-muted-foreground">
        Institution users only see records belonging to their own institution.
      </p>
    </div>
  );
}
