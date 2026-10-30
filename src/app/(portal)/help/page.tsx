import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarClock,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Database,
  FileCheck2,
  FilePlus2,
  KeyRound,
  Keyboard,
  LifeBuoy,
  Mail,
  RefreshCw,
  ScrollText,
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

export const metadata: Metadata = { title: "Help centre" };

const quickStart = [
  {
    title: "File a security deposit",
    description:
      "Record a new instrument, attach bank evidence and submit it for bureau scrutiny.",
    href: "/submit-fdr",
    icon: FilePlus2,
    audience: "Institution administrators",
  },
  {
    title: "Verify bank evidence",
    description:
      "Compare declared particulars with the uploaded instrument and record the outcome.",
    href: "/repository?verification=INSTITUTION_SUBMITTED",
    icon: SearchCheck,
    audience: "Scrutiny officers",
  },
  {
    title: "Trace a renewal chain",
    description:
      "Follow every predecessor and successor across maturity and renewal cycles.",
    href: "/renewals",
    icon: RefreshCw,
    audience: "All roles",
  },
  {
    title: "Process a release",
    description:
      "Move a case through recommendation, approval and dispatch authorisation.",
    href: "/releases",
    icon: BadgeCheck,
    audience: "All roles",
  },
  {
    title: "Search the register",
    description:
      "Find an instrument by number, institution, bank, status or maturity window.",
    href: "/repository",
    icon: Database,
    audience: "All roles",
  },
  {
    title: "Review the audit trail",
    description:
      "Inspect every recorded action with actor, timestamp and before/after context.",
    href: "/audit",
    icon: ScrollText,
    audience: "Scrutiny & Bureau Head",
  },
];

const roleGuides = [
  {
    role: "Institution administrator",
    icon: Building2,
    accent: "bg-saffron-400",
    href: "/submit-fdr",
    cta: "Open submission desk",
    steps: [
      "Open Submit new FDR and enter the bank, branch, IFSC and instrument particulars.",
      "Attach the original FDR scan or bank confirmation letter as PDF, PNG or JPEG.",
      "Check the derived maturity window, then submit the record for scrutiny.",
      "Track the outcome from the FDR repository and respond to any discrepancy.",
    ],
  },
  {
    role: "AICTE scrutiny officer",
    icon: SearchCheck,
    accent: "bg-teal-500",
    href: "/repository?verification=INSTITUTION_SUBMITTED",
    cta: "Open scrutiny queue",
    steps: [
      "Work the scrutiny queue and open the split-screen record review.",
      "Compare the declared amount, dates and bank details with the attached evidence.",
      "Record a bank confirmation reference or flag a discrepancy with a substantive note.",
      "Recommend eligible release cases to the Regulation Bureau Head.",
    ],
  },
  {
    role: "Regulation Bureau Head",
    icon: ShieldCheck,
    accent: "bg-navy-700",
    href: "/releases",
    cta: "Open release desk",
    steps: [
      "Review cases that have been recommended by the scrutiny desk.",
      "Inspect the evidence, verification history and officer recommendation.",
      "Approve or reject the case, recording a reason where required.",
      "The dispatch reference and printable authorisation are generated on approval.",
    ],
  },
];

const faqs = [
  {
    question: "How do I reset my password?",
    answer:
      "Portal credentials are administered by the Regulation Bureau. Contact the portal helpdesk to have your account reset; passwords are never shared by email and are stored only as salted scrypt hashes.",
  },
  {
    question: "Why can I see only some institutions?",
    answer:
      "Access follows your assigned role. Institution administrators are scoped to their own institution. Scrutiny officers and the Bureau Head work across the bureau register. Every query and server action re-checks that scope.",
  },
  {
    question: "What evidence can I upload?",
    answer:
      "PDF, PNG and JPEG files up to 10 MB each. Files are content-sniffed, fingerprinted with SHA-256 and encrypted with AES-256-GCM before they are stored. The original file name and fingerprint remain visible in the record.",
  },
  {
    question: "When is an instrument eligible for release?",
    answer:
      "The deposit must be bank-confirmed, must not already be released, must have no successor instrument, and must not have an active release case. The release desk checks these conditions before the request can be raised.",
  },
  {
    question: "What is the renewal window?",
    answer:
      "A successor instrument can be linked to a predecessor within 180 days around its maturity date. The parent remains visible in the register and is marked renewal-pending until the successor clears scrutiny.",
  },
  {
    question: "Can an audit record be edited?",
    answer:
      "No. Audit events are append-only and protected by a database trigger that rejects updates and deletes. Exports are generated from the same immutable history.",
  },
  {
    question: "How do I export the register?",
    answer:
      "Open the FDR repository and use CSV or JSON export. The current filters are applied to the export, and the download itself is recorded in the audit trail.",
  },
  {
    question: "Who do I contact for support?",
    answer:
      "Reach the Regulation Bureau portal helpdesk at portal.support@aicte.gov.in with your role, institution and the record reference. Do not attach original financial instruments to email.",
  },
];

const shortcuts = [
  { keys: "Ctrl / ⌘ + K", action: "Open search and navigation" },
  { keys: "↑ / ↓", action: "Move through search results" },
  { keys: "Enter", action: "Open the highlighted destination" },
  { keys: "Esc", action: "Close search, menus or the mobile drawer" },
];

const guidance = [
  {
    icon: CalendarClock,
    title: "Maturity monitoring",
    description:
      "Status is derived from the maturity date on every read, so expiring and overdue instruments surface automatically.",
  },
  {
    icon: FileCheck2,
    title: "Evidence integrity",
    description:
      "Each document keeps its SHA-256 fingerprint. Scrutiny compares the evidence, not a transcribed summary.",
  },
  {
    icon: Workflow,
    title: "One controlled chain",
    description:
      "Submission, verification, renewal and release stay linked to the same instrument record and audit history.",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Help centre · Guidance & procedures"
        title="Clear answers for every step of the deposit lifecycle."
        description="Role-based guidance, workflow walkthroughs and answers to the questions the Regulation Bureau receives most often."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/about">
                <BookOpen className="h-4 w-4" aria-hidden />
                About the portal
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/security">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Security &amp; assurance
              </Link>
            </Button>
          </>
        }
      />

      <section className="relative overflow-hidden rounded-2xl bg-navy-950 p-6 text-white shadow-lift sm:p-8 lg:p-10">
        <div className="navy-grid absolute inset-0 opacity-60" aria-hidden />
        <div
          className="absolute -right-28 -top-28 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(227,160,67,0.2),transparent_68%)]"
          aria-hidden
        />
        <div
          className="absolute -bottom-44 left-1/4 h-[360px] w-[360px] rounded-full border border-white/[0.06] bg-[radial-gradient(circle,rgba(41,159,153,0.12),transparent_66%)]"
          aria-hidden
        />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-saffron-300/25 bg-saffron-300/[0.08] px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.15em] text-saffron-200">
              <LifeBuoy className="h-3 w-3" aria-hidden />
              Start here
            </span>
            <h2 className="font-display mt-4 max-w-2xl text-[2rem] font-semibold leading-[1.12] tracking-[-0.02em] text-balance sm:text-[2.4rem]">
              Find the right desk before you file.
            </h2>
            <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-white/55">
              The portal separates institutional filing from regulatory scrutiny and final
              authorisation. Choose your role to see the exact sequence, or jump straight to a
              workspace below.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {roleGuides.map((guide) => (
                <a
                  key={guide.role}
                  href={`#${guide.role.toLowerCase().replaceAll(" ", "-")}`}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white"
                >
                  {guide.role}
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/40">
              <Keyboard className="h-3.5 w-3.5" aria-hidden />
              Keyboard shortcuts
            </div>
            <ul className="mt-4 space-y-2.5">
              {shortcuts.map((shortcut) => (
                <li key={shortcut.keys} className="flex items-center justify-between gap-3">
                  <span className="text-[10.5px] text-white/50">{shortcut.action}</span>
                  <kbd className="shrink-0 rounded border border-white/15 bg-white/[0.07] px-1.5 py-0.5 font-sans text-[9px] font-semibold text-white/75">
                    {shortcut.keys}
                  </kbd>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3.5 text-[10px] text-white/45">
              <Sparkles className="h-3.5 w-3.5 text-saffron-200/80" aria-hidden />
              Search covers every page your role can open.
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="quick-start-heading" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="quick-start-heading"
              className="font-display text-xl font-semibold text-navy-900"
            >
              Quick start
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              The six destinations most often used during a working day.
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-muted-foreground">
            <Users className="h-3 w-3" aria-hidden />
            Role-aware workspace
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickStart.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-xl border border-border/80 bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy-100 bg-navy-50 text-navy-700">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-saffron-600" aria-hidden />
                </div>
                <p className="mt-3 text-xs font-semibold text-navy-900">{item.title}</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
                <p className="mt-3 border-t border-border/60 pt-2 text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
                  {item.audience}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="role-guides-heading" className="space-y-3">
        <div>
          <h2
            id="role-guides-heading"
            className="font-display text-xl font-semibold text-navy-900"
          >
            Workflow by role
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Every desk has a defined sequence. The portal enforces the hand-offs between them.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {roleGuides.map((guide) => {
            const Icon = guide.icon;
            return (
              <Card
                key={guide.role}
                id={guide.role.toLowerCase().replaceAll(" ", "-")}
                className="relative scroll-mt-24 overflow-hidden"
              >
                <span className={`absolute inset-x-0 top-0 h-1 ${guide.accent}`} aria-hidden />
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 text-navy-800">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <CardTitle className="text-sm">{guide.role}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="space-y-2.5">
                    {guide.steps.map((step, index) => (
                      <li key={step} className="flex gap-2.5 text-[10.5px] leading-relaxed text-muted-foreground">
                        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-navy-50 text-[8px] font-bold text-navy-700">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={guide.href}>
                      {guide.cta}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section aria-labelledby="faq-heading">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-50 text-saffron-700">
                  <CircleHelp className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <CardTitle id="faq-heading">Frequently asked</CardTitle>
                  <CardDescription className="mt-0.5">
                    Policy and procedure at a glance.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y divide-border/70">
                {faqs.map((faq) => (
                  <details key={faq.question} className="group py-3 first:pt-0 last:pb-0">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11.5px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                      {faq.question}
                      <ChevronDown
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    <p className="mt-2 pr-6 text-[10.5px] leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="space-y-4">
          <section aria-labelledby="support-heading">
            <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-5 shadow-card">
              <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-saffron-50/80" aria-hidden />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-saffron-200">
                    <LifeBuoy className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h2 id="support-heading" className="text-sm font-semibold text-navy-900">
                      Portal helpdesk
                    </h2>
                    <p className="text-[10.5px] text-muted-foreground">
                      Regulation Bureau · AICTE
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Include your role, institution and the FDR reference in every request. For
                  access changes, ask your institution administrator or the Bureau to update your
                  role assignment.
                </p>
                <a
                  href="mailto:portal.support@aicte.gov.in"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] font-medium text-navy-900 transition-colors hover:border-navy-200 hover:bg-muted/50"
                >
                  <Mail className="h-3.5 w-3.5 text-saffron-600" aria-hidden />
                  portal.support@aicte.gov.in
                </a>
                <p className="mt-3 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted-foreground">
                  <KeyRound className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  Never send passwords, OTPs or original financial instruments by email.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="guidance-heading">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle id="guidance-heading" className="text-sm">
                  Good practice
                </CardTitle>
                <CardDescription>
                  Three habits that keep the register reliable.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {guidance.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-2.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold text-navy-900">{item.title}</p>
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
        </div>
      </div>

      <section className="grid gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-card sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-saffron-200">
            <ClipboardCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy-900">Ready to work a case?</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Open the repository, or review the controls that protect every record you touch.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href="/security">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Security posture
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/repository">
              <Database className="h-4 w-4" aria-hidden />
              Open repository
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
