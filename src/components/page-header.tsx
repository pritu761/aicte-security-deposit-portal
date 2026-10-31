import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backHref,
  backLabel = "Back",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <header className={cn("space-y-4", className)}>
      {backHref ? (
        <Link
          href={backHref}
          className="group inline-flex animate-fade-in items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
            aria-hidden
          />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          {eyebrow ? (
            <div className="flex animate-fade-in items-center gap-2.5">
              <span
                aria-hidden
                className="h-px w-8 origin-left animate-grow-x bg-gradient-to-r from-saffron-500 to-saffron-300/0"
              />
              <p className="eyebrow">{eyebrow}</p>
            </div>
          ) : null}
          <h1 className="animate-rise font-display text-[1.8rem] font-semibold leading-[1.12] tracking-[-0.015em] text-navy-900 text-balance [animation-delay:40ms] sm:text-[2.15rem]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl animate-rise text-sm leading-relaxed text-muted-foreground text-pretty [animation-delay:100ms]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex animate-rise flex-wrap items-center gap-2 [animation-delay:150ms] lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
