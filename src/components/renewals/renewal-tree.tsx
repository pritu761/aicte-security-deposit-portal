import Link from "next/link";
import {
  ArrowDown,
  Building2,
  CalendarClock,
  ChevronRight,
  GitBranch,
  Landmark,
} from "lucide-react";

import { FdrStatusBadge } from "@/components/fdr-status-badge";
import { Badge } from "@/components/ui/badge";
import { FDR_STATUS_LABELS } from "@/lib/constants";
import type { RenewalNode } from "@/lib/queries";
import { formatDate, formatINR, maturityLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function chainPath(chain: RenewalNode): string {
  const labels: string[] = [];
  const walk = (node: RenewalNode) => {
    labels.push(
      `${node.fdr.fdrNumber} (${
        node.hasChildren && node.effectiveStatus === "ACTIVE"
          ? "Renewed"
          : FDR_STATUS_LABELS[node.effectiveStatus]
      })`,
    );
    node.children.forEach(walk);
  };
  walk(chain);
  return labels.join(" → ");
}

function SuccessorLink({ node }: { node: RenewalNode }) {
  if (!node.hasChildren) return null;
  return (
    <div className="relative ml-[19px] flex h-7 items-center">
      <span aria-hidden className="h-full w-px border-l border-dashed border-border" />
      <ArrowDown
        className="absolute -left-[7px] top-[13px] h-3.5 w-3.5 rounded-full bg-card text-muted-foreground"
        aria-hidden
      />
      <span className="ml-3 text-[9.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        Renewed by
      </span>
    </div>
  );
}

export function RenewalTreeNode({
  node,
  depth = 0,
  institutionView = false,
}: {
  node: RenewalNode;
  depth?: number;
  institutionView?: boolean;
}) {
  const maturity = maturityLabel(node.fdr.maturityDate);
  const isRoot = depth === 0;

  return (
    <li className={cn("relative", depth > 0 && "pl-6")}>
      {depth > 0 ? (
        <>
          <span
            aria-hidden
            className="absolute left-[18px] top-0 h-8 w-px border-l border-dashed border-border"
          />
          <span
            aria-hidden
            className="absolute left-[18px] top-8 h-px w-3 border-t border-dashed border-border"
          />
        </>
      ) : null}
      <div
        className={cn(
          "rounded-lg border transition-colors",
          isRoot
            ? "border-navy-200/80 bg-navy-50/30"
            : "border-border/80 bg-card hover:border-primary/30",
        )}
      >
        <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/scrutiny/${node.fdr.id}`}
                className="font-mono text-[12px] font-semibold text-navy-900 hover:underline"
              >
                {node.fdr.fdrNumber}
              </Link>
              <FdrStatusBadge
                status={node.hasChildren ? "RENEWED" : node.effectiveStatus}
              />
              {node.hasChildren ? (
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[9px] text-slate-600">
                  has successor
                </Badge>
              ) : null}
              {isRoot ? (
                <Badge variant="outline" className="text-[9px]">
                  chain origin
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px]">
                  renewal {depth}
                </Badge>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Landmark className="h-3 w-3" aria-hidden />
                {node.fdr.issuingBank}
              </span>
              {!institutionView ? (
                <span className="flex max-w-[240px] items-center gap-1 truncate">
                  <Building2 className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{node.fdr.institutionName}</span>
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <CalendarClock className="h-3 w-3" aria-hidden />
                Issued {formatDate(node.fdr.issueDate)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4 sm:text-right">
            <div>
              <p className="metric-number text-[13px] font-semibold text-foreground">
                {formatINR(node.fdr.depositAmount)}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[9.5px]",
                  maturity.tone === "danger"
                    ? "font-medium text-rose-700"
                    : maturity.tone === "warning"
                      ? "font-medium text-amber-700"
                      : "text-muted-foreground",
                )}
              >
                {maturity.label}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-1.5">
          <p className="text-[9.5px] text-muted-foreground">
            Maturity {formatDate(node.fdr.maturityDate)} · {node.fdr.verificationStatus === "BANK_CONFIRMED" ? "Bank-confirmed" : "Verification pending"}
          </p>
          <Link
            href={`/scrutiny/${node.fdr.id}`}
            className="inline-flex items-center gap-0.5 text-[9.5px] font-medium text-primary hover:underline"
          >
            Open record
            <ChevronRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>

      {node.children.length ? (
        <>
          <SuccessorLink node={node} />
          <ul className="space-y-2">
            {node.children.map((child) => (
              <RenewalTreeNode
                key={child.fdr.id}
                node={child}
                depth={depth + 1}
                institutionView={institutionView}
              />
            ))}
          </ul>
        </>
      ) : null}
    </li>
  );
}

export function ChainPathLabel({ chain }: { chain: RenewalNode }) {
  return (
    <p className="mt-1 flex items-center gap-1.5 text-[10.5px] leading-relaxed text-muted-foreground">
      <GitBranch className="h-3 w-3 shrink-0" aria-hidden />
      <span className="line-clamp-2">{chainPath(chain)}</span>
    </p>
  );
}
