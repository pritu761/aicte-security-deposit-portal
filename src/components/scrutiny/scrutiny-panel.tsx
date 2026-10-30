"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileText,
  Landmark,
  Loader2,
  MessageSquarePlus,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { VerificationBadge } from "@/components/verification-badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FdrDetail } from "@/lib/queries";
import {
  DOCUMENT_TYPE_LABELS,
  MAX_DOCUMENT_MB,
} from "@/lib/constants";
import type { DocumentType, UserRole } from "@/db/schema";
import {
  flagDiscrepancyAction,
  recordScrutinyNoteAction,
  uploadDocumentAction,
  verifyFdrAction,
} from "@/lib/actions/fdr";
import {
  cn,
  formatDate,
  formatDateTime,
  formatFileSize,
  formatINR,
  toNumber,
} from "@/lib/utils";
import { MAX_UPLOAD_BYTES } from "@/lib/validation";

const accepted = ["application/pdf", "image/png", "image/jpeg"];

function fileError(file: File | null): string | null {
  if (!file) return null;
  if (file.size > MAX_UPLOAD_BYTES) return `Document must be ${MAX_DOCUMENT_MB} MB or smaller.`;
  if (!accepted.includes(file.type)) return "Only PDF, PNG or JPEG files are accepted.";
  return null;
}

function submitted(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function ScrutinyPanel({
  detail,
  role,
}: {
  detail: FdrDetail;
  role: UserRole;
}) {
  const router = useRouter();
  const [activeDocId, setActiveDocId] = useState<string | null>(
    detail.documents[0]?.id ?? null,
  );
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [pending, setPending] = useState(false);
  const [bankRef, setBankRef] = useState("");
  const [verifyRemarks, setVerifyRemarks] = useState("");
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyFileError, setVerifyFileError] = useState<string | null>(null);
  const [flagRemarks, setFlagRemarks] = useState("");
  const [note, setNote] = useState("");
  const [uploadType, setUploadType] = useState<DocumentType>("ORIGINAL_FDR_SCAN");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeDoc = useMemo(
    () =>
      detail.documents.find((document) => document.id === activeDocId) ??
      detail.documents[0] ??
      null,
    [detail.documents, activeDocId],
  );

  const bank = detail.fdr.bankVerifiedData;
  const confirmed = detail.fdr.verificationStatus === "BANK_CONFIRMED";
  const flagged = detail.fdr.verificationStatus === "DISCREPANCY_FOUND";
  const released = detail.fdr.status === "RELEASED";
  const canAct = role === "AICTE_SCRUTINY_OFFICER" && !released;

  const rows = [
    {
      label: "Issuing bank",
      submitted: submitted(detail.fdr.issuingBank),
      bank: submitted(bank?.issuingBank),
      match:
        !bank?.issuingBank ||
        String(bank.issuingBank).toLowerCase() === detail.fdr.issuingBank.toLowerCase(),
      wide: true,
    },
    {
      label: "Branch",
      submitted: submitted(detail.fdr.branchName),
      bank: submitted(bank?.branchName),
      match: !bank?.branchName || bank.branchName === detail.fdr.branchName,
    },
    {
      label: "IFSC",
      submitted: detail.fdr.ifscCode,
      bank: submitted(bank?.ifscCode),
      match: !bank?.ifscCode || bank.ifscCode === detail.fdr.ifscCode,
    },
    {
      label: "Deposit amount",
      submitted: formatINR(toNumber(detail.fdr.depositAmount)),
      bank: bank?.depositAmount ? formatINR(toNumber(bank.depositAmount)) : "—",
      match:
        !bank?.depositAmount ||
        toNumber(bank.depositAmount) === toNumber(detail.fdr.depositAmount),
      wide: true,
    },
    {
      label: "Issue date",
      submitted: formatDate(detail.fdr.issueDate),
      bank: bank?.issueDate ? formatDate(bank.issueDate) : "—",
      match: !bank?.issueDate || bank.issueDate === detail.fdr.issueDate,
    },
    {
      label: "Maturity date",
      submitted: formatDate(detail.fdr.maturityDate),
      bank: bank?.maturityDate ? formatDate(bank.maturityDate) : "—",
      match: !bank?.maturityDate || bank.maturityDate === detail.fdr.maturityDate,
    },
    {
      label: "Joint holder",
      submitted: detail.fdr.jointAccountHolder,
      bank: "Regional Officer, AICTE",
      match: true,
      wide: true,
    },
  ];

  const mismatches = confirmed ? rows.filter((row) => !row.match).length : 0;
  const remarks = detail.fdr.scrutinyRemarks
    ?.split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  const uploadTypes: DocumentType[] =
    role === "INSTITUTION_ADMIN"
      ? ["ORIGINAL_FDR_SCAN", "BANK_CONFIRMATION_LETTER"]
      : ["ORIGINAL_FDR_SCAN", "BANK_CONFIRMATION_LETTER", "DISCHARGE_VOUCHER"];

  async function submitVerify(event: React.FormEvent) {
    event.preventDefault();
    setActionError(null);
    if (bankRef.trim().length < 4) {
      setActionError("Enter the bank confirmation reference (at least 4 characters).");
      return;
    }
    const problem = fileError(verifyFile);
    if (problem) {
      setVerifyFileError(problem);
      return;
    }
    const formData = new FormData();
    formData.set("fdrId", detail.fdr.id);
    formData.set("bankConfirmationRef", bankRef.trim());
    formData.set("remarks", verifyRemarks);
    if (verifyFile) formData.set("bankConfirmation", verifyFile);
    setPending(true);
    const result = await verifyFdrAction(formData);
    setPending(false);
    if (result.status === "error") {
      setActionError(result.message ?? "Verification could not be recorded.");
      return;
    }
    toast.success("Record verified as bank-confirmed", {
      description: result.message,
    });
    setVerifyOpen(false);
    setBankRef("");
    setVerifyRemarks("");
    setVerifyFile(null);
    router.refresh();
  }

  async function submitFlag(event: React.FormEvent) {
    event.preventDefault();
    setActionError(null);
    if (flagRemarks.trim().length < 10) {
      setActionError("Describe the discrepancy in at least 10 characters.");
      return;
    }
    const formData = new FormData();
    formData.set("fdrId", detail.fdr.id);
    formData.set("remarks", flagRemarks);
    setPending(true);
    const result = await flagDiscrepancyAction(formData);
    setPending(false);
    if (result.status === "error") {
      setActionError(result.message ?? "The discrepancy could not be recorded.");
      return;
    }
    toast.success("Discrepancy flagged", { description: result.message });
    setFlagOpen(false);
    setFlagRemarks("");
    router.refresh();
  }

  async function submitNote(event: React.FormEvent) {
    event.preventDefault();
    setActionError(null);
    if (note.trim().length < 5) {
      setActionError("Enter a scrutiny observation of at least 5 characters.");
      return;
    }
    const formData = new FormData();
    formData.set("fdrId", detail.fdr.id);
    formData.set("remarks", note);
    setPending(true);
    const result = await recordScrutinyNoteAction(formData);
    setPending(false);
    if (result.status === "error") {
      setActionError(result.message ?? "The observation could not be recorded.");
      return;
    }
    toast.success("Observation recorded", { description: result.message });
    setNoteOpen(false);
    setNote("");
    router.refresh();
  }

  async function submitUpload(event: React.FormEvent) {
    event.preventDefault();
    setActionError(null);
    if (!uploadFile) {
      setUploadError("Choose a PDF, PNG or JPEG document.");
      return;
    }
    const problem = fileError(uploadFile);
    if (problem) {
      setUploadError(problem);
      return;
    }
    const formData = new FormData();
    formData.set("fdrId", detail.fdr.id);
    formData.set("docType", uploadType);
    formData.set("document", uploadFile);
    setPending(true);
    const result = await uploadDocumentAction(formData);
    setPending(false);
    if (result.status === "error") {
      setActionError(result.message ?? "The document could not be uploaded.");
      return;
    }
    toast.success("Document uploaded", { description: result.message });
    setUploadOpen(false);
    setUploadFile(null);
    router.refresh();
  }

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-border/70 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-navy-700" aria-hidden />
                Document evidence
              </CardTitle>
              <CardDescription className="mt-1">
                Original bank-issued instrument and verification correspondence.
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0 border-teal-200 bg-teal-50 text-teal-800">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Encrypted vault
            </Badge>
          </CardHeader>

          {detail.documents.length ? (
            <>
              <div className="flex gap-1 overflow-x-auto border-b border-border/70 bg-muted/20 px-3 py-2" role="tablist" aria-label="FDR documents">
                {detail.documents.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    role="tab"
                    aria-selected={activeDoc?.id === document.id}
                    onClick={() => setActiveDocId(document.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10.5px] font-medium transition-colors",
                      activeDoc?.id === document.id
                        ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
                    )}
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    {DOCUMENT_TYPE_LABELS[document.docType]}
                  </button>
                ))}
              </div>

              {activeDoc ? (
                <div className="bg-slate-100/80 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-card px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium">{activeDoc.fileName}</p>
                      <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                        {DOCUMENT_TYPE_LABELS[activeDoc.docType]} · {formatFileSize(activeDoc.sizeBytes)} ·{" "}
                        {activeDoc.uploadedByName ?? "Institution"} · {formatDateTime(activeDoc.uploadedAt)}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <a href={activeDoc.fileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        Open
                      </a>
                    </Button>
                  </div>

                  <div className="overflow-hidden rounded-md border border-border bg-slate-700/5">
                    {activeDoc.mimeType === "application/pdf" ? (
                      <iframe
                        key={activeDoc.id}
                        src={activeDoc.fileUrl}
                        title={`${DOCUMENT_TYPE_LABELS[activeDoc.docType]} for ${detail.fdr.fdrNumber}`}
                        className="h-[520px] w-full bg-white"
                      />
                    ) : activeDoc.mimeType.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={activeDoc.id}
                        src={activeDoc.fileUrl}
                        alt={`${DOCUMENT_TYPE_LABELS[activeDoc.docType]} for ${detail.fdr.fdrNumber}`}
                        className="max-h-[520px] w-full bg-white object-contain"
                      />
                    ) : (
                      <div className="flex h-[320px] flex-col items-center justify-center gap-2 bg-card text-xs text-muted-foreground">
                        <FileText className="h-7 w-7" aria-hidden />
                        Preview is not available for this file type.
                      </div>
                    )}
                  </div>

                  <div className="mt-2 rounded-md border border-border/70 bg-card p-2.5">
                    <p className="data-label">Document fingerprint</p>
                    <p className="hash mt-1">SHA-256 · {activeDoc.sha256}</p>
                    <p className="mt-1 text-[9.5px] text-muted-foreground">
                      The stored object is AES-256-GCM encrypted and served through an authorised
                      portal route. Preview is read-only.
                    </p>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <CardContent className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="mt-2 text-sm font-semibold">No documents attached</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                The institution has not uploaded the FDR certificate. Use the document action to add
                evidence if you are authorised.
              </p>
            </CardContent>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-border/70 pb-3">
              <div>
                <CardTitle>Particulars comparison</CardTitle>
                <CardDescription className="mt-1">
                  Institution declaration against the authorised bank record.
                </CardDescription>
              </div>
              <VerificationBadge status={detail.fdr.verificationStatus} />
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {flagged ? (
                <div role="alert" className="flex gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11px] leading-relaxed text-rose-900">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold">Discrepancy under resolution</p>
                    <p className="mt-0.5">
                      {detail.fdr.scrutinyRemarks ??
                        "The scrutiny desk has requested corrected evidence."}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                  <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    <Building2 className="h-3.5 w-3.5" aria-hidden />
                    Submitted by institution
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-800">
                    {detail.submitterName ?? "Institution administrator"}
                  </p>
                  <p className="mt-0.5 text-[9.5px] text-slate-500">
                    Filed {formatDate(detail.fdr.createdAt)}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-lg border p-2.5",
                    confirmed
                      ? "border-teal-200 bg-teal-50/70"
                      : "border-dashed border-slate-200 bg-slate-50/40",
                  )}
                >
                  <p
                    className={cn(
                      "flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.1em]",
                      confirmed ? "text-teal-700" : "text-slate-400",
                    )}
                  >
                    <Landmark className="h-3.5 w-3.5" aria-hidden />
                    Authorised bank source
                  </p>
                  <p className={cn("mt-1 text-[11px] font-medium", confirmed ? "text-teal-900" : "text-slate-500")}>
                    {confirmed
                      ? detail.verifierName ?? "AICTE scrutiny desk"
                      : "Awaiting independent confirmation"}
                  </p>
                  <p className="mt-0.5 text-[9.5px] text-slate-500">
                    {detail.fdr.verifiedAt
                      ? `Verified ${formatDate(detail.fdr.verifiedAt)}`
                      : "No bank evidence verified yet"}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <div className="grid grid-cols-[84px_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-border bg-muted/40 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <span>Field</span>
                  <span>Institution</span>
                  <span className="flex items-center gap-1 text-teal-800">
                    <Landmark className="h-3 w-3" aria-hidden />
                    Bank source
                  </span>
                </div>
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className={cn(
                      "grid grid-cols-[84px_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-border/50 px-2.5 py-2 text-[10.5px] last:border-0",
                      confirmed && !row.match && "bg-rose-50/60",
                    )}
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="min-w-0 break-words font-medium text-foreground">
                      {row.submitted}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 break-words",
                        confirmed && row.match
                          ? "text-teal-900"
                          : confirmed
                            ? "font-semibold text-rose-700"
                            : "text-muted-foreground",
                      )}
                    >
                      {confirmed ? (
                        <span className="inline-flex items-center gap-1">
                          {row.match ? (
                            <Check className="h-3 w-3 shrink-0 text-teal-600" aria-hidden />
                          ) : (
                            <AlertTriangle className="h-3 w-3 shrink-0 text-rose-600" aria-hidden />
                          )}
                          {row.bank}
                        </span>
                      ) : (
                        row.bank
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {confirmed && mismatches === 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[10.5px] text-emerald-900">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Declared particulars match the authorised bank confirmation.
                </div>
              ) : null}

              <div className="grid gap-2 text-[10.5px] sm:grid-cols-2">
                <div className="rounded-md border border-border/70 p-2.5">
                  <p className="data-label">Bank confirmation reference</p>
                  <p className="mt-1 break-words font-mono text-[10px]">
                    {detail.fdr.bankConfirmationRef ?? "Not recorded"}
                  </p>
                </div>
                <div className="rounded-md border border-border/70 p-2.5">
                  <p className="data-label">Verified on</p>
                  <p className="mt-1">{formatDateTime(detail.fdr.verifiedAt)}</p>
                </div>
              </div>

              {remarks?.length ? (
                <div className="rounded-md border border-border/70 bg-muted/20 p-3">
                  <p className="data-label">Scrutiny observations</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {remarks.map((remark, index) => (
                      <li key={`${remark.slice(0, 12)}-${index}`} className="flex gap-2 text-[10.5px] leading-relaxed text-muted-foreground">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-saffron-400" aria-hidden />
                        {remark}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
                {canAct ? (
                  <>
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      onClick={() => {
                        setActionError(null);
                        setVerifyOpen(true);
                      }}
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden />
                      Verify as bank-confirmed
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50"
                      onClick={() => {
                        setActionError(null);
                        setFlagOpen(true);
                      }}
                    >
                      <ShieldAlert className="h-4 w-4" aria-hidden />
                      Flag discrepancy
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActionError(null);
                        setNoteOpen(true);
                      }}
                    >
                      <MessageSquarePlus className="h-4 w-4" aria-hidden />
                      Add observation
                    </Button>
                  </>
                ) : role === "INSTITUTION_ADMIN" && !released ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActionError(null);
                      setUploadOpen(true);
                    }}
                  >
                    <Upload className="h-4 w-4" aria-hidden />
                    Upload document
                  </Button>
                ) : role === "REGULATION_BUREAU_HEAD" ? (
                  <p className="text-[10.5px] text-muted-foreground">
                    Bureau Head access is read-only for scrutiny evidence. Release decisions are
                    recorded in the authorisation workflow.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {role !== "REGULATION_BUREAU_HEAD" && !released ? (
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="data-label">Need to add evidence?</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
                Upload a corrected FDR scan or bank confirmation letter. Every upload is hashed and
                written to the audit trail.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setActionError(null);
                  setUploadOpen(true);
                }}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Add document
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Verify as bank-confirmed</DialogTitle>
            <DialogDescription>
              Confirm that the particulars have been independently verified against an authorised
              bank source. This action moves the record to bank-confirmed status and is recorded
              permanently.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitVerify} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bankRef">
                Bank confirmation reference <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bankRef"
                value={bankRef}
                onChange={(event) => setBankRef(event.target.value)}
                placeholder="BVS/SBI/2026/01-118"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Reference printed on the bank confirmation letter or bank verification email.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="verifyRemarks">Scrutiny observations</Label>
              <Textarea
                id="verifyRemarks"
                value={verifyRemarks}
                onChange={(event) => setVerifyRemarks(event.target.value)}
                placeholder="Particulars match the bank advice. No discrepancy observed."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="verifyFile">Attach bank confirmation (optional)</Label>
              <Input
                id="verifyFile"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(event) => {
                  setVerifyFile(event.target.files?.[0] ?? null);
                  setVerifyFileError(null);
                }}
              />
              {verifyFile ? (
                <p className="text-[10px] text-muted-foreground">
                  {verifyFile.name} · {formatFileSize(verifyFile.size)}
                </p>
              ) : null}
              {verifyFileError ? (
                <p role="alert" className="text-[10.5px] font-medium text-destructive">
                  {verifyFileError}
                </p>
              ) : null}
            </div>
            {actionError ? (
              <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-800">
                {actionError}
              </p>
            ) : null}
            <div className="rounded-md border border-teal-200 bg-teal-50 p-2.5 text-[10px] leading-relaxed text-teal-900">
              <p className="font-semibold">Authorised confirmation</p>
              <p className="mt-0.5">
                This declaration is attributed to your role and identity in the immutable audit
                trail.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVerifyOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="success" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
                Confirm verification
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag a discrepancy</DialogTitle>
            <DialogDescription>
              Describe what does not match. The institution can see this observation and upload
              corrected evidence. The record will be marked discrepancy flagged.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitFlag} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="flagRemarks">
                Discrepancy details <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="flagRemarks"
                value={flagRemarks}
                onChange={(event) => setFlagRemarks(event.target.value)}
                placeholder="The deposit amount on the bank confirmation letter differs from the declared amount. Please upload a fresh letter from the branch."
                required
                minLength={10}
                className="min-h-[130px]"
              />
              <p className="text-[10px] text-muted-foreground">
                Minimum 10 characters. Be specific about the field, expected value and evidence
                required.
              </p>
            </div>
            {actionError ? (
              <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-800">
                {actionError}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFlagOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldAlert className="h-4 w-4" aria-hidden />}
                Flag discrepancy
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a scrutiny observation</DialogTitle>
            <DialogDescription>
              Add an internal observation without changing the verification status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitNote} className="space-y-4">
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Awaiting a fresh bank confirmation letter before final verification."
              required
              minLength={5}
            />
            {actionError ? (
              <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-800">
                {actionError}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNoteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Record observation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a document</DialogTitle>
            <DialogDescription>
              Documents are validated, hashed and encrypted in secure storage. The upload is
              recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitUpload} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Document type</Label>
              <Select value={uploadType} onValueChange={(value) => setUploadType(value as DocumentType)}>
                <SelectTrigger aria-label="Document type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {uploadTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DOCUMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uploadDocument">
                File <span className="text-destructive">*</span>
              </Label>
              <Input
                id="uploadDocument"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(event) => {
                  setUploadFile(event.target.files?.[0] ?? null);
                  setUploadError(null);
                }}
              />
              {uploadFile ? (
                <p className="text-[10px] text-muted-foreground">
                  {uploadFile.name} · {formatFileSize(uploadFile.size)}
                </p>
              ) : null}
              {uploadError ? (
                <p role="alert" className="text-[10.5px] font-medium text-destructive">
                  {uploadError}
                </p>
              ) : null}
            </div>
            {actionError ? (
              <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-800">
                {actionError}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
                Upload securely
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
