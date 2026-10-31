"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Aceternity-style spotlight card: a soft radial highlight follows the pointer.
 * Respects reduced motion by disabling the tracking effect.
 */
export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(255, 255, 255, 0.12)",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  spotlightColor?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    node.style.setProperty("--spotlight-x", `${x}px`);
    node.style.setProperty("--spotlight-y", `${y}px`);
  }

  function handleLeave() {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--spotlight-x", "50%");
    node.style.setProperty("--spotlight-y", "50%");
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-card transition-[border-color,box-shadow] duration-300 motion-safe:before:opacity-0 motion-safe:hover:before:opacity-100",
        "before:pointer-events-none before:absolute before:inset-0 before:transition-opacity before:duration-300",
        "before:[background:radial-gradient(420px_circle_at_var(--spotlight-x,50%)_var(--spotlight-y,50%),var(--spotlight-color,rgba(255,255,255,0.12)),transparent_62%)]",
        className,
      )}
      style={
        {
          "--spotlight-color": spotlightColor,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
}
