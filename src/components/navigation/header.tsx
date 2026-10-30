"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Menu,
  Search,
} from "lucide-react";

import { RoleSwitcher } from "@/components/navigation/role-switcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, ROLE_SHORT_LABELS } from "@/lib/constants";
import type { UserRole } from "@/db/schema";
import type { SessionUser } from "@/lib/session";
import { formatDateTime, initials } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  action: string;
  summary: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  userName: string | null;
  userRole: UserRole | null;
};

const crumbs: Record<string, string> = {
  dashboard: "Executive dashboard",
  repository: "FDR repository",
  "submit-fdr": "Digital submission",
  renewals: "Renewals & succession",
  releases: "Release authorisations",
  audit: "Immutable audit trail",
  scrutiny: "Scrutiny & discrepancy desk",
};

export function Header({
  user,
  notifications,
  onOpenNav,
}: {
  user: SessionUser;
  notifications: NotificationItem[];
  onOpenNav: () => void;
}) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const current = crumbs[segments[0] ?? ""] ?? "Portal";
  const isRecordPage = segments[0] === "scrutiny" && segments.length > 1;

  return (
    <header className="sticky top-0 z-30">
      <div className="flex h-7 items-center justify-between gap-4 bg-navy-950 px-4 text-[10px] tracking-wide text-white/65 sm:px-6 lg:px-8">
        <p className="truncate">
          All India Council for Technical Education · Regulation Bureau
        </p>
        <p className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-saffron-300" aria-hidden />
          Demonstration environment · synthetic records
        </p>
      </div>
      <div className="border-b border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="flex h-[60px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onOpenNav}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li className="hidden sm:block">
                <Link href="/dashboard" className="hover:text-foreground">
                  AICTE
                </Link>
              </li>
              <li className="hidden sm:block" aria-hidden>
                <ChevronRight className="h-3 w-3" />
              </li>
              <li className="truncate font-medium text-foreground" aria-current="page">
                {current}
              </li>
              {isRecordPage ? (
                <>
                  <li aria-hidden>
                    <ChevronRight className="h-3 w-3" />
                  </li>
                  <li className="hidden text-muted-foreground md:block">Record review</li>
                </>
              ) : null}
            </ol>
          </nav>

          <form
            action="/repository"
            method="get"
            role="search"
            className="relative hidden w-[240px] xl:block"
          >
            <label htmlFor="global-search" className="sr-only">
              Search FDRs, institutions, banks or AICTE IDs
            </label>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="global-search"
              name="q"
              type="search"
              placeholder="Search portal…"
              className="h-9 w-full rounded-md border border-border bg-muted/40 pl-8 pr-3 text-xs outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-ring/20"
            />
          </form>

          <div className="h-6 w-px bg-border/70" aria-hidden />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="relative text-muted-foreground"
                aria-label={`Notifications (${notifications.length})`}
              >
                <Bell className="h-[18px] w-[18px]" />
                {notifications.length ? (
                  <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-saffron-500 px-0.5 text-[8px] font-bold leading-none text-white">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[340px] p-0">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Activity</p>
                  <p className="text-[11px] text-muted-foreground">
                    Recent events in your workspace
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {notifications.length} new
                </span>
              </div>
              <div className="max-h-[320px] overflow-y-auto p-1.5">
                {notifications.length ? (
                  notifications.slice(0, 6).map((item) => (
                    <DropdownMenuItem key={item.id} asChild className="items-start py-2.5">
                      <Link
                        href={
                          item.entityType === "release"
                            ? "/releases"
                            : item.entityType === "fdr"
                              ? `/scrutiny/${item.entityId}`
                              : "/dashboard"
                        }
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron-400" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium leading-snug text-foreground">
                            {item.summary}
                          </span>
                          <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                            {item.userName ?? "Portal system"} · {formatDateTime(item.createdAt)}
                          </span>
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                    No recent activity.
                  </p>
                )}
              </div>
              <DropdownMenuSeparator className="mx-0 my-0" />
              <div className="p-1.5">
                <DropdownMenuItem asChild>
                  <Link
                    href={user.role === "INSTITUTION_ADMIN" ? "/repository" : "/audit"}
                    className="justify-center text-xs font-medium text-primary"
                  >
                    {user.role === "INSTITUTION_ADMIN"
                      ? "Open your FDR register"
                      : "Open full audit trail"}
                  </Link>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <RoleSwitcher role={user.role} />

          <div className="hidden items-center gap-2.5 border-l border-border/70 pl-3 md:flex">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-[11px] font-semibold text-white"
              aria-hidden
            >
              {initials(user.name)}
            </span>
            <span className="hidden max-w-[150px] xl:block">
              <span className="block truncate text-xs font-semibold leading-tight">
                {user.name}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                {ROLE_LABELS[user.role]}
              </span>
            </span>
          </div>
          <span className="sr-only">
            Signed in as {user.name}, {ROLE_LABELS[user.role]}. {ROLE_SHORT_LABELS[user.role]}{" "}
            workspace.
          </span>
        </div>
      </div>
    </header>
  );
}
