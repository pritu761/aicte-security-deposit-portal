"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CornerDownLeft,
  Database,
  FilePlus2,
  LayoutDashboard,
  LifeBuoy,
  RefreshCw,
  ScrollText,
  Search,
  SearchCheck,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserRole } from "@/db/schema";
import { cn } from "@/lib/utils";

type CommandItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[];
  keywords?: string;
};

const commands: CommandItem[] = [
  {
    label: "Executive dashboard",
    description: "Portfolio KPIs, analytics and action centre",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: "overview home metrics",
  },
  {
    label: "FDR repository",
    description: "Search and filter every registered instrument",
    href: "/repository",
    icon: Database,
    keywords: "register search records",
  },
  {
    label: "Renewals & succession",
    description: "Renewal chains, timelines and the 180-day window",
    href: "/renewals",
    icon: RefreshCw,
    keywords: "successor parent maturity",
  },
  {
    label: "Release authorisations",
    description: "Three-stage release workflow and receipts",
    href: "/releases",
    icon: BadgeCheck,
    keywords: "approval refund discharge",
  },
  {
    label: "Submit a new FDR",
    description: "File an instrument and encrypted bank evidence",
    href: "/submit-fdr",
    icon: FilePlus2,
    roles: ["INSTITUTION_ADMIN"],
    keywords: "upload create evidence",
  },
  {
    label: "Scrutiny queue",
    description: "Pending submissions, discrepancies and recent verifications",
    href: "/scrutiny",
    icon: SearchCheck,
    roles: ["AICTE_SCRUTINY_OFFICER", "REGULATION_BUREAU_HEAD"],
    keywords: "pending review verify ageing queue discrepancy",
  },
  {
    label: "Immutable audit trail",
    description: "Every recorded action with JSON before/after",
    href: "/audit",
    icon: ScrollText,
    roles: ["AICTE_SCRUTINY_OFFICER", "REGULATION_BUREAU_HEAD"],
    keywords: "history log events",
  },
  {
    label: "About the portal",
    description: "Purpose, lifecycle, roles and the authority matrix",
    href: "/about",
    icon: BookOpen,
    keywords: "overview mission modules responsibility",
  },
  {
    label: "Help centre",
    description: "Role guidance, workflow walkthroughs and FAQs",
    href: "/help",
    icon: LifeBuoy,
    keywords: "support guidance faq shortcuts",
  },
  {
    label: "Security & assurance",
    description: "Controls, encryption, auditability and assurance",
    href: "/security",
    icon: ShieldCheck,
    keywords: "trust compliance encryption privacy posture",
  },
];

export function CommandPalette({ role }: { role: UserRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const available = useMemo(
    () => commands.filter((item) => !item.roles || item.roles.includes(role)),
    [role],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return available;
    return available.filter((item) =>
      `${item.label} ${item.description} ${item.keywords ?? ""}`.toLowerCase().includes(term),
    );
  }, [available, query]);

  const searchRegister = query.trim()
    ? {
        label: `Search the register for “${query.trim()}”`,
        description: "Open the FDR repository with this query applied",
        href: `/repository?q=${encodeURIComponent(query.trim())}`,
      }
    : null;

  const results = searchRegister
    ? [
        { ...searchRegister, icon: Search, roles: undefined, keywords: undefined },
        ...filtered,
      ]
    : filtered;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const item = listRef.current?.querySelector<HTMLElement>(`[data-command-index="${activeIndex}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      navigate(results[activeIndex].href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
        className="group hidden h-9 w-[255px] items-center gap-2 rounded-lg border border-border/90 bg-muted/35 px-3 text-left text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 xl:flex"
      >
        <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="flex-1">Search the portal</span>
        <kbd className="rounded border border-border/80 bg-card px-1.5 py-0.5 font-sans text-[9px] font-medium text-muted-foreground shadow-xs">
          Ctrl K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground xl:hidden"
        aria-label="Search the portal"
      >
        <Search className="h-[18px] w-[18px]" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-[16%] max-w-[620px] translate-y-0 gap-0 overflow-hidden p-0"
          onKeyDown={onKeyDown}
        >
          <DialogTitle className="sr-only">Search and navigate the portal</DialogTitle>
          <DialogDescription className="sr-only">
            Type to filter destinations, or press Enter to search the FDR register.
          </DialogDescription>

          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages, actions or the FDR register…"
              className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/65"
              aria-label="Search commands"
              aria-controls="command-results"
              aria-activedescendant={results[activeIndex] ? `command-item-${activeIndex}` : undefined}
            />
            <kbd className="hidden rounded border border-border bg-muted/50 px-1.5 py-0.5 font-sans text-[9.5px] text-muted-foreground sm:block">
              ESC
            </kbd>
          </div>

          <div ref={listRef} id="command-results" role="listbox" className="max-h-[380px] overflow-y-auto p-2">
            {results.length ? (
              <div className="space-y-0.5">
                {searchRegister && activeIndex === 0 ? (
                  <p className="px-2.5 pb-1 pt-1 text-[9.5px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                    Register search
                  </p>
                ) : null}
                {!searchRegister && filtered.length ? (
                  <p className="px-2.5 pb-1 pt-1 text-[9.5px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                    Navigate
                  </p>
                ) : null}
                {results.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={`${item.href}-${item.label}`}
                      type="button"
                      role="option"
                      id={`command-item-${index}`}
                      aria-selected={index === activeIndex}
                      data-command-index={index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => navigate(item.href)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left outline-none transition-colors",
                        index === activeIndex
                          ? "bg-navy-900 text-white"
                          : "text-foreground hover:bg-muted/70",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                          index === activeIndex
                            ? "border-white/10 bg-white/[0.08] text-saffron-200"
                            : "border-border/80 bg-muted/50 text-navy-700",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">{item.label}</span>
                        <span
                          className={cn(
                            "mt-0.5 block truncate text-[10px]",
                            index === activeIndex ? "text-white/55" : "text-muted-foreground",
                          )}
                        >
                          {item.description}
                        </span>
                      </span>
                      {index === activeIndex ? (
                        <CornerDownLeft
                          className="h-3.5 w-3.5 shrink-0 text-white/35"
                          aria-hidden
                        />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <Search className="mx-auto h-5 w-5 text-muted-foreground/50" aria-hidden />
                <p className="mt-2 text-xs font-medium text-foreground">No destination found</p>
                <p className="mt-1 text-[10.5px] text-muted-foreground">
                  Try a page name, an action, or an FDR number.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/25 px-4 py-2.5 text-[9.5px] text-muted-foreground">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-card px-1 py-0.5 font-sans">↑</kbd>
                <kbd className="rounded border border-border bg-card px-1 py-0.5 font-sans">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-card px-1 py-0.5 font-sans">↵</kbd>
                open
              </span>
            </span>
            <span className="hidden sm:block">One search across your workspace</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
