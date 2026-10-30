"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  FileText,
  Info,
  Loader2,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { FdrStatusBadge } from "@/components/fdr-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BANKS, MAX_DOCUMENT_MB } from "@/lib/constants";
import { createFdrAction } from "@/lib/actions/fdr";
import {
  fdrSubmissionSchema,
  MAX_UPLOAD_BYTES,
} from "@/lib/validation";
import {
  cn,
  daysUntil,
  formatDate,
  formatFileSize,
  formatINR,
  todayISO,
  toNumber,
} from "@/lib/utils";
import type { FdrStatus } from "@/db/schema";

type ParentOption = {
  id: string;
  fdrNumber: string;
  issuingBank: string;
  depositAmount: string;
  maturityDate: string;
  status: FdrStatus;
  verificationStatus: "INSTITUTION_SUBMITTED" | "BANK_CONFIRMED" | "DISCREPANCY_FOUND";
  institutionName: string;
};

type FormValues = {
  fdrNumber: string;
  issuingBank: string;
  branchName: string;
  ifscCode: string;
  depositAmount: number;
  issueDate: string;
  maturityDate: string;
  jointAccountHolder: string;
  parentFdrId: string;
};

const accepted = ["application/pdf", "image/png", "image/jpeg"];

function validateFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return `Each document must be ${MAX_DOCUMENT_MB} MB or smaller.`;
  if (!accepted.includes(file.type)) return "Only PDF, PNG or JPEG files are accepted.";
  return null;
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-[12.5px]">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-[11px] font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[10.5px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function FileDropzone({
  id,
  label,
  description,
  required,
  file,
  onFile,
  onClear,
  error,
  mockPath,
}: {
  id: string;
  label: string;
  description: string;
  required?: boolean;
  file: File | null;
  onFile: (file: File) => void;
  onClear: () => void;
  error?: string;
  mockPath: string;
}) {
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const next = files?.[0];
    if (!next) return;
    onFile(next);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-[12.5px]">
          {label}{" "}
          {required ? (
            <span className="text-destructive" aria-hidden>*</span>
          ) : (
            <span className="font-normal text-muted-foreground">(optional)</span>
          )}
        </Label>
        <span className="text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
          PDF · PNG · JPEG · Max {MAX_DOCUMENT_MB} MB
        </span>
      </div>

      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
          <span className="rounded-md bg-white p-2 text-teal-700 shadow-sm">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{file.name}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {formatFileSize(file.size)} · verified type {file.type || "document"}
            </p>
            <p className="mt-1 truncate font-mono text-[9px] text-teal-800/70">{mockPath}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-white hover:text-destructive"
            aria-label={`Remove ${file.name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-7 text-center transition-colors",
            dragging
              ? "border-teal-500 bg-teal-50"
              : error
                ? "border-destructive/50 bg-rose-50/30"
                : "border-border bg-muted/20 hover:border-primary/35 hover:bg-muted/35",
          )}
        >
          <span className="rounded-full border border-border bg-card p-2.5 text-muted-foreground shadow-sm">
            <CloudUpload className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-2 text-xs font-medium">
            Drag &amp; drop, or <span className="text-primary underline underline-offset-2">browse files</span>
          </p>
          <p className="mt-1 max-w-sm text-[10.5px] leading-relaxed text-muted-foreground">
            {description}
          </p>
          <input
            id={id}
            name={id}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="sr-only"
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      )}
      {error ? (
        <p role="alert" className="text-[11px] font-medium text-destructive">
          {error}
        </p>
      ) : file ? (
        <p className="flex items-center gap-1 text-[10px] text-teal-800">
          <CheckCircle2 className="h-3 w-3" aria-hidden />
          Ready for encrypted upload when you submit.
        </p>
      ) : null}
    </div>
  );
}

function ParentCombobox({
  options,
  value,
  onChange,
  error,
}: {
  options: ParentOption[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.id === value) ?? null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      [option.fdrNumber, option.issuingBank, option.institutionName, option.depositAmount]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [options, query]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  if (selected) {
    return (
      <div className="rounded-lg border border-navy-200 bg-navy-50/50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-navy-900">{selected.fdrNumber}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {selected.issuingBank} · {formatINR(toNumber(selected.depositAmount))}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Matures {formatDate(selected.maturityDate)}
            </p>
          </div>
          <FdrStatusBadge status={selected.status} />
        </div>
        <div className="mt-2 flex items-center gap-2 border-t border-navy-200/60 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Change parent
          </Button>
          <span className="text-[9.5px] text-muted-foreground">
            The predecessor will be marked renewal-pending.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Search parent FDR"
          placeholder="Search by FDR number, bank or amount…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setHighlight((current) => Math.min(current + 1, filtered.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              const option = filtered[highlight];
              if (option) {
                onChange(option.id);
                setOpen(false);
                setQuery("");
              }
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className={cn("pl-9 pr-8", error && "border-destructive/60")}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </div>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Eligible parent FDRs"
          className="absolute z-30 mt-1 max-h-[260px] w-full overflow-y-auto rounded-lg border border-border bg-popover p-1.5 shadow-lift"
        >
          {filtered.length ? (
            filtered.map((option, index) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={index === highlight}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                  index === highlight ? "bg-accent" : "hover:bg-muted/70",
                )}
              >
                <span className="min-w-0">
                  <span className="block font-mono text-[11px] font-semibold text-navy-900">
                    {option.fdrNumber}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                    {option.issuingBank} · {formatINR(toNumber(option.depositAmount))} · matures{" "}
                    {formatDate(option.maturityDate)}
                  </span>
                </span>
                <FdrStatusBadge status={option.status} />
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-center text-[11px] text-muted-foreground">
              No matching FDR found in your institution&apos;s register.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function SubmissionForm({
  parents,
  today,
  defaultMaturity,
  selectedParentId,
  institution,
}: {
  parents: ParentOption[];
  today: string;
  defaultMaturity: string;
  selectedParentId?: string;
  institution: { name: string; aicteId: string; state: string };
}) {
  const router = useRouter();
  const [renewal, setRenewal] = useState(Boolean(selectedParentId));
  const [parentId, setParentId] = useState(selectedParentId ?? "");
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [fileErrors, setFileErrors] = useState<{ original?: string; bank?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      fdrNumber: "",
      issuingBank: "",
      branchName: "",
      ifscCode: "",
      depositAmount: undefined as unknown as number,
      issueDate: today,
      maturityDate: defaultMaturity,
      jointAccountHolder: "Regional Officer, AICTE",
      parentFdrId: selectedParentId ?? "",
    },
    mode: "onSubmit",
  });

  const issueDate = watch("issueDate");
  const maturityDate = watch("maturityDate");
  const depositAmount = watch("depositAmount");
  const days = maturityDate ? daysUntil(maturityDate, todayISO()) : null;
  const validDates = Boolean(issueDate && maturityDate && maturityDate > issueDate);
  const termMonths = days !== null && validDates ? Math.round(days / 30.44) : null;
  const maturityTone =
    days === null || !validDates
      ? "neutral"
      : days < 0
        ? "danger"
        : days <= 30
          ? "warning"
          : "success";

  const mockBase = `${institution.aicteId.replace(/[^A-Za-z0-9]/g, "")}/${new Date().getFullYear()}`;

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const nextFiles: typeof fileErrors = {};
    if (!originalFile) nextFiles.original = "Upload the original FDR certificate or scan.";
    else {
      const message = validateFile(originalFile);
      if (message) nextFiles.original = message;
    }
    if (bankFile) {
      const message = validateFile(bankFile);
      if (message) nextFiles.bank = message;
    }
    setFileErrors(nextFiles);
    if (Object.keys(nextFiles).length) {
      toast.error("Attach the required documents", {
        description: "The original FDR scan is mandatory for every submission.",
      });
      return;
    }

    const parsed = fdrSubmissionSchema.safeParse({
      ...values,
      depositAmount: values.depositAmount,
      parentFdrId: renewal ? parentId || undefined : undefined,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormValues | undefined;
        if (key && key in values) {
          setError(key, { type: "manual", message: issue.message }, { shouldFocus: true });
        }
      }
      toast.error("Check the highlighted fields", {
        description: "Some instrument details could not be validated.",
      });
      return;
    }

    const formData = new FormData();
    formData.set("fdrNumber", parsed.data.fdrNumber);
    formData.set("issuingBank", parsed.data.issuingBank);
    formData.set("branchName", parsed.data.branchName);
    formData.set("ifscCode", parsed.data.ifscCode);
    formData.set("depositAmount", parsed.data.depositAmount.toFixed(2));
    formData.set("issueDate", parsed.data.issueDate);
    formData.set("maturityDate", parsed.data.maturityDate);
    formData.set("jointAccountHolder", parsed.data.jointAccountHolder);
    if (parsed.data.parentFdrId) formData.set("parentFdrId", parsed.data.parentFdrId);
    formData.set("originalFdr", originalFile as File);
    if (bankFile) formData.set("bankConfirmation", bankFile);

    const result = await createFdrAction(formData);
    if (result.status === "error") {
      setServerError(result.message ?? "The submission could not be filed.");
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (field === "originalFdr") setFileErrors((current) => ({ ...current, original: messages[0] }));
        else if (field === "bankConfirmation") setFileErrors((current) => ({ ...current, bank: messages[0] }));
        else if (field === "form") setServerError(messages[0]);
        else if (field === "parentFdrId") {
          setError("parentFdrId", { type: "server", message: messages[0] });
        } else if (field in parsed.data) {
          setError(field as keyof FormValues, { type: "server", message: messages[0] });
        }
      }
      toast.error("Submission not accepted", { description: result.message });
      return;
    }

    toast.success("FDR submitted successfully", {
      description:
        result.message ?? "The scrutiny desk has been notified and the record is now on the register.",
    });
    const id = typeof result.data?.id === "string" ? result.data.id : null;
    if (id) {
      router.push(`/scrutiny/${id}`);
      router.refresh();
    } else {
      router.push("/repository");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_326px]"
      noValidate
    >
      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Instrument particulars</CardTitle>
                <CardDescription className="mt-1">
                  Copy the details exactly as printed on the bank-issued FDR.
                </CardDescription>
              </div>
              <span className="rounded-md bg-navy-50 p-2 text-navy-700">
                <Banknote className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field
              label="FDR number"
              htmlFor="fdrNumber"
              error={errors.fdrNumber?.message}
              hint="Example: FDR-2026-118"
            >
              <Input
                id="fdrNumber"
                placeholder="FDR-2026-118"
                autoComplete="off"
                aria-invalid={Boolean(errors.fdrNumber)}
                {...register("fdrNumber")}
              />
            </Field>
            <Field
              label="Issuing bank"
              htmlFor="issuingBank"
              error={errors.issuingBank?.message}
              hint="Select a listed bank or type the full name."
            >
              <Input
                id="issuingBank"
                list="aicte-banks"
                placeholder="State Bank of India"
                autoComplete="off"
                aria-invalid={Boolean(errors.issuingBank)}
                {...register("issuingBank")}
              />
              <datalist id="aicte-banks">
                {BANKS.map((bank) => (
                  <option key={bank} value={bank} />
                ))}
              </datalist>
            </Field>
            <Field label="Branch name" htmlFor="branchName" error={errors.branchName?.message}>
              <Input
                id="branchName"
                placeholder="Bengaluru Main"
                autoComplete="off"
                aria-invalid={Boolean(errors.branchName)}
                {...register("branchName")}
              />
            </Field>
            <Field
              label="IFSC code"
              htmlFor="ifscCode"
              error={errors.ifscCode?.message}
              hint="11 characters, e.g. SBIN0001234."
            >
              <Input
                id="ifscCode"
                placeholder="SBIN0001234"
                autoComplete="off"
                maxLength={11}
                className="font-mono uppercase"
                aria-invalid={Boolean(errors.ifscCode)}
                {...register("ifscCode", {
                  onChange: (event) => {
                    event.target.value = event.target.value.toUpperCase();
                  },
                })}
              />
            </Field>
            <Field
              label="Joint account holder"
              htmlFor="jointAccountHolder"
              error={errors.jointAccountHolder?.message}
              className="sm:col-span-2"
              hint="The standard AICTE mandate is pre-filled. Change only if the bank receipt states otherwise."
            >
              <Input
                id="jointAccountHolder"
                aria-invalid={Boolean(errors.jointAccountHolder)}
                {...register("jointAccountHolder")}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Deposit and maturity</CardTitle>
                <CardDescription className="mt-1">
                  Amount, issue date and maturity determine the monitoring status.
                </CardDescription>
              </div>
              <span className="rounded-md bg-teal-50 p-2 text-teal-700">
                <CalendarDays className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Deposit amount (₹)"
              htmlFor="depositAmount"
              error={errors.depositAmount?.message}
              className="sm:col-span-2"
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="depositAmount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1000}
                  placeholder="5000000"
                  className="pl-7 font-mono"
                  aria-invalid={Boolean(errors.depositAmount)}
                  {...register("depositAmount", { valueAsNumber: true })}
                />
              </div>
              {depositAmount > 0 ? (
                <p className="-mt-0.5 text-[10.5px] text-muted-foreground">
                  {formatINR(depositAmount)} · {formatINR(depositAmount, { compact: true })}
                </p>
              ) : null}
            </Field>
            <Field label="Date of issue" htmlFor="issueDate" error={errors.issueDate?.message}>
              <Input
                id="issueDate"
                type="date"
                max={today}
                aria-invalid={Boolean(errors.issueDate)}
                {...register("issueDate")}
              />
            </Field>
            <Field
              label="Date of maturity"
              htmlFor="maturityDate"
              error={errors.maturityDate?.message}
            >
              <Input
                id="maturityDate"
                type="date"
                min={today}
                aria-invalid={Boolean(errors.maturityDate)}
                {...register("maturityDate")}
              />
            </Field>

            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 sm:col-span-2",
                maturityTone === "danger"
                  ? "border-rose-200 bg-rose-50/60"
                  : maturityTone === "warning"
                    ? "border-amber-200 bg-amber-50/60"
                    : maturityTone === "success"
                      ? "border-teal-200 bg-teal-50/60"
                      : "border-border bg-muted/30",
              )}
              aria-live="polite"
            >
              <span
                className={cn(
                  "mt-0.5 rounded-md p-1.5",
                  maturityTone === "danger"
                    ? "bg-rose-100 text-rose-700"
                    : maturityTone === "warning"
                      ? "bg-amber-100 text-amber-800"
                      : maturityTone === "success"
                        ? "bg-teal-100 text-teal-700"
                        : "bg-muted text-muted-foreground",
                )}
              >
                <CalendarDays className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 text-[11px] leading-relaxed">
                {validDates && days !== null ? (
                  <>
                    <p className="font-semibold text-foreground">
                      {days < 0
                        ? `This maturity date is ${Math.abs(days)} days in the past.`
                        : days === 0
                          ? "This instrument matures today."
                          : `Matures in ${days.toLocaleString("en-IN")} days — ${formatDate(maturityDate)}`}
                    </p>
                    <p className="text-muted-foreground">
                      Approximate term:{" "}
                      {termMonths && termMonths >= 12
                        ? `${Math.floor(termMonths / 12)} year${Math.floor(termMonths / 12) === 1 ? "" : "s"}${termMonths % 12 ? ` ${termMonths % 12} month${termMonths % 12 === 1 ? "" : "s"}` : ""}`
                        : `${termMonths ?? 0} month${termMonths === 1 ? "" : "s"}`}
                      . The register recalculates status daily.
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Choose a valid issue and maturity date to calculate the remaining term.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Renewal / replacement linkage</CardTitle>
                <CardDescription className="mt-1">
                  Link a predecessor when this instrument renews, replaces or consolidates an
                  earlier deposit.
                </CardDescription>
              </div>
              <Badge variant="outline" className="shrink-0 text-muted-foreground">
                Optional
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30">
              <input
                type="checkbox"
                checked={renewal}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setRenewal(checked);
                  if (!checked) {
                    setParentId("");
                    setValue("parentFdrId", "");
                    clearErrors("parentFdrId");
                  }
                }}
                className="mt-0.5 h-4 w-4 rounded border-input accent-navy-900"
              />
              <span>
                <span className="block text-xs font-medium">
                  This FDR is a renewal or replacement of an existing instrument
                </span>
                <span className="mt-0.5 block text-[10.5px] leading-relaxed text-muted-foreground">
                  The parent record is marked renewal-pending and a succession chain is created for
                  the renewals register.
                </span>
              </span>
            </label>

            {renewal ? (
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Search parent FDR</Label>
                <ParentCombobox
                  options={parents}
                  value={parentId}
                  onChange={(id) => {
                    setParentId(id);
                    setValue("parentFdrId", id);
                    clearErrors("parentFdrId");
                  }}
                  error={errors.parentFdrId?.message}
                />
                {errors.parentFdrId?.message ? (
                  <p role="alert" className="text-[11px] font-medium text-destructive">
                    {errors.parentFdrId.message}
                  </p>
                ) : (
                  <p className="text-[10.5px] text-muted-foreground">
                    Renewal may be filed within 180 days of the parent instrument&apos;s maturity
                    date. Released FDRs are not eligible.
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Supporting documents</CardTitle>
            <CardDescription className="mt-1">
              Documents are encrypted at rest with AES-256-GCM and served only to authorised
              roles. The bank confirmation letter can also be added later by the scrutiny desk.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FileDropzone
              id="originalFdr"
              label="Original FDR certificate or scan"
              description="Upload the complete bank-issued FDR receipt, including the FDR number, amount and maturity date."
              required
              file={originalFile}
              onFile={(file) => {
                setOriginalFile(file);
                setFileErrors((current) => ({ ...current, original: undefined }));
              }}
              onClear={() => setOriginalFile(null)}
              error={fileErrors.original}
              mockPath={`vault://aicte-fdr/${mockBase}/${originalFile?.name ?? "original-fdr.pdf"}`}
            />
            <FileDropzone
              id="bankConfirmation"
              label="Bank confirmation letter"
              description="Optional at submission. Upload a letter from the authorised bank branch confirming the deposit and charge status."
              file={bankFile}
              onFile={(file) => {
                setBankFile(file);
                setFileErrors((current) => ({ ...current, bank: undefined }));
              }}
              onClear={() => setBankFile(null)}
              error={fileErrors.bank}
              mockPath={`vault://aicte-fdr/${mockBase}/${bankFile?.name ?? "bank-confirmation.pdf"}`}
            />
          </CardContent>
        </Card>

        {serverError ? (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Submission not accepted</p>
              <p className="mt-0.5 leading-relaxed">{serverError}</p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col-reverse items-stretch gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            By submitting, you confirm the particulars match the original bank instrument. False
            declarations are subject to AICTE regulatory action.
          </p>
          <Button type="submit" disabled={isSubmitting} className="shrink-0">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Filing submission…
              </>
            ) : (
              <>
                Submit for scrutiny
                <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-[108px]">
        <Card className="border-navy-200/70 bg-gradient-to-b from-navy-50/60 to-card">
          <CardHeader className="pb-3">
            <p className="eyebrow">Filing for</p>
            <CardTitle className="text-sm leading-snug">{institution.name}</CardTitle>
            <CardDescription>
              AICTE ID <span className="font-mono">{institution.aicteId}</span> · {institution.state}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 border-t border-border/60 pt-4 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Submitted by</span>
              <span className="font-medium">Institution Administrator</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Verification route</span>
              <span className="font-medium">AICTE scrutiny desk</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Initial status</span>
              <span className="font-medium">Institution submitted</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden />
              Before you submit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-[10.5px] leading-relaxed text-muted-foreground">
              {[
                "The FDR is held in the institution's name jointly with the Regional Officer, AICTE.",
                "The FDR number, amount and dates match the original bank instrument.",
                "The scan is complete and legible, including the bank seal and signatory.",
                "A bank confirmation letter is attached if already available.",
                "Renewals are linked to the correct predecessor within the 180-day window.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">What happens next</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {[
                { title: "Submission recorded", text: "The FDR appears on the register with institution-submitted status." },
                { title: "Scrutiny review", text: "An AICTE officer compares the document with the declared particulars." },
                { title: "Bank confirmation", text: "Once evidence is verified, the record is marked bank-confirmed." },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-navy-200 bg-navy-50 text-[9.5px] font-bold text-navy-800">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-[11px] font-medium text-foreground">{step.title}</span>
                    <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">
                      {step.text}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-[10px] leading-relaxed text-amber-900">
          <p className="font-semibold">Demonstration data notice</p>
          <p className="mt-0.5">
            This prototype stores synthetic records only. Uploaded documents are encrypted in a
            local mock vault; do not upload real financial instruments.
          </p>
        </div>
      </aside>
    </form>
  );
}
