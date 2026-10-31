import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  FileCheck2,
  FileSearch,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { LoginForm } from "@/app/login/login-form";
import { APP_NAME, APP_SUBTITLE, ORGANISATION } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Secure access to FDR Setu, the AICTE Security Deposit & FDR Management Portal.",
};

const custodySteps = [
  {
    icon: FileCheck2,
    title: "Register",
    description: "FDR particulars and bank evidence enter one controlled register.",
  },
  {
    icon: FileSearch,
    title: "Verify",
    description: "Scrutiny officers reconcile every instrument against bank confirmation.",
  },
  {
    icon: BadgeCheck,
    title: "Authorise",
    description: "Releases follow a documented, three-stage approval chain.",
  },
] as const;

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main id="main-content" className="min-h-dvh bg-[#f8f5ee] lg:grid lg:grid-cols-[1.05fr_minmax(440px,0.95fr)]">
      <section className="relative hidden min-h-dvh overflow-hidden bg-navy-950 text-white lg:flex lg:flex-col">
        <div className="navy-grid absolute inset-0 opacity-70" aria-hidden />
        <div
          className="absolute -left-40 top-14 h-[520px] w-[520px] animate-float-slow rounded-full bg-[radial-gradient(circle,rgba(227,160,67,0.2),transparent_68%)]"
          aria-hidden
        />
        <div
          className="absolute -right-40 bottom-[-160px] h-[620px] w-[620px] animate-float-slower rounded-full border border-white/[0.06] bg-[radial-gradient(circle,rgba(41,159,153,0.13),transparent_66%)]"
          aria-hidden
        />
        <div
          className="absolute right-[14%] top-[13%] h-64 w-64 animate-spin-slow rounded-full border border-saffron-300/15 [animation-duration:64s]"
          aria-hidden
        >
          <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-saffron-300/80" />
        </div>
        <div
          className="absolute right-[10%] top-[9%] h-[22rem] w-[22rem] animate-spin-slow rounded-full border border-white/[0.05] [animation-direction:reverse] [animation-duration:76s]"
          aria-hidden
        >
          <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 translate-y-1/2 rounded-full bg-teal-300/60" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col px-10 py-9 xl:px-14 xl:py-12">
          <div className="flex animate-fade-in items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-saffron-200/30 bg-white/[0.07] text-saffron-200 shadow-lg shadow-black/10">
                <ShieldCheck className="h-6 w-6" aria-hidden />
              </span>
              <span>
                <span className="font-display block text-lg font-semibold leading-tight tracking-wide">
                  {APP_NAME}
                </span>
                <span className="mt-0.5 block text-[9.5px] font-medium uppercase tracking-[0.18em] text-white/50">
                  Security Deposit &amp; FDR
                </span>
              </span>
            </div>
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[9.5px] font-medium uppercase tracking-[0.12em] text-white/55">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              Secure workspace
            </span>
          </div>

          <div className="my-auto max-w-[575px] py-14">
            <span className="inline-flex animate-rise items-center gap-1.5 rounded-full border border-saffron-300/20 bg-saffron-300/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-saffron-200 [animation-delay:80ms]">
              <Sparkles className="h-3 w-3" aria-hidden />
              Regulation Bureau
            </span>
            <h1 className="font-display mt-5 animate-rise text-[2.7rem] font-semibold leading-[1.05] tracking-[-0.025em] text-white text-balance [animation-delay:140ms] xl:text-[3.25rem]">
              Every deposit.
              <br />
              <span className="text-gradient-gold animate-gradient-pan">Accounted for.</span>
            </h1>
            <p className="mt-5 max-w-[475px] animate-rise text-[13.5px] leading-relaxed text-white/60 [animation-delay:220ms]">
              A single, auditable workspace for institutional security deposits — from FDR
              submission and bank verification through renewal to final release.
            </p>

            <div className="mt-9 animate-rise overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/20 backdrop-blur-sm [animation-delay:300ms]">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <LockKeyhole className="h-3.5 w-3.5 text-saffron-200" aria-hidden />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                    Chain of custody
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-[9.5px] font-medium text-emerald-300/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                  End to end
                </span>
              </div>
              <ol className="divide-y divide-white/[0.07]">
                {custodySteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <li
                      key={step.title}
                      className="flex items-start gap-3.5 px-5 py-3.5 transition-colors hover:bg-white/[0.025]"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-saffron-200">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[12px] font-semibold text-white/90">
                          <span className="font-mono text-[9px] font-medium text-white/35">
                            0{index + 1}
                          </span>
                          {step.title}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] leading-relaxed text-white/45">
                          {step.description}
                        </span>
                      </span>
                      {index === custodySteps.length - 1 ? (
                        <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-300/80" aria-hidden />
                      ) : (
                        <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-white/20" aria-hidden />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <div className="animate-fade-in [animation-delay:420ms]">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-[10px] text-white/40">
              <span className="flex items-center gap-1.5">
                <LockKeyhole className="h-3 w-3 text-saffron-200/70" aria-hidden />
                AES-256 encrypted evidence
              </span>
              <span className="flex items-center gap-1.5">
                <FileSearch className="h-3 w-3 text-saffron-200/70" aria-hidden />
                Append-only audit trail
              </span>
              <span className="flex items-center gap-1.5">
                <Landmark className="h-3 w-3 text-saffron-200/70" aria-hidden />
                Role-scoped access
              </span>
            </div>
            <p className="mt-4 text-[10px] tracking-wide text-white/30">
              {ORGANISATION} · Regulation Bureau
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-dvh flex-col bg-[#fbfaf7]">
        <div className="flex animate-fade-in items-center justify-between gap-4 border-b border-border/60 px-6 py-4 lg:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-saffron-200">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="font-display block text-sm font-semibold leading-tight text-navy-950">
                {APP_NAME}
              </span>
              <span className="block text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground">
                {APP_SUBTITLE}
              </span>
            </span>
          </div>
          <span className="rounded-full border border-border bg-white px-2 py-1 text-[9px] font-medium text-muted-foreground">
            Secure
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-[405px]">
            <div className="animate-rise">
              <p className="eyebrow flex items-center gap-2">
                <span
                  className="h-px w-6 origin-left animate-grow-x bg-saffron-500"
                  aria-hidden
                />
                Portal access
              </p>
              <h2 className="font-display mt-3 text-[2.15rem] font-semibold leading-[1.08] tracking-[-0.02em] text-navy-950">
                Welcome back.
              </h2>
              <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
                Sign in with your AICTE or institution account to continue to your workspace.
              </p>
            </div>

            <div className="animate-rise [animation-delay:120ms]">
              <LoginForm />
            </div>

            <div className="mt-8 flex animate-rise items-start gap-3 rounded-xl border border-border/80 bg-white px-4 py-3.5 shadow-card [animation-delay:240ms]">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                <ShieldCheck className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-navy-900">
                  A controlled regulatory workspace
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                  Sign-in and every workflow action are recorded in the portal&apos;s immutable
                  audit trail.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t border-border/60 px-6 py-4 text-[9.5px] text-muted-foreground sm:flex-row sm:px-8">
          <p>© {new Date().getFullYear()} AICTE Regulation Bureau</p>
          <p className="flex items-center gap-1.5">
            <LockKeyhole className="h-3 w-3" aria-hidden />
            Authorised access only
          </p>
        </div>
      </section>
    </main>
  );
}
