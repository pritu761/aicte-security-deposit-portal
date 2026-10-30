"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS, ROLE_SHORT_LABELS } from "@/lib/constants";
import type { UserRole } from "@/db/schema";
import { switchRoleAction } from "@/lib/actions/session";
import { cn } from "@/lib/utils";

const roles: UserRole[] = [
  "INSTITUTION_ADMIN",
  "AICTE_SCRUTINY_OFFICER",
  "REGULATION_BUREAU_HEAD",
];

export function RoleSwitcher({
  role,
  compact = false,
  className,
}: {
  role: UserRole;
  compact?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(next: string) {
    if (next === role) return;
    startTransition(async () => {
      try {
        await switchRoleAction(next);
        router.refresh();
      } catch (error) {
        if (error instanceof Error && (error.message === "NEXT_REDIRECT" || error.name === "NEXT_REDIRECT")) {
          return;
        }
        toast.error("Could not switch demo role", {
          description: error instanceof Error ? error.message : "Please try again.",
        });
      }
    });
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!compact ? (
        <span className="hidden items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800 xl:inline-flex">
          Demo
        </span>
      ) : null}
      <div className="relative">
        <ShieldCheck
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Select value={role} onValueChange={handleChange} disabled={pending}>
          <SelectTrigger
            aria-label="Switch demo role"
            className={cn(
              "h-9 w-[190px] border-border/90 bg-white pl-8 text-xs font-medium shadow-sm sm:w-[224px]",
              pending && "opacity-70",
            )}
          >
            <SelectValue />
            {pending ? (
              <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
            ) : null}
          </SelectTrigger>
          <SelectContent align="end" className="w-[280px]">
            {roles.map((option) => (
              <SelectItem key={option} value={option} className="py-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{ROLE_LABELS[option]}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {ROLE_SHORT_LABELS[option]} workspace
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
