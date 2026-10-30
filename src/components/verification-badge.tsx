import { AlertTriangle, Building2, Landmark } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  VERIFICATION_LABELS,
  VERIFICATION_STYLES,
} from "@/lib/constants";
import type { VerificationStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

const icons = {
  building: Building2,
  bank: Landmark,
  alert: AlertTriangle,
};

export function VerificationBadge({
  status,
  className,
  withIcon = true,
}: {
  status: VerificationStatus;
  className?: string;
  withIcon?: boolean;
}) {
  const style = VERIFICATION_STYLES[status];
  const Icon = icons[style.icon];
  return (
    <Badge variant="outline" className={cn(style.badge, className)}>
      {withIcon ? <Icon className="h-3 w-3" aria-hidden /> : null}
      {VERIFICATION_LABELS[status]}
    </Badge>
  );
}
