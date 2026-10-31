import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Aceternity-style moving border: a conic gradient spins behind the content.
 * Use on a single focal element (CTA, hero card) to avoid visual noise.
 */
export function MovingBorder({
  children,
  className,
  duration = 4,
  borderRadius = "0.75rem",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  duration?: number;
  borderRadius?: string;
}) {
  return (
    <div
      className={cn("relative overflow-hidden p-[1px]", className)}
      style={{ borderRadius }}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-1000%] motion-safe:animate-[border-spin_4s_linear_infinite] motion-reduce:animate-none"
        style={{
          background:
            "conic-gradient(from 90deg at 50% 50%, transparent 0deg, rgba(217,131,42,0.9) 90deg, transparent 180deg, rgba(41,159,153,0.7) 270deg, transparent 360deg)",
          animationDuration: `${duration}s`,
        }}
      />
      <div
        className="relative h-full w-full bg-card"
        style={{ borderRadius: `calc(${borderRadius} - 1px)` }}
      >
        {children}
      </div>
    </div>
  );
}
