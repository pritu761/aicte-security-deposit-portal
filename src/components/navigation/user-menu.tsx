"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  BadgeCheck,
  Building2,
  ChevronDown,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/db/schema";
import { logoutAction } from "@/lib/actions/session";
import { ROLE_LABELS, ROLE_SHORT_LABELS } from "@/lib/constants";
import type { SessionUser } from "@/lib/session";
import { initials } from "@/lib/utils";

function roleLink(role: UserRole): { href: string; label: string; icon: typeof SearchCheck } | null {
  if (role === "INSTITUTION_ADMIN") {
    return { href: "/submit-fdr", label: "Submit an FDR", icon: BadgeCheck };
  }
  if (role === "AICTE_SCRUTINY_OFFICER") {
    return {
      href: "/scrutiny",
      label: "Open scrutiny queue",
      icon: SearchCheck,
    };
  }
  return { href: "/releases", label: "Release approvals", icon: BadgeCheck };
}

function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-rose-700 outline-none transition-colors hover:bg-rose-50 focus-visible:bg-rose-50 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <LogOut className="h-4 w-4" aria-hidden />
      )}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function UserMenu({ user }: { user: SessionUser }) {
  const quickLink = roleLink(user.role);
  const QuickIcon = quickLink?.icon;
  const userInitials = initials(user.name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-10 gap-2 rounded-full border border-transparent pl-1 pr-2 hover:border-border hover:bg-muted/60 sm:pr-2.5"
          aria-label={`Account menu for ${user.name} (${userInitials})`}
        >
          <span
            className="relative flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-[11px] font-semibold text-white"
            aria-hidden
          >
            {userInitials}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500"
              aria-hidden
            />
          </span>
          <span className="hidden max-w-[132px] text-left xl:block">
            <span className="block truncate text-[11.5px] font-semibold leading-tight text-foreground">
              {user.name}
            </span>
            <span className="mt-0.5 block truncate text-[9.5px] text-muted-foreground">
              {ROLE_SHORT_LABELS[user.role]}
            </span>
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-[320px] p-0">
        <div className="rounded-t-lg bg-navy-950 px-4 pb-4 pt-4 text-white">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-sm font-semibold text-white">
              {userInitials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight">{user.name}</p>
              <p className="mt-0.5 truncate text-[10.5px] text-white/55">
                {ROLE_LABELS[user.role]}
              </p>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-saffron-300/25 bg-saffron-300/[0.08] px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-saffron-200">
                <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
                Authenticated session
              </span>
            </div>
          </div>
          <div className="mt-3.5 space-y-1 border-t border-white/10 pt-3 text-[10px] text-white/50">
            <p className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{user.email}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">
                {user.institutionName ?? "AICTE Regulation Bureau"}
                {user.institutionAicteId ? ` · ${user.institutionAicteId}` : ""}
              </span>
            </p>
          </div>
        </div>

        <div className="p-1.5">
          <DropdownMenuItem asChild className="py-2">
            <Link href="/dashboard">
              <LayoutDashboard className="text-muted-foreground" aria-hidden />
              Dashboard
            </Link>
          </DropdownMenuItem>
          {quickLink ? (
            <DropdownMenuItem asChild className="py-2">
              <Link href={quickLink.href}>
                {QuickIcon ? <QuickIcon className="text-muted-foreground" aria-hidden /> : null}
                {quickLink.label}
              </Link>
            </DropdownMenuItem>
          ) : null}
        </div>

        <DropdownMenuSeparator className="mx-0 my-0" />
        <div className="p-1.5">
          <form action={logoutAction}>
            <SignOutButton />
          </form>
        </div>
        <p className="border-t border-border/70 px-4 py-2.5 text-[9.5px] leading-relaxed text-muted-foreground">
          Your session is protected by a signed, HttpOnly cookie and expires after seven days.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
