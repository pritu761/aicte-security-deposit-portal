"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Braces,
  ChevronRight,
  FilterX,
  History,
  Loader2,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AUDIT_ACTION_LABELS, ROLE_LABELS, ROLE_SHORT_LABELS } from "@/lib/constants";
import type { AuditData } from "@/lib/queries";
import { cn, formatDateTime, titleCase } from "@/lib/utils";

type AuditRow = NonNullable<AuditData>["rows"][number];

const ALL = "ALL";

function actionTone(action: string): string {
  if (action.includes("REJECT") || action.includes("DISCREPANCY")) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  if (action.includes("APPROVED") || action.includes("VERIFIED")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (action.includes("REQUEST") || action.includes("RECOMMEND")) {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }
  if (action.includes("EXPORT")) {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function entityHref(row: AuditRow): string | null {
  if (row.entityType === "fdr" && /^[0-9a-f-]{36}$/i.test(row.entityId)) {
    return `/scrutiny/${row.entityId}`;
  }
  if (row.entityType === "release") return "/releases";
  return null;
}

function valueText(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function summaryText(row: AuditRow): string {
  const details = (row.details ?? {}) as Record<string, unknown>;
  const bits: string[] = [];
  if (typeof details.fdrNumber === "string") bits.push(details.fdrNumber);
  if (typeof details.amount === "number" || typeof details.amount === "string") {
    const amount = Number(details.amount);
    if (Number.isFinite(amount)) {
      bits.push(
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(amount),
      );
    }
  }
  if (typeof details.remarks === "string" && details.remarks) bits.push(details.remarks);
  if (typeof details.reason === "string" && details.reason) bits.push(details.reason);
  if (typeof details.dispatchReference === "string") bits.push(details.dispatchReference);
  if (typeof details.format === "string") bits.push(`${details.format.toUpperCase()} export`);
  if (typeof details.fileName === "string") bits.push(details.fileName);
  return bits.join(" · ");
}

function FilterBar({
  initial,
  actionOptions,
  actorOptions,
  pending,
  onNavigate,
}: {
  initial: { q: string; action: string; entityType: string; userId: string };
  actionOptions: string[];
  actorOptions: { id: string; name: string; role: string }[];
  pending: boolean;
  onNavigate: (next: {
    q?: string;
    action?: string;
    entityType?: string;
    userId?: string;
    page?: number;
  }) => void;
}) {
  const [q, setQ] = useState(initial.q);
  const [action, setAction] = useState(initial.action || ALL);
  const [entityType, setEntityType] = useState(initial.entityType || ALL);
  const [userId, setUserId] = useState(initial.userId || ALL);

  const activeCount = [
    q.trim().length > 0,
    action !== ALL,
    entityType !== ALL,
    userId !== ALL,
  ].filter(Boolean).length;

  function apply(next?: Partial<{ q: string; action: string; entityType: string; userId: string }>) {
    onNavigate({
      q: next?.q ?? q,
      action: (next?.action ?? action) === ALL ? "" : (next?.action ?? action),
      entityType: (next?.entityType ?? entityType) === ALL ? "" : (next?.entityType ?? entityType),
      userId: (next?.userId ?? userId) === ALL ? "" : (next?.userId ?? userId),
      page: 1,
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <form
          className="min-w-0 flex-1"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            apply({ q });
          }}
        >
          <Label htmlFor="audit-search" className="data-label">
            Search audit payload
          </Label>
          <div className="relative mt-1.5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="audit-search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Action, actor, FDR number, dispatch reference, JSON value…"
              className="pl-9"
              autoComplete="off"
            />
          </div>
        </form>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto">
          <div>
            <Label className="data-label">Action</Label>
            <Select
              value={action}
              onValueChange={(value) => {
                setAction(value);
                apply({ action: value });
              }}
            >
              <SelectTrigger className="mt-1.5 h-10" aria-label="Filter by audit action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All actions</SelectItem>
                {actionOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {AUDIT_ACTION_LABELS[option] ?? titleCase(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="data-label">Entity</Label>
            <Select
              value={entityType}
              onValueChange={(value) => {
                setEntityType(value);
                apply({ entityType: value });
              }}
            >
              <SelectTrigger className="mt-1.5 h-10" aria-label="Filter by entity type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All entities</SelectItem>
                {["fdr", "release", "user", "report"].map((option) => (
                  <SelectItem key={option} value={option}>
                    {titleCase(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label className="data-label">Actor</Label>
            <Select
              value={userId}
              onValueChange={(value) => {
                setUserId(value);
                apply({ userId: value });
              }}
            >
              <SelectTrigger className="mt-1.5 h-10" aria-label="Filter by actor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All actors</SelectItem>
                {actorOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
        <Button type="button" size="sm" onClick={() => apply()} disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          )}
          Apply filters
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending || activeCount === 0}
          onClick={() => {
            setQ("");
            setAction(ALL);
            setEntityType(ALL);
            setUserId(ALL);
            onNavigate({ q: "", action: "", entityType: "", userId: "", page: 1 });
          }}
        >
          <FilterX className="h-3.5 w-3.5" aria-hidden />
          Clear
        </Button>
        {activeCount ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {activeCount} active
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          Append-only log · updates are blocked at the database level
        </span>
      </div>
    </div>
  );
}

function DiffViewer({ row }: { row: AuditRow }) {
  const details = (row.details ?? {}) as Record<string, unknown>;
  const before =
    details.before && typeof details.before === "object"
      ? (details.before as Record<string, unknown>)
      : null;
  const after =
    details.after && typeof details.after === "object"
      ? (details.after as Record<string, unknown>)
      : null;

  const keys = useMemo(() => {
    if (!before && !after) return [];
    return Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
  }, [before, after]);

  const changed = keys.filter(
    (key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]),
  );

  const rest = Object.fromEntries(
    Object.entries(details).filter(([key]) => key !== "before" && key !== "after"),
  );

  return (
    <div className="space-y-4">
      {keys.length ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-border bg-muted/50 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <span>Field</span>
            <span>Before</span>
            <span>After</span>
          </div>
          {keys.map((key) => {
            const isChanged = changed.includes(key);
            const isAdded = before?.[key] === undefined && after?.[key] !== undefined;
            const isRemoved = before?.[key] !== undefined && after?.[key] === undefined;
            return (
              <div
                key={key}
                className={cn(
                  "grid grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-border/50 px-3 py-2 font-mono text-[10px] last:border-0",
                  isChanged && "bg-amber-50/60",
                )}
              >
                <span className="break-all font-sans font-medium text-foreground">{key}</span>
                <span
                  className={cn(
                    "break-all",
                    isRemoved ? "text-rose-700 line-through" : "text-muted-foreground",
                  )}
                >
                  {valueText(before?.[key])}
                </span>
                <span
                  className={cn(
                    "break-all",
                    isAdded ? "font-semibold text-emerald-700" : isChanged ? "font-semibold text-amber-900" : "text-muted-foreground",
                  )}
                >
                  {valueText(after?.[key])}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-[10.5px] text-muted-foreground">
          This event does not carry a before/after state diff. The full payload is shown below.
        </p>
      )}

      {Object.keys(rest).length ? (
        <div>
          <p className="data-label mb-1.5">Event payload</p>
          <div className="max-h-[240px] overflow-auto rounded-lg bg-navy-950 p-3">
            <pre className="whitespace-pre-wrap break-all font-mono text-[10.5px] leading-relaxed text-emerald-100/90">
              {JSON.stringify(rest, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}

      <div>
        <p className="data-label mb-1.5">Raw record</p>
        <div className="max-h-[220px] overflow-auto rounded-lg border border-border bg-muted/30 p-3">
          <pre className="whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-muted-foreground">
            {JSON.stringify(
              {
                id: row.id,
                action: row.action,
                entityType: row.entityType,
                entityId: row.entityId,
                createdAt: row.createdAt,
                actor: { id: row.userId, name: row.userName, role: row.userRole },
                details: row.details,
              },
              null,
              2,
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function AuditClient({
  data,
  initial,
}: {
  data: AuditData;
  initial: { q: string; action: string; entityType: string; userId: string; page: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<AuditRow | null>(null);

  function navigate(next: {
    q?: string;
    action?: string;
    entityType?: string;
    userId?: string;
    page?: number;
  }) {
    const params = new URLSearchParams();
    const merged = {
      q: next.q ?? initial.q,
      action: next.action ?? initial.action,
      entityType: next.entityType ?? initial.entityType,
      userId: next.userId ?? initial.userId,
      page: next.page ?? 1,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== "" && !(key === "page" && value === 1)) {
        params.set(key, String(value));
      }
    }
    startTransition(() => {
      router.push(`/audit${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  const firstRow = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const lastRow = Math.min(data.page * data.pageSize, data.total);

  return (
    <div className="space-y-4">
      <FilterBar
        initial={initial}
        actionOptions={data.actionOptions}
        actorOptions={data.actorOptions}
        pending={pending}
        onNavigate={navigate}
      />

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4 text-navy-700" aria-hidden />
              Immutable event log
            </h2>
            <p className="text-[10.5px] text-muted-foreground">
              {data.total
                ? `Showing ${firstRow}–${lastRow} of ${data.total} matching events`
                : "No events match the current filters"}
            </p>
          </div>
          <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-800">
            Database-enforced append-only
          </Badge>
        </div>

        {data.rows.length ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Timestamp (IST)</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Payload summary</TableHead>
                <TableHead className="pr-4 text-right">Inspect</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => {
                const href = entityHref(row);
                return (
                  <TableRow key={row.id} className="group">
                    <TableCell className="whitespace-nowrap pl-4 font-mono text-[10px] text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell>
                      <p className="flex items-center gap-1.5 text-[11px] font-medium">
                        <UserRound className="h-3 w-3 text-muted-foreground" aria-hidden />
                        {row.userName}
                      </p>
                      <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                        {row.userRole ? ROLE_SHORT_LABELS[row.userRole] : "System"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[9.5px]", actionTone(row.action))}>
                        {AUDIT_ACTION_LABELS[row.action] ?? titleCase(row.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-[10px] font-medium">{titleCase(row.entityType)}</p>
                      {href ? (
                        <Link
                          href={href}
                          className="mt-0.5 inline-flex items-center gap-0.5 font-mono text-[9px] text-primary hover:underline"
                        >
                          {row.entityId.slice(0, 8)}
                          <ChevronRight className="h-2.5 w-2.5" aria-hidden />
                        </Link>
                      ) : (
                        <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                          {row.entityId.slice(0, 8)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[360px] truncate text-[10.5px] text-muted-foreground">
                        {summaryText(row) || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelected(row)}
                      >
                        <Braces className="h-3.5 w-3.5" aria-hidden />
                        JSON
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="p-4">
            <EmptyState
              icon={History}
              title="No audit events match"
              description="Try a broader search, or clear the action, entity or actor filters."
              action={
                <Button type="button" variant="outline" size="sm" onClick={() => navigate({ q: "", action: "", entityType: "", userId: "", page: 1 })}>
                  Reset audit filters
                </Button>
              }
            />
          </div>
        )}

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/70 px-4 py-3 sm:flex-row">
          <p className="text-[10.5px] text-muted-foreground">
            Page {data.page} of {data.pageCount} · {data.pageSize} events per page
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || data.page <= 1}
              onClick={() => navigate({ page: data.page - 1 })}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Previous
            </Button>
            <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-[10.5px] font-medium">
              {data.page} / {data.pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || data.page >= data.pageCount}
              onClick={() => navigate({ page: data.page + 1 })}
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  <Braces className="h-4 w-4 text-navy-700" aria-hidden />
                  {AUDIT_ACTION_LABELS[selected.action] ?? titleCase(selected.action)}
                  <Badge variant="outline" className={actionTone(selected.action)}>
                    {selected.action}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selected.userName}
                  {selected.userRole ? ` · ${ROLE_LABELS[selected.userRole]}` : ""} ·{" "}
                  {formatDateTime(selected.createdAt)} · {titleCase(selected.entityType)}{" "}
                  <span className="font-mono">{selected.entityId.slice(0, 8)}</span>
                </DialogDescription>
              </DialogHeader>
              <DiffViewer row={selected} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
