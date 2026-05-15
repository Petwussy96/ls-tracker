"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/lib/I18nContext";
import {
  checkEmail,
  loginWithPassword,
  setInitialPassword,
} from "@/app/login/actions";
import { MIN_PASSWORD_LEN } from "@/lib/passwordConstants";

type Step =
  | { kind: "email" }
  | { kind: "login"; email: string }
  | { kind: "setup"; email: string };

export function LoginForm({ next }: { next?: string }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "email" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await checkEmail(email);
      if (!r.ok) {
        setError(emailErrorMessage(r.error, locale));
        return;
      }
      setStep(
        r.status === "needs_password"
          ? { kind: "login", email }
          : { kind: "setup", email },
      );
    });
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await loginWithPassword({ email, password });
      if (!r.ok) {
        if (r.error === "needs_setup") {
          setStep({ kind: "setup", email });
          setError(null);
        } else {
          setError(loginErrorMessage(r.error, locale));
        }
        return;
      }
      router.push(next || "/");
      router.refresh();
    });
  }

  function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LEN) {
      setError(
        locale === "nl"
          ? `Wachtwoord moet minimaal ${MIN_PASSWORD_LEN} tekens zijn.`
          : `Password must be at least ${MIN_PASSWORD_LEN} characters.`,
      );
      return;
    }
    if (password !== confirm) {
      setError(locale === "nl" ? "Wachtwoorden komen niet overeen." : "Passwords don't match.");
      return;
    }
    startTransition(async () => {
      const r = await setInitialPassword({ email, password });
      if (!r.ok) {
        setError(setupErrorMessage(r.error, locale));
        return;
      }
      router.push(next || "/");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-black tracking-tight">
          {locale === "nl" ? "Inloggen" : "Sign in"}
        </h1>
        <p className="mt-1 text-ink-600 dark:text-ink-300">
          {step.kind === "email"
            ? locale === "nl"
              ? "Vul je e-mailadres in om te beginnen."
              : "Enter your email to begin."
            : step.kind === "setup"
              ? locale === "nl"
                ? "Eerste keer: stel een wachtwoord in."
                : "First time: set a password."
              : locale === "nl"
                ? "Vul je wachtwoord in."
                : "Enter your password."}
        </p>
      </div>

      <form
        onSubmit={
          step.kind === "email" ? handleEmail : step.kind === "login" ? handleLogin : handleSetup
        }
        className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-700 dark:bg-ink-900"
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
            {locale === "nl" ? "E-mailadres" : "Email"}
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={step.kind !== "email"}
            placeholder="jij@voorbeeld.nl"
            className="input"
            autoFocus={step.kind === "email"}
          />
          {step.kind !== "email" && (
            <button
              type="button"
              onClick={() => {
                setStep({ kind: "email" });
                setPassword("");
                setConfirm("");
                setError(null);
              }}
              className="mt-1 text-xs font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
            >
              ← {locale === "nl" ? "Ander adres" : "Use a different email"}
            </button>
          )}
        </label>

        {(step.kind === "login" || step.kind === "setup") && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
              {step.kind === "setup"
                ? locale === "nl"
                  ? "Kies een wachtwoord"
                  : "Choose a password"
                : locale === "nl"
                  ? "Wachtwoord"
                  : "Password"}
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={step.kind === "setup" ? MIN_PASSWORD_LEN : undefined}
              placeholder={step.kind === "setup" ? `min. ${MIN_PASSWORD_LEN} tekens` : "••••••••"}
              className="input"
              autoFocus
              autoComplete={step.kind === "setup" ? "new-password" : "current-password"}
            />
          </label>
        )}

        {step.kind === "setup" && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
              {locale === "nl" ? "Bevestig wachtwoord" : "Confirm password"}
            </span>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={MIN_PASSWORD_LEN}
              className="input"
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
              {locale === "nl"
                ? "Je account bestond al — kies een wachtwoord om verder te gaan."
                : "Your account exists — pick a password to continue."}
            </p>
          </label>
        )}

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}

        {next && step.kind === "email" && (
          <p className="text-xs text-ink-400">
            {locale === "nl"
              ? `Na inloggen ga je verder naar ${next}.`
              : `You'll continue to ${next} after signing in.`}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-400 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100 dark:disabled:bg-ink-700"
        >
          {pending
            ? locale === "nl"
              ? "Bezig…"
              : "Working…"
            : step.kind === "email"
              ? locale === "nl"
                ? "Verder →"
                : "Continue →"
              : step.kind === "setup"
                ? locale === "nl"
                  ? "Stel wachtwoord in →"
                  : "Set password →"
                : locale === "nl"
                  ? "Inloggen →"
                  : "Sign in →"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600 dark:text-ink-300">
        {locale === "nl" ? "Nog geen account?" : "No account yet?"}{" "}
        <Link href="/join" className="font-semibold text-ink-900 hover:underline dark:text-white">
          {locale === "nl" ? "Aanmelden met uitnodigingscode" : "Join with invite code"}
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-ink-400 dark:text-ink-500">
        <Link href="/forgot-password" className="hover:underline">
          {locale === "nl" ? "Wachtwoord vergeten?" : "Forgot password?"}
        </Link>
      </p>
    </div>
  );
}

function emailErrorMessage(
  err: "invalid_email" | "unknown_email" | "rate_limited",
  locale: "nl" | "en",
): string {
  if (locale === "nl") {
    return {
      invalid_email: "Ongeldig e-mailadres.",
      unknown_email: "Geen account met dit e-mailadres. Heb je een uitnodigingscode? Klik dan op 'Aanmelden'.",
      rate_limited: "Te veel pogingen. Wacht een kwartier.",
    }[err];
  }
  return {
    invalid_email: "Invalid email address.",
    unknown_email: "No account with that email. Got an invite code? Click 'Join'.",
    rate_limited: "Too many attempts. Wait 15 minutes.",
  }[err];
}

function loginErrorMessage(
  err: Exclude<"invalid_email" | "unknown_email" | "wrong_password" | "needs_setup" | "rate_limited" | "server_error", "needs_setup">,
  locale: "nl" | "en",
): string {
  if (locale === "nl") {
    return {
      invalid_email: "Ongeldig e-mailadres.",
      unknown_email: "Geen account gevonden.",
      wrong_password: "Verkeerd wachtwoord.",
      rate_limited: "Te veel pogingen. Wacht een kwartier.",
      server_error: "Er ging iets mis. Probeer opnieuw.",
    }[err];
  }
  return {
    invalid_email: "Invalid email.",
    unknown_email: "No account found.",
    wrong_password: "Wrong password.",
    rate_limited: "Too many attempts. Wait 15 minutes.",
    server_error: "Something went wrong. Try again.",
  }[err];
}

function setupErrorMessage(
  err: "invalid_email" | "unknown_email" | "already_set" | "weak_password" | "rate_limited" | "server_error",
  locale: "nl" | "en",
): string {
  if (locale === "nl") {
    return {
      invalid_email: "Ongeldig e-mailadres.",
      unknown_email: "Geen account met dit e-mailadres.",
      already_set: "Er staat al een wachtwoord. Log in via het normale formulier.",
      weak_password: `Wachtwoord moet minimaal ${MIN_PASSWORD_LEN} tekens zijn.`,
      rate_limited: "Te veel pogingen. Wacht even.",
      server_error: "Er ging iets mis. Probeer opnieuw.",
    }[err];
  }
  return {
    invalid_email: "Invalid email.",
    unknown_email: "No such account.",
    already_set: "A password is already set. Sign in normally.",
    weak_password: `Password must be at least ${MIN_PASSWORD_LEN} characters.`,
    rate_limited: "Too many attempts. Wait.",
    server_error: "Something went wrong. Try again.",
  }[err];
}
