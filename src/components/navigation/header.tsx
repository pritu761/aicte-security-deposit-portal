"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Menu } from "lucide-react";

import { CommandPalette } from "@/components/navigation/command-palette";
import { ScrollProgress } from "@/components/navigation/scroll-progress";
import { UserMenu } from "@/components/navigation/user-menu";
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
import { formatDateTime } from "@/lib/utils";

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
  scrutiny: "Scrutiny queue",
  about: "About the portal",
  help: "Help centre",
  security: "Security & assurance",
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
      <div className="flex h-7 items-center justify-between gap-4 bg-navy-950 px-4 text-[10px] tracking-wide text-white/60 sm:px-6 lg:px-8">
        <p className="truncate">
          All India Council for Technical Education
          <span className="hidden sm:inline"> · Regulation Bureau</span>
        </p>
        <p className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <span
            className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-400"
            aria-hidden
          />
          Secure session
          <span className="hidden text-white/30 md:inline">·</span>
          <span className="hidden text-white/45 md:inline">Role-scoped access</span>
        </p>
      </div>

      <div className="relative border-b border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="flex h-[62px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
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
            <ol
              key={pathname}
              className="flex animate-fade-in items-center gap-1.5 text-xs text-muted-foreground"
            >
              <li className="hidden sm:block">
                <Link href="/dashboard" className="transition-colors hover:text-foreground">
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

          <CommandPalette role={user.role} />

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
                  <span className="pointer-events-none absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center">
                    <span
                      aria-hidden
                      className="absolute inline-flex h-full w-full animate-ping rounded-full bg-saffron-400/50 [animation-duration:2.6s]"
                    />
                    <span className="relative flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-saffron-500 px-0.5 text-[8px] font-bold leading-none text-white">
                      {notifications.length > 9 ? "9+" : notifications.length}
                    </span>
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
                  {notifications.length} recent
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
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron-400"
                          aria-hidden
                        />
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

          <UserMenu user={user} />
          <span className="sr-only">
            Signed in as {user.name}, {ROLE_LABELS[user.role]}. {ROLE_SHORT_LABELS[user.role]}{" "}
            workspace.
          </span>
        </div>
        <ScrollProgress />
      </div>
    </header>
  );
}
