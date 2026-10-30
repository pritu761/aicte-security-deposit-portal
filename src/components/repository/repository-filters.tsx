"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FilterX, Loader2, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  FDR_STATUS_LABELS,
  VERIFICATION_LABELS,
} from "@/lib/constants";
import type { FdrStatus, VerificationStatus } from "@/db/schema";

const ALL = "ALL";

const statuses = Object.keys(FDR_STATUS_LABELS) as FdrStatus[];
const verifications = Object.keys(VERIFICATION_LABELS) as VerificationStatus[];

export function RepositoryFilters({
  initial,
  states,
  regions,
}: {
  initial: {
    q: string;
    status: string;
    verification: string;
    state: string;
    region: string;
  };
  states: string[];
  regions: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(initial.q);
  const [status, setStatus] = useState(initial.status || ALL);
  const [verification, setVerification] = useState(initial.verification || ALL);
  const [state, setState] = useState(initial.state || ALL);
  const [region, setRegion] = useState(initial.region || ALL);

  const activeCount = [
    q.trim().length > 0,
    status !== ALL,
    verification !== ALL,
    state !== ALL,
    region !== ALL,
  ].filter(Boolean).length;

  const exportQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== ALL) params.set("status", status);
    if (verification !== ALL) params.set("verification", verification);
    if (state !== ALL) params.set("state", state);
    if (region !== ALL) params.set("region", region);
    return params.toString();
  }, [q, status, verification, state, region]);

  function navigate() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== ALL) params.set("status", status);
    if (verification !== ALL) params.set("verification", verification);
    if (state !== ALL) params.set("state", state);
    if (region !== ALL) params.set("region", region);
    const suffix = params.toString();
    startTransition(() => {
      router.push(`/repository${suffix ? `?${suffix}` : ""}`);
    });
  }

  function reset() {
    setQ("");
    setStatus(ALL);
    setVerification(ALL);
    setState(ALL);
    setRegion(ALL);
    startTransition(() => {
      router.push("/repository");
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <form
          className="min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            navigate();
          }}
          role="search"
        >
          <Label htmlFor="repository-search" className="data-label">
            Search register
          </Label>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="repository-search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="AICTE ID, institution, FDR number, bank or IFSC…"
              className="pl-9"
              autoComplete="off"
            />
          </div>
        </form>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
          <div>
            <Label className="data-label">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1.5 h-10" aria-label="Filter by FDR status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {statuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {FDR_STATUS_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="data-label">Verification</Label>
            <Select value={verification} onValueChange={setVerification}>
              <SelectTrigger className="mt-1.5 h-10" aria-label="Filter by verification status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All verification</SelectItem>
                {verifications.map((item) => (
                  <SelectItem key={item} value={item}>
                    {VERIFICATION_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="data-label">State</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="mt-1.5 h-10" aria-label="Filter by state">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All states</SelectItem>
                {states.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="data-label">Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="mt-1.5 h-10" aria-label="Filter by region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All regions</SelectItem>
                {regions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={navigate} disabled={pending}>
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
            onClick={reset}
            disabled={pending || activeCount === 0}
          >
            <FilterX className="h-3.5 w-3.5" aria-hidden />
            Clear
          </Button>
          {activeCount ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {activeCount} active
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 hidden text-[10px] text-muted-foreground sm:block">
            Export current view
          </span>
          <Button asChild size="sm" variant="outline">
            <a
              href={`/api/export/fdrs?format=csv${exportQuery ? `&${exportQuery}` : ""}`}
              download
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              CSV
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a
              href={`/api/export/fdrs?format=json${exportQuery ? `&${exportQuery}` : ""}`}
              download
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              JSON
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
