import { Badge } from "@/components/ui/badge";
import { FDR_STATUS_LABELS, FDR_STATUS_STYLES } from "@/lib/constants";
import type { FdrStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

export type DisplayFdrStatus = FdrStatus | "RENEWED";

const RENEWED_LABEL = "Renewed";

export function FdrStatusBadge({
  status,
  className,
  showDot = true,
}: {
  status: DisplayFdrStatus;
  className?: string;
  showDot?: boolean;
}) {
  if (status === "RENEWED") {
    return (
      <Badge
        variant="outline"
        className={cn("border-sky-200 bg-sky-50 text-sky-800", className)}
      >
        {showDot ? <span className="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden /> : null}
        {RENEWED_LABEL}
      </Badge>
    );
  }

  const style = FDR_STATUS_STYLES[status];
  return (
    <Badge variant="outline" className={cn(style.badge, className)}>
      {showDot ? <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} aria-hidden /> : null}
      {FDR_STATUS_LABELS[status]}
    </Badge>
  );
}
