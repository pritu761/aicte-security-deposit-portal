import { cn } from "@/lib/utils";

/**
 * Aceternity-style text generate effect: words fade and rise into place.
 * Pure CSS, no runtime animation library.
 */
export function TextGenerateEffect({
  text,
  className,
  wordClassName,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
}) {
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <span className={cn("inline", className)}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className={cn(
            "inline-block opacity-0 motion-safe:animate-rise motion-reduce:opacity-100",
            wordClassName,
          )}
          style={{ animationDelay: `${index * 90}ms` }}
        >
          {word}
          {index < words.length - 1 ? "\u00A0" : null}
        </span>
      ))}
    </span>
  );
}
