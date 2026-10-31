import Image from "next/image";

/**
 * Fixed institutional backdrop shared by every page. The photograph is held at
 * low contrast so content remains the focus in both colour themes.
 */
export function SiteBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <Image
        src="/images/aicte-hq.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="scale-110 object-cover object-center opacity-[0.14] saturate-[0.55] motion-safe:animate-float-slow motion-reduce:animate-none dark:opacity-[0.18] dark:brightness-[0.5] dark:saturate-[0.4]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-background/65 to-background/95" />
      <div className="absolute inset-0 bg-[radial-gradient(1100px_520px_at_85%_-10%,rgba(217,131,42,0.08),transparent_60%),radial-gradient(900px_480px_at_8%_-8%,rgba(11,43,71,0.08),transparent_60%)] dark:bg-[radial-gradient(1100px_520px_at_85%_-10%,rgba(217,131,42,0.12),transparent_60%),radial-gradient(900px_480px_at_8%_-8%,rgba(41,159,153,0.08),transparent_60%)]" />
    </div>
  );
}
