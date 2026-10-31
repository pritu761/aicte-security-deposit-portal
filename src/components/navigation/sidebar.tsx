"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  BookOpen,
  Building2,
  Database,
  FilePlus2,
  LayoutDashboard,
  LifeBuoy,
  RefreshCw,
  ScrollText,
  SearchCheck,
  ShieldCheck,
  X,
} from "lucide-react";

import { ROLE_LABELS, ROLE_SHORT_LABELS } from "@/lib/constants";
import type { UserRole } from "@/db/schema";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
  hint?: string;
};

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Executive dashboard", icon: LayoutDashboard }],
  },
  {
    label: "FDR lifecycle",
    items: [
      { href: "/repository", label: "FDR repository", icon: Database },
      {
        href: "/submit-fdr",
        label: "Submit new FDR",
        icon: FilePlus2,
        roles: ["INSTITUTION_ADMIN"],
      },
      {
        href: "/renewals",
        label: "Renewals & succession",
        icon: RefreshCw,
      },
      {
        href: "/releases",
        label: "Release authorisations",
        icon: BadgeCheck,
      },
    ],
  },
  {
    label: "Regulatory desk",
    items: [
      {
        href: "/scrutiny",
        label: "Scrutiny queue",
        icon: SearchCheck,
        roles: ["AICTE_SCRUTINY_OFFICER", "REGULATION_BUREAU_HEAD"],
      },
      {
        href: "/audit",
        label: "Immutable audit trail",
        icon: ScrollText,
        roles: ["AICTE_SCRUTINY_OFFICER", "REGULATION_BUREAU_HEAD"],
      },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/about", label: "About the portal", icon: BookOpen },
      { href: "/help", label: "Help centre", icon: LifeBuoy },
      { href: "/security", label: "Security & assurance", icon: ShieldCheck },
    ],
  },
];

export function Sidebar({
  role,
  open,
  onClose,
}: {
  role: UserRole;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    const path = href.split("?")[0];
    if (path === "/repository") {
      return pathname === "/repository" && !href.includes("verification=");
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 animate-fade-in bg-navy-950/60 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={cn(
          "relative z-50 flex w-[264px] shrink-0 flex-col overflow-hidden bg-navy-900 text-white lg:sticky lg:top-0 lg:h-dvh lg:self-start lg:translate-x-0",
          "fixed inset-y-0 left-0 -translate-x-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open && "translate-x-0",
        )}
        aria-label="Primary navigation"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-24 h-64 w-64 animate-float-slow rounded-full bg-[radial-gradient(circle,rgba(227,160,67,0.14),transparent_68%)]" />
          <div className="absolute -right-20 bottom-24 h-56 w-56 animate-float-slower rounded-full bg-[radial-gradient(circle,rgba(41,159,153,0.12),transparent_68%)]" />
        </div>

        <div className="navy-grid relative z-10 border-b border-white/10 px-5 pb-5 pt-5">
          <div className="flex items-start justify-between gap-2">
            <Link
              href="/dashboard"
              className="group/brand flex items-center gap-3"
              onClick={onClose}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-saffron-300/30 bg-white/[0.06] text-saffron-200 transition-transform duration-300 group-hover/brand:rotate-3 group-hover/brand:scale-105">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block font-display text-[1.06rem] font-semibold leading-tight tracking-wide text-white">
                  FDR Setu
                </span>
                <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">
                  Security Deposit &amp; FDR
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-saffron-300" aria-hidden />
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/65">
              Regulation Bureau · MoE
            </span>
          </div>
        </div>

        <nav className="relative z-10 flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {groups.map((group) => {
            const items = group.items.filter(
              (item) => !item.roles || item.roles.includes(role),
            );
            if (!items.length) return null;
            return (
              <div key={group.label}>
                <p className="px-2.5 pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.17em] text-white/35">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <li key={item.href + item.label}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-300/60",
                            active
                              ? "bg-white/[0.11] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                              : "text-white/68 hover:bg-white/[0.06] hover:text-white",
                          )}
                        >
                          {active ? (
                            <span
                              aria-hidden
                              className="absolute inset-y-1.5 left-0 w-[3px] origin-center animate-scale-y rounded-full bg-saffron-300"
                            />
                          ) : null}
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5",
                              active ? "text-saffron-200" : "text-white/50 group-hover:text-white/80",
                            )}
                            aria-hidden
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="relative z-10 space-y-3 border-t border-white/10 px-4 py-4">
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-3">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-saffron-300/15 blur-2xl"
            />
            <div className="relative flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-saffron-300/15 text-saffron-200">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-[0.1em] text-white/40">
                  Active workspace
                </p>
                <p className="truncate text-[11.5px] font-medium text-white/85">
                  {ROLE_LABELS[role]}
                </p>
              </div>
            </div>
            <p className="relative mt-2 text-[10px] leading-relaxed text-white/40">
              {ROLE_SHORT_LABELS[role]} access scope. Permissions are enforced on every request
              and action.
            </p>
          </div>
          <p className="px-1 text-[9.5px] leading-relaxed text-white/30">
            FDR Setu · Secure regulatory workspace. Document access and workflow actions
            are recorded.
          </p>
        </div>
      </aside>
    </>
  );
}
