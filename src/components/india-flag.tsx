import { cn } from "@/lib/utils";

export function IndiaFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 24"
      aria-hidden
      focusable="false"
      className={cn(
        "shrink-0 origin-left rounded-[2px] shadow-[0_0_0_1px_rgba(255,255,255,0.16)] motion-safe:transition-transform motion-safe:hover:animate-flag-wave",
        className,
      )}
    >
      <rect width="36" height="8" fill="#FF9933" />
      <rect y="8" width="36" height="8" fill="#FFFFFF" />
      <rect y="16" width="36" height="8" fill="#138808" />
      <g stroke="#000080" strokeWidth="0.36">
        <circle cx="18" cy="12" r="3.4" fill="none" strokeWidth="0.45" />
        {Array.from({ length: 24 }, (_, index) => (
          <line
            key={index}
            x1="18"
            y1="8.6"
            x2="18"
            y2="15.4"
            transform={`rotate(${index * 15} 18 12)`}
          />
        ))}
      </g>
    </svg>
  );
}
