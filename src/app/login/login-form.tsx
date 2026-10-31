"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Landmark,
  Loader2,
  LockKeyhole,
  Mail,
  SearchCheck,
  Sparkles,
} from "lucide-react";

import { loginAction, type LoginState } from "@/lib/actions/session";
import { cn } from "@/lib/utils";

const initialState: LoginState = {};

const demoAccounts = [
  {
    role: "REGULATION_BUREAU_HEAD",
    label: "Bureau Head",
    email: "head@aicte.gov.in",
    password: "Aicte@2026",
    icon: Landmark,
  },
  {
    role: "AICTE_SCRUTINY_OFFICER",
    label: "Scrutiny",
    email: "scrutiny@aicte.gov.in",
    password: "Aicte@2026",
    icon: SearchCheck,
  },
  {
    role: "INSTITUTION_ADMIN",
    label: "Institution",
    email: "admin@niet.ac.in",
    password: "Aicte@2026",
    icon: Building2,
  },
] as const;

function SubmitButton({ buttonRef }: { buttonRef: React.Ref<HTMLButtonElement> }) {
  const { pending } = useFormStatus();

  return (
    <button
      ref={buttonRef}
      id="sign-in-submit"
      type="submit"
      disabled={pending}
      className="button-sheen group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white shadow-[0_10px_30px_-14px_rgba(11,43,71,0.8)] transition-all hover:bg-navy-800 hover:shadow-[0_14px_34px_-14px_rgba(11,43,71,0.9)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-75"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Verifying access…
        </>
      ) : (
        <>
          Sign in to workspace
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </>
      )}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  function trackCapsLock(event: React.KeyboardEvent<HTMLInputElement>) {
    if (typeof event.getModifierState === "function") {
      setCapsLock(event.getModifierState("CapsLock"));
    }
  }

  function fillDemoAccount(account: (typeof demoAccounts)[number]) {
    if (emailRef.current) emailRef.current.value = account.email;
    if (passwordRef.current) passwordRef.current.value = account.password;
    setActiveDemo(account.role);
    setShowPassword(false);
    setCapsLock(false);
    requestAnimationFrame(() => submitRef.current?.focus());
  }

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <div className="rounded-xl border border-saffron-200/90 bg-saffron-50/60 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-saffron-800">
            <Sparkles className="h-3 w-3" aria-hidden />
            Demo access
          </p>
          <span className="text-[9px] font-medium text-muted-foreground">
            Click a role to fill
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {demoAccounts.map((account) => {
            const Icon = account.icon;
            const selected = activeDemo === account.role;
            return (
              <button
                key={account.role}
                type="button"
                onClick={() => fillDemoAccount(account)}
                aria-pressed={selected}
                aria-label={`Fill ${account.label} demo credentials`}
                className={cn(
                  "group flex min-w-0 flex-col items-start rounded-lg border px-2 py-2 text-left transition-all duration-200",
                  selected
                    ? "border-saffron-400 bg-white shadow-xs"
                    : "border-border/80 bg-white/75 hover:-translate-y-0.5 hover:border-saffron-300 hover:bg-white hover:shadow-xs",
                )}
              >
                <span className="flex w-full items-center justify-between gap-1">
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110",
                      selected ? "text-saffron-600" : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                  {selected ? (
                    <Check className="h-3 w-3 text-emerald-600" aria-hidden />
                  ) : (
                    <ArrowRight className="h-3 w-3 text-muted-foreground/45 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  )}
                </span>
                <span className="mt-1.5 block truncate text-[10px] font-semibold text-navy-900">
                  {account.label}
                </span>
                <span className="block w-full truncate text-[8.5px] text-muted-foreground">
                  {account.email}
                </span>
              </button>
            );
          })}
        </div>
        <p
          className={cn(
            "mt-2 text-[9.5px] leading-relaxed",
            activeDemo ? "font-medium text-emerald-700" : "text-muted-foreground",
          )}
        >
          {activeDemo
            ? "Credentials filled. Press Sign in to open the workspace."
            : "Seeded accounts for role-based walkthroughs. Password fills automatically."}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-semibold text-navy-900">
          Official email address
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            defaultValue={state.email ?? ""}
            onChange={() => setActiveDemo(null)}
            placeholder="name@aicte.gov.in"
            aria-invalid={state.error ? true : undefined}
            className="h-11 w-full rounded-lg border border-input bg-white pl-10 pr-3 text-sm shadow-xs outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-ring/25"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="password" className="text-xs font-semibold text-navy-900">
            Password
          </label>
          <span className="text-[10.5px] text-muted-foreground">
            Access issued by the Regulation Bureau
          </span>
        </div>
        <div className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            onChange={() => setActiveDemo(null)}
            onKeyDown={trackCapsLock}
            onKeyUp={trackCapsLock}
            onBlur={() => setCapsLock(false)}
            aria-describedby={capsLock ? "caps-lock-hint" : undefined}
            className="h-11 w-full rounded-lg border border-input bg-white pl-10 pr-11 text-sm shadow-xs outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-ring/25"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
        {capsLock ? (
          <p id="caps-lock-hint" className="flex items-center gap-1.5 text-[11px] text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            Caps Lock is on.
          </p>
        ) : null}
      </div>

      {state.error && !activeDemo ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{state.error}</span>
        </div>
      ) : null}

      <SubmitButton buttonRef={submitRef} />

      <div className="flex items-center justify-center gap-2 pt-1 text-[10.5px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        Encrypted session · Authorised personnel only
      </div>

      <p className="text-center text-[10.5px] leading-relaxed text-muted-foreground">
        Need an account? Contact your institution&apos;s authorised signatory or the
        AICTE Regulation Bureau.
      </p>
    </form>
  );
}

