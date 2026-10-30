"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";

import { loginAction, type LoginState } from "@/lib/actions/session";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white shadow-[0_10px_30px_-14px_rgba(11,43,71,0.8)] transition-all hover:bg-navy-800 hover:shadow-[0_14px_34px_-14px_rgba(11,43,71,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-75"
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

  function trackCapsLock(event: React.KeyboardEvent<HTMLInputElement>) {
    if (typeof event.getModifierState === "function") {
      setCapsLock(event.getModifierState("CapsLock"));
    }
  }

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
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
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            defaultValue={state.email ?? ""}
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
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Enter your password"
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

      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{state.error}</span>
        </div>
      ) : null}

      <SubmitButton />

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
