"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Header, type NotificationItem } from "@/components/navigation/header";
import { Sidebar } from "@/components/navigation/sidebar";
import type { SessionUser } from "@/lib/session";

export function PortalShell({
  user,
  notifications,
  children,
}: {
  user: SessionUser;
  notifications: NotificationItem[];
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <Sidebar role={user.role} open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-col">
        <Header
          user={user}
          notifications={notifications}
          onOpenNav={() => setNavOpen(true)}
        />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1500px] flex-1 animate-fade-in px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
        <footer className="mx-auto w-full max-w-[1500px] border-t border-border/70 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-navy-700" aria-hidden />
              AICTE Regulation Bureau · Security Deposit &amp; FDR Management Portal
            </p>
            <nav
              aria-label="Portal resources"
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground"
            >
              <Link href="/about" className="transition-colors hover:text-foreground">
                About
              </Link>
              <span className="text-border" aria-hidden>
                ·
              </span>
              <Link href="/help" className="transition-colors hover:text-foreground">
                Help centre
              </Link>
              <span className="text-border" aria-hidden>
                ·
              </span>
              <Link href="/security" className="transition-colors hover:text-foreground">
                Security &amp; assurance
              </Link>
            </nav>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[9.5px] text-muted-foreground/75">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Secure workspace · Session protected · Every action recorded
          </p>
        </footer>
      </div>
    </div>
  );
}
