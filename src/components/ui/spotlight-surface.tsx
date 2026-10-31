"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Client-only surface that tracks the pointer for the `.card-spotlight` effect.
 * Keeps server components (e.g. StatCard) from receiving function props.
 */
export function SpotlightSurface({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ref = React.useRef<HTMLDivElement>(null);

  function move(event: React.MouseEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
    node.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
  }

  function leave() {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--spotlight-x", "50%");
    node.style.setProperty("--spotlight-y", "50%");
  }

  return (
    <div
      ref={ref}
      onMouseMove={move}
      onMouseLeave={leave}
      className={cn("card-spotlight", className)}
      style={
        {
          "--spotlight-x": "50%",
          "--spotlight-y": "50%",
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
}
