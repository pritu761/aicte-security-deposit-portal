import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "violet";

const tones: Record<
  Tone,
  { card: string; icon: string; value: string; accent: string }
> = {
  neutral: {
    card: "border-border/80 bg-card",
    icon: "bg-navy-50 text-navy-800",
    value: "text-navy-900",
    accent: "bg-navy-800",
  },
  success: {
    card: "border-emerald-200/70 bg-gradient-to-br from-emerald-50/60 to-card dark:border-emerald-900/70 dark:from-emerald-950/35",
    icon: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    value: "text-emerald-950 dark:text-emerald-100",
    accent: "bg-emerald-600",
  },
  warning: {
    card: "border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-card dark:border-amber-900/70 dark:from-amber-950/35",
    icon: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    value: "text-amber-950 dark:text-amber-100",
    accent: "bg-amber-500",
  },
  danger: {
    card: "border-rose-200/80 bg-gradient-to-br from-rose-50/70 to-card dark:border-rose-900/70 dark:from-rose-950/35",
    icon: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
    value: "text-rose-950 dark:text-rose-100",
    accent: "bg-rose-600",
  },
  info: {
    card: "border-sky-200/70 bg-gradient-to-br from-sky-50/60 to-card dark:border-sky-900/70 dark:from-sky-950/35",
    icon: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
    value: "text-sky-950 dark:text-sky-100",
    accent: "bg-sky-600",
  },
  violet: {
    card: "border-violet-200/70 bg-gradient-to-br from-violet-50/60 to-card dark:border-violet-900/70 dark:from-violet-950/35",
    icon: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
    value: "text-violet-950 dark:text-violet-100",
    accent: "bg-violet-600",
  },
};

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = "neutral",
  href,
  pulse = false,
  badge,
}: {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  href?: string;
  pulse?: boolean;
  badge?: string;
}) {
  const style = tones[tone];
  const content = (
    <div
      className={cn(
        "group relative h-full overflow-hidden rounded-xl border p-4 shadow-card transition-all duration-300 sm:p-5 card-spotlight",
        style.card,
        href && "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lift",
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-[3px] origin-left animate-grow-x", style.accent)}
      />
      {href ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/45 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100 dark:bg-white/10"
        />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="data-label flex items-center gap-1.5">
            {pulse ? (
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-600" />
              </span>
            ) : null}
            {label}
          </p>
          <p className={cn("metric-number mt-2 text-[1.6rem] font-semibold leading-none", style.value)}>
            {value}
          </p>
        </div>
        <span
          className={cn(
            "rounded-lg p-2 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105",
            style.icon,
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        {subtext ? (
          <div className="text-[11.5px] leading-snug text-muted-foreground">{subtext}</div>
        ) : (
          <span />
        )}
        {badge ? (
          <span className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {badge}
          </span>
        ) : href ? (
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
        ) : null}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      {content}
    </Link>
  ) : (
    content
  );
}
