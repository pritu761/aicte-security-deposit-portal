"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BadgeCheck,
  Check,
  ChevronRight,
  CircleAlert,
  FileCheck2,
  FilePlus2,
  Loader2,
  Printer,
  Send,
  ShieldCheck,
  Stamp,
  X,
  XCircle,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  RELEASE_STATUS_LABELS,
  RELEASE_STATUS_STYLES,
  RELEASE_STEPS,
} from "@/lib/constants";
import type { ReleaseStatus, UserRole } from "@/db/schema";
import type { ReleasesData } from "@/lib/queries";
import {
  decideReleaseAction,
  requestReleaseAction,
  reviewReleaseAction,
} from "@/lib/actions/release";
import {
  cn,
  formatDate,
  formatDateTime,
  formatINR,
  maturityLabel,
} from "@/lib/utils";

type ReleaseRow = ReleasesData["rows"][number];

const filterOrder: (ReleaseStatus | "ALL")[] = [
  "ALL",
  "PENDING_SCRUTINY",
  "RECOMMENDED_BY_OFFICER",
  "APPROVED_RELEASED",
  "REJECTED",
];

function stepState(
  row: ReleaseRow,
  index: number,
): "complete" | "current" | "rejected" | "upcoming" {
  if (row.status === "REJECTED") {
    const rejectedAtScrutiny = Boolean(row.scrutinizedAt && !row.approvedAt);
    const rejectedAtApproval = Boolean(row.approvedAt);
    if (index === 0) return "complete";
    if (index === 1) return rejectedAtScrutiny ? "rejected" : "complete";
    if (index === 2) return rejectedAtApproval ? "rejected" : "upcoming";
    return "upcoming";
  }
  if (row.status === "APPROVED_RELEASED") return "complete";
  if (row.status === "PENDING_SCRUTINY") {
    if (index === 0) return "complete";
    if (index === 1) return "current";
    return "upcoming";
  }
  if (row.status === "RECOMMENDED_BY_OFFICER") {
    if (index <= 1) return "complete";
    if (index === 2) return "current";
    return "upcoming";
  }
  return "upcoming";
}

function StatusBadge({ status }: { status: ReleaseStatus }) {
  return (
    <Badge variant="outline" className={RELEASE_STATUS_STYLES[status]}>
      {RELEASE_STATUS_LABELS[status]}
    </Badge>
  );
}

function Stepper({ row }: { row: ReleaseRow }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-4">
      {RELEASE_STEPS.map((step, index) => {
        const state = stepState(row, index);
        return (
          <li
            key={step.key}
            className={cn(
              "relative rounded-lg border p-2.5",
              state === "complete" && "border-emerald-200 bg-emerald-50/60",
              state === "current" && "border-sky-300 bg-sky-50/70 ring-1 ring-sky-200",
              state === "rejected" && "border-rose-200 bg-rose-50/70",
              state === "upcoming" && "border-border bg-muted/20",
            )}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold",
                  state === "complete" && "bg-emerald-600 text-white",
                  state === "current" && "bg-sky-600 text-white",
                  state === "rejected" && "bg-rose-600 text-white",
                  state === "upcoming" && "border border-border bg-card text-muted-foreground",
                )}
              >
                {state === "complete" ? (
                  <Check className="h-3 w-3" aria-hidden />
                ) : state === "rejected" ? (
                  <X className="h-3 w-3" aria-hidden />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold leading-tight",
                  state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            <p className="mt-1.5 text-[9.5px] leading-snug text-muted-foreground">
              {step.description}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-1.5 last:border-0">
      <span className="text-[10.5px] text-muted-foreground">{label}</span>
      <span className="max-w-[65%] text-right text-[10.5px] font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

export function ReleasesClient({
  data,
  role,
  institutionName,
}: {
  data: ReleasesData;
  role: UserRole;
  institutionName: string | null;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(data.rows[0]?.id ?? null);
  const [filter, setFilter] = useState<ReleaseStatus | "ALL">("ALL");
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedFdrId, setSelectedFdrId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "ALL" ? data.rows : data.rows.filter((row) => row.status === filter)),
    [data.rows, filter],
  );
  const active =
    data.rows.find((row) => row.id === activeId) ?? filtered[0] ?? data.rows[0] ?? null;
  const selectedFdr = data.eligibleFdrs.find((fdr) => fdr.id === selectedFdrId) ?? null;

  const counts = useMemo(() => {
    const base: Record<ReleaseStatus | "ALL", number> = {
      ALL: data.rows.length,
      PENDING_SCRUTINY: 0,
      RECOMMENDED_BY_OFFICER: 0,
      REJECTED: 0,
      APPROVED_RELEASED: 0,
    };
    for (const row of data.rows) base[row.status] += 1;
    return base;
  }, [data.rows]);

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    setDialogError(null);
    if (!selectedFdrId) {
      setDialogError("Select the FDR you want released.");
      return;
    }
    if (reason.trim().length < 20) {
      setDialogError("Explain the reason for release in at least 20 characters.");
      return;
    }
    const formData = new FormData();
    formData.set("fdrId", selectedFdrId);
    formData.set("reason", reason.trim());
    setPendingAction("request");
    const result = await requestReleaseAction(formData);
    setPendingAction(null);
    if (result.status === "error") {
      setDialogError(result.message ?? "The release request could not be filed.");
      return;
    }
    toast.success("Release request submitted", { description: result.message });
    setRequestOpen(false);
    setReason("");
    setSelectedFdrId("");
    router.refresh();
  }

  async function review(decision: "recommend" | "reject") {
    if (!active) return;
    setActionError(null);
    if (decision === "reject" && notes.trim().length < 10) {
      setActionError("Record the reason for rejecting the request (at least 10 characters).");
      return;
    }
    const formData = new FormData();
    formData.set("requestId", active.id);
    formData.set("decision", decision);
    formData.set("notes", notes.trim());
    setPendingAction(decision);
    const result = await reviewReleaseAction(formData);
    setPendingAction(null);
    if (result.status === "error") {
      setActionError(result.message ?? "The review could not be recorded.");
      return;
    }
    toast.success(decision === "recommend" ? "Case recommended" : "Request rejected", {
      description: result.message,
    });
    setNotes("");
    router.refresh();
  }

  async function decide(decision: "approve" | "reject") {
    if (!active) return;
    setActionError(null);
    if (decision === "reject" && notes.trim().length < 10) {
      setActionError("Record the reason for rejecting the release (at least 10 characters).");
      return;
    }
    const formData = new FormData();
    formData.set("requestId", active.id);
    formData.set("decision", decision);
    formData.set("notes", notes.trim());
    setPendingAction(decision);
    const result = await decideReleaseAction(formData);
    setPendingAction(null);
    if (result.status === "error") {
      setActionError(result.message ?? "The decision could not be recorded.");
      return;
    }
    toast.success(decision === "approve" ? "Release authorised" : "Release rejected", {
      description: result.message,
    });
    setNotes("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {filterOrder.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-colors",
                filter === key
                  ? "border-navy-800 bg-navy-900 text-white"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
              aria-pressed={filter === key}
            >
              {key === "ALL" ? "All requests" : RELEASE_STATUS_LABELS[key]}
              <span className="ml-1.5 tabular-nums opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>
        {role === "INSTITUTION_ADMIN" ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setDialogError(null);
              setRequestOpen(true);
            }}
            disabled={!data.eligibleFdrs.length}
          >
            <FilePlus2 className="h-3.5 w-3.5" aria-hidden />
            Request release
          </Button>
        ) : null}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="text-sm">Release queue</CardTitle>
            <CardDescription>
              {filtered.length} of {data.rows.length} case{data.rows.length === 1 ? "" : "s"}
              {role === "INSTITUTION_ADMIN" ? " for your institution" : " across the bureau"}
            </CardDescription>
          </CardHeader>
          <div className="max-h-[680px] overflow-y-auto">
            {filtered.length ? (
              <ul className="divide-y divide-border/60">
                {filtered.map((row) => {
                  const selected = active?.id === row.id;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveId(row.id);
                          setActionError(null);
                          setNotes("");
                        }}
                        className={cn(
                          "flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors",
                          selected ? "bg-navy-50/70" : "hover:bg-muted/40",
                        )}
                        aria-pressed={selected}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold text-navy-900">
                            {row.fdrNumber}
                          </span>
                          <StatusBadge status={row.status} />
                        </span>
                        <span className="flex items-center justify-between gap-2">
                          <span className="max-w-[220px] truncate text-[10.5px] font-medium">
                            {row.institutionName}
                          </span>
                          <span className="metric-number text-[11px] font-semibold">
                            {formatINR(row.depositAmount, { compact: true })}
                          </span>
                        </span>
                        <span className="flex items-center justify-between gap-2 text-[9.5px] text-muted-foreground">
                          <span>{row.issuingBank}</span>
                          <span>{formatDate(row.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-4">
                <EmptyState
                  icon={BadgeCheck}
                  title="No cases in this view"
                  description={
                    filter === "ALL"
                      ? "Release requests will appear here once an institution raises one."
                      : "No release requests currently carry this status."
                  }
                  compact
                />
              </div>
            )}
          </div>
        </Card>

        {active ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="border-b border-border/70 pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="eyebrow">Release case</p>
                    <CardTitle className="mt-1 font-mono text-base">{active.fdrNumber}</CardTitle>
                    <CardDescription className="mt-1">
                      {active.institutionName} · {active.institutionAicteId}
                    </CardDescription>
                  </div>
                  <StatusBadge status={active.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <Stepper row={active} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <p className="data-label">Instrument</p>
                    <div className="mt-1.5">
                      <DetailRow label="Issuing bank" value={active.issuingBank} />
                      <DetailRow
                        label="Deposit amount"
                        value={formatINR(active.depositAmount)}
                      />
                      <DetailRow label="Maturity" value={formatDate(active.maturityDate)} />
                      <DetailRow
                        label="FDR status"
                        value={active.status === "APPROVED_RELEASED" ? "Released" : active.fdrStatus.replace(/_/g, " ").toLowerCase()}
                      />
                    </div>
                    <Button asChild variant="ghost" size="sm" className="mt-1.5 h-7 px-0 text-[10px]">
                      <Link href={`/scrutiny/${active.fdrId}`}>
                        Open FDR record
                        <ChevronRight className="h-3 w-3" aria-hidden />
                      </Link>
                    </Button>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <p className="data-label">Case record</p>
                    <div className="mt-1.5">
                      <DetailRow label="Raised by" value={active.requesterName ?? "Institution"} />
                      <DetailRow label="Raised on" value={formatDateTime(active.createdAt)} />
                      <DetailRow
                        label="Scrutiny"
                        value={
                          active.scrutinizerName
                            ? `${active.scrutinizerName} · ${formatDateTime(active.scrutinizedAt)}`
                            : "Pending"
                        }
                      />
                      <DetailRow
                        label="Decision"
                        value={
                          active.approverName
                            ? `${active.approverName} · ${formatDateTime(active.approvedAt)}`
                            : "Pending"
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 p-3">
                  <p className="data-label">Reason for release</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-foreground">{active.reason}</p>
                </div>

                {active.officerNotes ? (
                  <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-800">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                      Scrutiny observation
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-sky-950">{active.officerNotes}</p>
                  </div>
                ) : null}

                {active.approvalNote ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-800">
                      <Stamp className="h-3.5 w-3.5" aria-hidden />
                      Approval note
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-emerald-950">
                      {active.approvalNote}
                    </p>
                  </div>
                ) : null}

                {active.rejectionReason ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-800">
                      <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                      Rejection reason
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-rose-950">
                      {active.rejectionReason}
                    </p>
                  </div>
                ) : null}

                {role === "INSTITUTION_ADMIN" && active.status !== "APPROVED_RELEASED" ? (
                  <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
                    {active.status === "REJECTED"
                      ? "This case was returned. You may raise a fresh request once the underlying issue is resolved."
                      : "Your request is with the AICTE desk. The FDR register shows release-requested status until a decision is recorded."}
                  </p>
                ) : null}

                {role === "AICTE_SCRUTINY_OFFICER" && active.status === "PENDING_SCRUTINY" ? (
                  <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/50 p-3">
                    <Label htmlFor="officer-notes" className="text-[11px]">
                      Scrutiny note {""}
                      <span className="font-normal text-muted-foreground">
                        (required to reject)
                      </span>
                    </Label>
                    <Textarea
                      id="officer-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Documents verified. Bank confirmation matches the instrument. Eligible for release."
                      className="min-h-[86px] bg-white text-[11px]"
                    />
                    {actionError ? (
                      <p role="alert" className="text-[10.5px] font-medium text-destructive">
                        {actionError}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => review("recommend")}
                        disabled={pendingAction !== null}
                      >
                        {pendingAction === "recommend" ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Send className="h-3.5 w-3.5" aria-hidden />
                        )}
                        Recommend to Bureau Head
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50"
                        onClick={() => review("reject")}
                        disabled={pendingAction !== null}
                      >
                        {pendingAction === "reject" ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" aria-hidden />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : null}

                {role === "REGULATION_BUREAU_HEAD" && active.status === "RECOMMENDED_BY_OFFICER" ? (
                  <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/50 p-3">
                    <Label htmlFor="head-notes" className="text-[11px]">
                      Approval note {""}
                      <span className="font-normal text-muted-foreground">
                        (mandatory to reject)
                      </span>
                    </Label>
                    <Textarea
                      id="head-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Approved for release. Discharge voucher to be recorded against the instrument."
                      className="min-h-[86px] bg-white text-[11px]"
                    />
                    {actionError ? (
                      <p role="alert" className="text-[10.5px] font-medium text-destructive">
                        {actionError}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="success"
                        onClick={() => decide("approve")}
                        disabled={pendingAction !== null}
                      >
                        {pendingAction === "approve" ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <BadgeCheck className="h-4 w-4" aria-hidden />
                        )}
                        Authorise release
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50"
                        onClick={() => decide("reject")}
                        disabled={pendingAction !== null}
                      >
                        {pendingAction === "reject" ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" aria-hidden />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : null}

                {role === "AICTE_SCRUTINY_OFFICER" && active.status === "RECOMMENDED_BY_OFFICER" ? (
                  <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[10.5px] text-muted-foreground">
                    Recommended to the Regulation Bureau Head. Awaiting competent-authority
                    approval.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {active.status === "APPROVED_RELEASED" && active.dispatchReference ? (
              <AuthorizationReceipt
                row={active}
                authorisedBy={active.approverName ?? "Regulation Bureau Head"}
              />
            ) : null}
          </div>
        ) : (
          <Card>
            <CardContent className="py-14">
              <EmptyState
                icon={FileCheck2}
                title="Select a release case"
                description={
                  role === "INSTITUTION_ADMIN"
                    ? "Choose a case from the queue to see its approval progress. Raise a new request when an FDR is bank-confirmed and no successor exists."
                    : "Choose a case from the queue to review its evidence and record a decision."
                }
              />
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Request release of security deposit</DialogTitle>
            <DialogDescription>
              Only bank-confirmed instruments without an active release case or renewal successor
              are eligible. The request moves through scrutiny and Bureau Head approval.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRequest} className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Eligible FDR <span className="text-destructive">*</span>
              </Label>
              {data.eligibleFdrs.length ? (
                <Select value={selectedFdrId} onValueChange={setSelectedFdrId}>
                  <SelectTrigger aria-label="Select FDR for release">
                    <SelectValue placeholder="Select a bank-confirmed FDR" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.eligibleFdrs.map((fdr) => (
                      <SelectItem key={fdr.id} value={fdr.id}>
                        <span className="font-mono text-[11px]">{fdr.fdrNumber}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground">
                          {formatINR(fdr.depositAmount, { compact: true })} · {formatDate(fdr.maturityDate)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[10.5px] leading-relaxed text-amber-900">
                  No eligible FDR is currently available. Instruments must be bank-confirmed, not
                  released, without an active request or renewal successor.
                </p>
              )}
            </div>

            {selectedFdr ? (
              <div className="rounded-lg border border-navy-200 bg-navy-50/40 p-3 text-[10.5px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-navy-900">{selectedFdr.fdrNumber}</span>
                  <FdrMiniStatus status={selectedFdr.status} />
                </div>
                <p className="mt-1 text-muted-foreground">
                  {selectedFdr.issuingBank} · {formatINR(selectedFdr.depositAmount)} · matures{" "}
                  {formatDate(selectedFdr.maturityDate)} ({maturityLabel(selectedFdr.maturityDate).label})
                </p>
                <p className="mt-1 text-muted-foreground">
                  Institution: {institutionName ?? selectedFdr.institutionName}
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="release-reason">
                Reason for release <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="release-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="The institution has closed the underlying course and requests refund of the security deposit after settling all AICTE dues."
                minLength={20}
                required
                className="min-h-[110px]"
              />
              <p className="text-[10px] text-muted-foreground">
                Minimum 20 characters. This text is visible to the scrutiny officer and Bureau
                Head.
              </p>
            </div>

            {dialogError ? (
              <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-800">
                {dialogError}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pendingAction !== null || !data.eligibleFdrs.length}>
                {pendingAction === "request" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                Submit request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FdrMiniStatus({ status }: { status: ReleaseRow["fdrStatus"] }) {
  return (
    <Badge variant="outline" className="text-[9px] text-muted-foreground">
      {status.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
}

function AuthorizationReceipt({
  row,
  authorisedBy,
}: {
  row: ReleaseRow;
  authorisedBy: string;
}) {
  return (
    <Card className="overflow-hidden border-emerald-200">
      <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-emerald-200 bg-emerald-50/60 pb-3 print-hide">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BadgeCheck className="h-4 w-4 text-emerald-700" aria-hidden />
            Release authorised
          </CardTitle>
          <CardDescription className="mt-1">
            The dispatch reference below is the authorisation receipt for this release.
          </CardDescription>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" aria-hidden />
          Print receipt
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div id="print-receipt" className="bg-white p-6">
          <div className="flex items-start justify-between gap-4 border-b-2 border-navy-900 pb-3">
            <div>
              <p className="font-display text-lg font-semibold leading-tight text-navy-900">
                FDR Setu
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                All India Council for Technical Education · Regulation Bureau
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Authorisation receipt
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-foreground">
                {row.dispatchReference}
              </p>
            </div>
          </div>

          <h2 className="mt-4 font-display text-[15px] font-semibold text-navy-900">
            Authorisation for release of security deposit
          </h2>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Pursuant to the security deposit and FDR regulations, the Regulation Bureau authorises
            the release of the instrument detailed below to the institution named.
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[10px]">
            {[
              ["Dispatch reference", row.dispatchReference],
              ["Authorised on", formatDateTime(row.approvedAt)],
              ["Institution", row.institutionName],
              ["AICTE ID", row.institutionAicteId],
              ["FDR number", row.fdrNumber],
              ["Issuing bank", row.issuingBank],
              ["Deposit amount", formatINR(row.depositAmount)],
              ["Maturity date", formatDate(row.maturityDate)],
              ["Case raised", formatDateTime(row.createdAt)],
              ["Scrutinised by", row.scrutinizerName ?? "—"],
              ["Authorised by", authorisedBy],
              ["Case identifier", row.id.slice(0, 8).toUpperCase()],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-border/50 pb-1">
                <dt className="text-[8.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-2.5 text-[9px] leading-relaxed text-amber-900">
            <span className="font-semibold">Instrument status:</span> marked RELEASED on the AICTE
            register. The receiving bank must record the discharge voucher against the instrument
            before funds are credited.
          </div>

          <div className="mt-8 flex items-end justify-between">
            <div>
              <div className="h-8 w-40 border-b border-foreground/40" />
              <p className="mt-1 text-[9px] font-semibold text-foreground">{authorisedBy}</p>
              <p className="text-[8.5px] text-muted-foreground">
                Competent Authority · Regulation Bureau
              </p>
            </div>
            <div className="text-right">
              <div className="ml-auto flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-emerald-400 text-[7.5px] font-semibold uppercase leading-tight text-emerald-700">
                AICTE
                <br />
                Released
              </div>
            </div>
          </div>

          <p className="mt-4 border-t border-border pt-2 text-[8px] leading-relaxed text-muted-foreground">
            System-generated authorisation receipt. The dispatch reference, competent authority
            and approval timestamp are recorded in the immutable audit trail. Verify this
            reference before the receiving bank discharges the original instrument.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
