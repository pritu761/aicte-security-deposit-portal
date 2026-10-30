import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CircleAlert,
  ClipboardCheck,
  Cloud,
  Database,
  FileCheck2,
  Fingerprint,
  Gauge,
  HardDrive,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  Network,
  ScanSearch,
  ScrollText,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Timer,
  UserRoundCheck,
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

export const metadata: Metadata = { title: "Security & assurance" };

const posture = [
  { value: "03", label: "Enforced access roles", icon: Users },
  { value: "256", label: "Bit AES-GCM evidence encryption", icon: LockKeyhole },
  { value: "100%", label: "Server-side action checks", icon: ShieldCheck },
  { value: "0", label: "Client-trusted role claims", icon: KeyRound },
];

const domains = [
  {
    icon: UserRoundCheck,
    title: "Identity & access",
    description: "Every session is anchored to a real account and a server-resolved role.",
    controls: [
      "Email and password sign-in with salted scrypt password hashes",
      "Signed, HttpOnly session cookie with SameSite protection",
      "Role and institution scope re-checked in every query and action",
      "No role claims accepted from the browser",
    ],
  },
  {
    icon: LockKeyhole,
    title: "Data protection",
    description: "Financial evidence is encrypted before it reaches persistent storage.",
    controls: [
      "AES-256-GCM envelope encryption for every stored document",
      "SHA-256 fingerprint recorded for integrity verification",
      "Random UUID storage keys; user-controlled paths are never used",
      "Secrets supplied through environment configuration, not source control",
    ],
  },
  {
    icon: ScrollText,
    title: "Auditability",
    description: "The register keeps a durable, append-only account of every material action.",
    controls: [
      "Append-only audit table protected by a database trigger",
      "Actor, action, entity, timestamp and before/after context captured",
      "Audit access restricted to scrutiny officers and the Bureau Head",
      "Exports and document access are themselves recorded",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Application security",
    description: "Inputs are validated, queries are parameterised and responses are hardened.",
    controls: [
      "Zod validation at every server-action and API boundary",
      "Parameterised SQL through Drizzle ORM",
      "CSP, nosniff, referrer and permissions policy headers",
      "Magic-byte upload checks and a 10 MB per-file limit",
    ],
  },
  {
    icon: Gauge,
    title: "Operational assurance",
    description: "The portal makes its own health and freshness observable.",
    controls: [
      "Database readiness probe at /api/health",
      "Scheduled status refresh protected by a bearer secret",
      "Date-derived statuses recalculated whenever records are read",
      "Managed PostgreSQL connections with environment-aware SSL",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Governance & authority",
    description: "Administrative decisions follow a documented chain of responsibility.",
    controls: [
      "A published authority matrix for all three roles",
      "Three-stage release recommendation and approval workflow",
      "Dispatch references generated only after competent-authority approval",
      "Printable authorisation receipts tied to the audit record",
    ],
  },
];

const evidencePipeline = [
  {
    icon: Cloud,
    title: "Receive",
    detail: "Upload accepted over the authenticated portal route.",
  },
  {
    icon: ScanSearch,
    title: "Validate",
    detail: "Type, size and magic bytes checked before processing.",
  },
  {
    icon: Fingerprint,
    title: "Fingerprint",
    detail: "SHA-256 digest stored with the source record.",
  },
  {
    icon: LockKeyhole,
    title: "Encrypt",
    detail: "AES-256-GCM envelope written with restrictive permissions.",
  },
  {
    icon: FileCheck2,
    title: "Serve",
    detail: "Authenticated, institution-scoped streaming to the reviewer.",
  },
];

const sessionSteps = [
  {
    step: "01",
    title: "Verify",
    description:
      "The supplied password is checked against a salted scrypt hash. Unknown accounts still consume a dummy verification to equalise timing.",
    icon: KeyRound,
  },
  {
    step: "02",
    title: "Issue",
    description:
      "A signed HttpOnly cookie is issued with a seven-day expiry, SameSite=Lax and Secure in production. No role is stored client-side.",
    icon: BadgeCheck,
  },
  {
    step: "03",
    title: "Resolve",
    description:
      "The account is reloaded from PostgreSQL on every request. A disabled or removed user loses access immediately.",
    icon: UserRoundCheck,
  },
  {
    step: "04",
    title: "Authorise",
    description:
      "Server components, queries and actions apply role and institution scope. The UI mirrors the rule but never enforces it alone.",
    icon: ShieldCheck,
  },
];

const assuranceRows = [
  {
    area: "Authentication",
    implementation: "Email + scrypt password, signed session cookie",
    evidence: "Login and logout events in the audit trail",
  },
  {
    area: "Authorization",
    implementation: "Server-side RBAC and institution scoping",
    evidence: "Authority matrix and denied-route handling",
  },
  {
    area: "Evidence at rest",
    implementation: "AES-256-GCM envelope encryption",
    evidence: "Ciphertext only in the document vault",
  },
  {
    area: "Evidence in transit",
    implementation: "Encrypted transport and authenticated streaming",
    evidence: "CSP and frame-ancestors restrictions",
  },
  {
    area: "Record integrity",
    implementation: "Append-only audit trigger and SHA-256 fingerprints",
    evidence: "Immutable event history and document digests",
  },
  {
    area: "Change control",
    implementation: "Typed server actions, validated inputs, tests",
    evidence: "34 unit tests, typecheck and production build",
  },
];

const boundaries = [
  {
    icon: CircleAlert,
    title: "Seeded register",
    description:
      "The seeded register contains representative but non-production records. Do not load live financial or personal data without an approved deployment review.",
  },
  {
    icon: Network,
    title: "Single-tenant boundary",
    description:
      "Institution administrators are scoped to their own institution. The bureau-wide view is reserved for scrutiny and Regulation Bureau Head roles.",
  },
  {
    icon: HardDrive,
    title: "Local document vault",
    description:
      "Encrypted evidence is stored on the application host. Production deployments should move it to managed object storage with KMS-managed keys.",
  },
];

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security & assurance · Controls & posture"
        title="Built for accountable public-finance workflows."
        description="AICTE Suraksha applies least privilege, encrypted evidence, immutable audit history and server-side validation to every deposit record."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/help">
                <LifeBuoy className="h-4 w-4" aria-hidden />
                Help centre
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/about">
                <Workflow className="h-4 w-4" aria-hidden />
                How the portal works
              </Link>
            </Button>
          </>
        }
      />

      <section className="relative overflow-hidden rounded-2xl bg-navy-950 p-6 text-white shadow-lift sm:p-8 lg:p-10">
        <div className="navy-grid absolute inset-0 opacity-60" aria-hidden />
        <div
          className="absolute -right-28 -top-24 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(227,160,67,0.2),transparent_68%)]"
          aria-hidden
        />
        <div
          className="absolute -bottom-48 left-1/3 h-[380px] w-[380px] rounded-full border border-white/[0.06] bg-[radial-gradient(circle,rgba(41,159,153,0.12),transparent_66%)]"
          aria-hidden
        />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.15em] text-emerald-200">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Defence in depth
            </span>
            <h2 className="font-display mt-4 max-w-2xl text-[2rem] font-semibold leading-[1.12] tracking-[-0.02em] text-balance sm:text-[2.4rem]">
              Security is a property of the workflow, not a settings page.
            </h2>
            <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-white/55">
              Access is decided on the server, evidence is encrypted before storage and every
              material decision leaves a durable trace. The same rules apply whether a record is
              opened from the dashboard, a search result or an export.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Server-enforced RBAC", "AES-256-GCM", "Append-only audit", "CSP hardened"].map(
                (label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-medium text-white/65"
                  >
                    {label}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm">
            <p className="flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/40">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Security posture
            </p>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
              {posture.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label}>
                    <span className="flex items-center gap-1.5 text-white/45">
                      <Icon className="h-3 w-3" aria-hidden />
                      <span className="font-display metric-number text-2xl font-semibold text-saffron-200">
                        {item.value}
                      </span>
                    </span>
                    <p className="mt-0.5 text-[10px] leading-snug text-white/45">{item.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-[10px] text-white/45">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              Signed session · Role-scoped · Audited
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="domains-heading" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="domains-heading" className="font-display text-xl font-semibold text-navy-900">
              Control domains
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Six layers of protection around one authoritative register.
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-muted-foreground">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Server-side by default
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {domains.map((domain, index) => {
            const Icon = domain.icon;
            return (
              <Card key={domain.title} className="relative overflow-hidden">
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
                  <CardTitle className="text-[15px]">{domain.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {domain.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <ul className="space-y-1.5">
                    {domain.controls.map((control) => (
                      <li
                        key={control}
                        className="flex gap-2 text-[10.5px] leading-relaxed text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-teal-600" aria-hidden />
                        <span>{control}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="pipeline-heading" className="space-y-3">
        <div>
          <h2 id="pipeline-heading" className="font-display text-xl font-semibold text-navy-900">
            Evidence protection pipeline
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            From upload to reviewer preview, every document follows the same controlled path.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-5 shadow-card sm:p-6">
          <div className="paper-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {evidencePipeline.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <li key={stage.title} className="relative">
                  <div className="flex items-center gap-2 lg:block">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy-100 bg-white text-navy-700 shadow-xs">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    {index < evidencePipeline.length - 1 ? (
                      <span
                        className="ml-1 hidden h-px flex-1 bg-border lg:absolute lg:left-11 lg:top-[18px] lg:block lg:w-[calc(100%-2.5rem)]"
                        aria-hidden
                      />
                    ) : null}
                    <span className="font-mono text-[9px] font-semibold text-muted-foreground/60 lg:mt-2 lg:block">
                      STEP 0{index + 1}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-navy-900 lg:mt-1.5">{stage.title}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    {stage.detail}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section aria-labelledby="session-heading">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                  <KeyRound className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <CardTitle id="session-heading">Session &amp; authorization</CardTitle>
                  <CardDescription className="mt-0.5">
                    Four checks between a credential and a record.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {sessionSteps.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} className="relative flex gap-3">
                    {index < sessionSteps.length - 1 ? (
                      <span
                        className="absolute bottom-0 left-[17px] top-9 w-px bg-border"
                        aria-hidden
                      />
                    ) : null}
                    <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/30 text-navy-700">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <div className="pb-1">
                      <p className="flex items-center gap-2 text-[11px] font-semibold text-navy-900">
                        <span className="font-mono text-[9px] text-muted-foreground/60">
                          {item.step}
                        </span>
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="assurance-heading">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <ClipboardCheck className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <CardTitle id="assurance-heading">Assurance matrix</CardTitle>
                    <CardDescription className="mt-0.5">
                      Control, implementation and supporting evidence.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="success" className="hidden shrink-0 sm:inline-flex">
                  Implemented
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                      <th scope="col" className="py-2 pr-3 font-semibold">Area</th>
                      <th scope="col" className="px-2 py-2 font-semibold">Implementation</th>
                      <th scope="col" className="py-2 pl-3 font-semibold">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assuranceRows.map((row) => (
                      <tr key={row.area} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-3 text-[10.5px] font-semibold text-navy-900">
                          {row.area}
                        </td>
                        <td className="px-2 py-2.5 text-[10px] leading-relaxed text-muted-foreground">
                          {row.implementation}
                        </td>
                        <td className="py-2.5 pl-3 text-[10px] leading-relaxed text-muted-foreground">
                          {row.evidence}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <section aria-labelledby="boundaries-heading" className="space-y-3">
        <div>
          <h2 id="boundaries-heading" className="font-display text-xl font-semibold text-navy-900">
            Scope &amp; operating boundaries
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Clear boundaries are part of an honest security posture.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {boundaries.map((boundary) => {
            const Icon = boundary.icon;
            return (
              <div
                key={boundary.title}
                className="rounded-xl border border-border/80 bg-card p-4 shadow-card"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-50 text-saffron-700">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="mt-3 text-[11.5px] font-semibold text-navy-900">{boundary.title}</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
                  {boundary.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-card sm:p-6">
        <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-teal-50/70" aria-hidden />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-saffron-200">
              <ServerCog className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-900">Assurance is continuous.</p>
              <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
                Dependency review, access recertification and incident exercises should run on a
                published cadence. Report a suspected weakness to the Regulation Bureau through the
                portal helpdesk so it can be triaged without exposing live records.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[9.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5">
                  <Database className="h-3 w-3" aria-hidden />
                  Parameterised SQL
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5">
                  <Timer className="h-3 w-3" aria-hidden />
                  Session expiry
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5">
                  <Building2 className="h-3 w-3" aria-hidden />
                  Institution scoping
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button asChild variant="outline" size="sm">
              <Link href="/help">
                <LifeBuoy className="h-4 w-4" aria-hidden />
                Contact helpdesk
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard">
                <ArrowRight className="h-4 w-4" aria-hidden />
                Return to dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
