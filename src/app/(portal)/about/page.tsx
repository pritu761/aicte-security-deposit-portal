import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CalendarClock,
  Check,
  Database,
  FileCheck2,
  Fingerprint,
  Landmark,
  LockKeyhole,
  RefreshCw,
  Scale,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/constants";

export const metadata: Metadata = { title: "About the portal" };

const modules = [
  {
    icon: Database,
    title: "Register",
    description:
      "A single, searchable record of every security deposit instrument, institution and bank.",
  },
  {
    icon: FileCheck2,
    title: "Verify",
    description:
      "Scrutiny officers reconcile declared particulars against encrypted bank evidence.",
  },
  {
    icon: RefreshCw,
    title: "Renew",
    description:
      "Succession chains preserve the history of every replacement instrument and maturity cycle.",
  },
  {
    icon: BadgeCheck,
    title: "Authorise",
    description:
      "Three-stage release decisions produce a dispatch reference and printable authorisation.",
  },
];

const lifecycle = [
  {
    icon: Building2,
    title: "Institution files",
    description: "Particulars, evidence and renewal linkage enter one submission record.",
  },
  {
    icon: SearchCheck,
    title: "Bureau verifies",
    description: "Bank confirmation, discrepancy notes and scrutiny observations are recorded.",
  },
  {
    icon: CalendarClock,
    title: "Portfolio monitors",
    description: "Maturity windows and renewal obligations stay visible before they become overdue.",
  },
  {
    icon: BadgeCheck,
    title: "Authority releases",
    description: "Recommendation and final approval create an auditable release chain.",
  },
];

const principles = [
  {
    icon: Fingerprint,
    title: "One verifiable record",
    description:
      "Every instrument, document fingerprint and decision is linked to a single controlled register.",
  },
  {
    icon: LockKeyhole,
    title: "Evidence first",
    description:
      "Status changes follow verification. Bank-confirmed evidence is required before release.",
  },
  {
    icon: Scale,
    title: "Clear authority",
    description:
      "Role-scoped permissions separate institutional filing from scrutiny and competent-authority approval.",
  },
  {
    icon: Workflow,
    title: "Traceable by default",
    description:
      "Submissions, corrections, approvals and exports are persisted in an append-only audit trail.",
  },
];

const roleIcons = {
  INSTITUTION_ADMIN: Building2,
  AICTE_SCRUTINY_OFFICER: SearchCheck,
  REGULATION_BUREAU_HEAD: Landmark,
} as const;

const roleOrder = [
  "INSTITUTION_ADMIN",
  "AICTE_SCRUTINY_OFFICER",
  "REGULATION_BUREAU_HEAD",
] as const;

const capabilities = [
  { label: "Submit FDRs and evidence", roles: ["INSTITUTION_ADMIN"] },
  { label: "Raise renewal and release requests", roles: ["INSTITUTION_ADMIN"] },
  { label: "Verify bank evidence", roles: ["AICTE_SCRUTINY_OFFICER"] },
  { label: "Recommend release cases", roles: ["AICTE_SCRUTINY_OFFICER"] },
  { label: "Approve or reject releases", roles: ["REGULATION_BUREAU_HEAD"] },
  { label: "Review the immutable audit trail", roles: ["AICTE_SCRUTINY_OFFICER", "REGULATION_BUREAU_HEAD"] },
];

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="About the portal · Regulation Bureau"
        title="One register for every security deposit."
        description="AICTE Suraksha connects institutions, scrutiny officers and the Regulation Bureau in a single controlled workflow — from the first bank-issued instrument to the final release authorisation."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/security">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Security &amp; assurance
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/help">
                Open help centre
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </>
        }
      />

      <section className="relative overflow-hidden rounded-2xl bg-navy-950 p-6 text-white shadow-lift sm:p-8 lg:p-10">
        <div className="navy-grid absolute inset-0 opacity-60" aria-hidden />
        <div
          className="absolute -right-24 -top-24 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(227,160,67,0.22),transparent_68%)]"
          aria-hidden
        />
        <div
          className="absolute -bottom-40 left-1/3 h-[340px] w-[340px] rounded-full border border-white/[0.06] bg-[radial-gradient(circle,rgba(41,159,153,0.12),transparent_66%)]"
          aria-hidden
        />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-saffron-300/25 bg-saffron-300/[0.08] px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.15em] text-saffron-200">
              <Sparkles className="h-3 w-3" aria-hidden />
              Regulatory infrastructure
            </span>
            <h2 className="font-display mt-4 max-w-2xl text-[2rem] font-semibold leading-[1.12] tracking-[-0.02em] text-balance sm:text-[2.5rem]">
              From a scattered paper trail to a governed digital lifecycle.
            </h2>
            <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-white/55">
              The portal replaces disconnected spreadsheets, email threads and physical custody
              registers with one authoritative workflow. Each action carries its actor, timestamp
              and before/after context.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Institution-scoped", "Bank-verified", "Bureau-authorised"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-medium text-white/65"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/40">
              Portal at a glance
            </p>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
              {[
                { value: "07", label: "Core workflow desks" },
                { value: "03", label: "Distinct access roles" },
                { value: "256", label: "Bit evidence encryption" },
                { value: "100%", label: "Actions auditable" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="metric-number font-display text-2xl font-semibold text-saffron-200">
                    {item.value}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-white/45">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-[10px] text-white/45">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300/80" aria-hidden />
              Secure portal · Role-scoped by design
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-labelledby="modules-heading">
        <div className="sr-only">
          <h2 id="modules-heading">Portal modules</h2>
        </div>
        {modules.map((module, index) => {
          const Icon = module.icon;
          return (
            <Card key={module.title} className="group relative overflow-hidden">
              <span
                className="absolute right-4 top-3 font-display text-3xl font-semibold text-navy-900/[0.055]"
                aria-hidden
              >
                0{index + 1}
              </span>
              <CardHeader className="pb-2">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-navy-100 bg-navy-50 text-navy-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <CardTitle className="text-[15px]">{module.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {module.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]" aria-labelledby="lifecycle-heading">
        <Card>
          <CardHeader>
            <CardTitle id="lifecycle-heading">The deposit lifecycle</CardTitle>
            <CardDescription>
              Four connected stages keep evidence, authority and chronology in the same system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-1">
              {lifecycle.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.title} className="relative flex gap-3.5 pb-4 last:pb-0">
                    {index < lifecycle.length - 1 ? (
                      <span
                        className="absolute bottom-0 left-[19px] top-10 w-px bg-border"
                        aria-hidden
                      />
                    ) : null}
                    <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/30 text-navy-700">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="pt-0.5">
                      <span className="flex items-center gap-2">
                        <span className="text-[9px] font-bold tracking-[0.12em] text-muted-foreground">
                          0{index + 1}
                        </span>
                        <span className="text-xs font-semibold text-foreground">{step.title}</span>
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                        {step.description}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          {principles.map((principle) => {
            const Icon = principle.icon;
            return (
              <div
                key={principle.title}
                className="rounded-xl border border-border/80 bg-card p-4 shadow-card"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-50 text-saffron-700">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="mt-3 text-xs font-semibold text-navy-900">{principle.title}</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
                  {principle.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="roles-heading" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="roles-heading" className="font-display text-xl font-semibold text-navy-900">
              Three roles, one chain of responsibility
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Access follows institutional scope and regulatory responsibility.
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-muted-foreground">
            <Users className="h-3 w-3" aria-hidden />
            Server-enforced RBAC
          </Badge>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {roleOrder.map((role, index) => {
            const Icon = roleIcons[role];
            return (
              <Card key={role} className="relative overflow-hidden">
                <span
                  className={`absolute inset-x-0 top-0 h-1 ${
                    index === 0
                      ? "bg-saffron-400"
                      : index === 1
                        ? "bg-teal-500"
                        : "bg-navy-700"
                  }`}
                  aria-hidden
                />
                <CardHeader className="pb-2">
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 text-navy-800">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground/70">
                      ROLE 0{index + 1}
                    </span>
                  </span>
                  <CardTitle className="pt-2 text-sm">{ROLE_LABELS[role]}</CardTitle>
                  <CardDescription className="text-[11px] leading-relaxed">
                    {ROLE_DESCRIPTIONS[role]}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Authority matrix</CardTitle>
            <CardDescription className="mt-1">
              Capabilities shown by role. Every permission is re-checked on the server.
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 text-muted-foreground">
            <LockKeyhole className="h-3 w-3" aria-hidden />
            Enforced
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th scope="col" className="py-2.5 pr-4 font-semibold">Capability</th>
                  {roleOrder.map((role) => (
                    <th key={role} scope="col" className="px-3 py-2.5 text-center font-semibold">
                      {ROLE_LABELS[role].replace("AICTE ", "").replace("Administrator", "Admin")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {capabilities.map((capability) => (
                  <tr key={capability.label} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-4 text-[11px] text-foreground">{capability.label}</td>
                    {roleOrder.map((role) => (
                      <td key={role} className="px-3 py-2.5 text-center">
                        {capability.roles.includes(role) ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                            <Check className="h-3 w-3" aria-hidden />
                            <span className="sr-only">Allowed</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/35">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-card sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-saffron-200">
            <Banknote className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy-900">Ready to explore the register?</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Search FDRs, review maturity timelines, or open the workflow guidance for your role.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href="/repository">
              <Database className="h-4 w-4" aria-hidden />
              Open repository
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/help">
              Help centre
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
