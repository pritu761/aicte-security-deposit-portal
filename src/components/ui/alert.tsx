import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const styles = {
  info: {
    wrapper: "border-sky-200 bg-sky-50/80 text-sky-950",
    icon: "text-sky-700",
    Icon: Info,
  },
  success: {
    wrapper: "border-emerald-200 bg-emerald-50/80 text-emerald-950",
    icon: "text-emerald-700",
    Icon: CheckCircle2,
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50/80 text-amber-950",
    icon: "text-amber-700",
    Icon: TriangleAlert,
  },
  danger: {
    wrapper: "border-rose-200 bg-rose-50/80 text-rose-950",
    icon: "text-rose-700",
    Icon: AlertCircle,
  },
} as const;

export function Alert({
  variant = "info",
  title,
  children,
  className,
  icon = true,
}: {
  variant?: keyof typeof styles;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  icon?: boolean;
}) {
  const { wrapper, icon: iconClass, Icon } = styles[variant];
  return (
    <div
      role={variant === "danger" ? "alert" : "note"}
      className={cn("flex gap-3 rounded-lg border p-4 text-sm", wrapper, className)}
    >
      {icon ? <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} aria-hidden /> : null}
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold leading-snug">{title}</p> : null}
        {children ? <div className="leading-relaxed opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}
