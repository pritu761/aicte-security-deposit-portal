"use client";

import { useEffect, useState } from "react";
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
          className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
        <footer className="mx-auto flex w-full max-w-[1500px] flex-col gap-2 border-t border-border/70 px-4 py-4 text-[10.5px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-navy-700" aria-hidden />
            AICTE Regulation Bureau · Security Deposit &amp; FDR Management Portal
          </p>
          <p>
            Demonstration prototype · Data is synthetic · Not an official Government of India
            system
          </p>
        </footer>
      </div>
    </div>
  );
}
