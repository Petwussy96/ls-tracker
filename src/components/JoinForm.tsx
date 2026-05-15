"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useI18n } from "@/lib/I18nContext";
import { useRouter } from "next/navigation";
import { signupWithInvite, validateInviteCode } from "@/app/join/actions";

const MIN_PASSWORD_LEN = 8;

type Step = "code" | "details" | "done";

export function JoinForm({ prefillCode }: { prefillCode: string }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState(prefillCode.toUpperCase());
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // If a code was passed via URL, try to advance automatically.
  useEffect(() => {
    if (!prefillCode) return;
    startTransition(async () => {
      const result = await validateInviteCode(prefillCode);
      if (result.ok) {
        setStep("details");
      } else {
        setError(codeErrorMessage(result.error, locale));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillCode]);

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await validateInviteCode(code);
      if (result.ok) {
        setStep("details");
      } else {
        setError(codeErrorMessage(result.error, locale));
      }
    });
  }

  function handleDetailsSubmit(e: React.FormEvent) {
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
      const result = await signupWithInvite({ code, email, username, displayName, password });
      if (result.ok) {
        setStep("done");
        // auto-login: server set the cookie, just navigate
        router.push("/");
        router.refresh();
        return;
      }
      setError(signupErrorMessage(result.error, locale));
    });
  }

  if (step === "done") {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-4 text-2xl font-black">
          {locale === "nl" ? "Account aangemaakt!" : "Account created!"}
        </h1>
        <p className="mt-2 text-ink-600 dark:text-ink-300">
          {locale === "nl"
            ? "Je bent ingelogd. Veel succes!"
            : "You're signed in. Good luck!"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-black tracking-tight">
          {locale === "nl" ? "Aanmelden" : "Join"}
        </h1>
        <p className="mt-1 text-ink-600 dark:text-ink-300">
          {step === "code"
            ? locale === "nl"
              ? "Voer je uitnodigingscode in. Deze krijg je van een beheerder in de Facebook-groep."
              : "Enter your invite code. You get one from an admin in the Facebook group."
            : locale === "nl"
              ? "Bijna klaar — kies een gebruikersnaam en voer je e-mail in."
              : "Almost done — pick a username and enter your email."}
        </p>
      </div>

      {step === "code" && (
        <form
          onSubmit={handleCodeSubmit}
          className="space-y-4 rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 shadow-sm"
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
              {locale === "nl" ? "Uitnodigingscode" : "Invite code"}
            </span>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="LS-XYZ-1234"
              className="input font-mono tracking-wider"
              autoFocus
            />
          </label>

          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">{error}</div>
          )}

          <button
            type="submit"
            disabled={pending || code.length < 3}
            className="w-full rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-400"
          >
            {pending
              ? locale === "nl"
                ? "Checken…"
                : "Checking…"
              : locale === "nl"
                ? "Verder →"
                : "Continue →"}
          </button>
        </form>
      )}

      {step === "details" && (
        <form
          onSubmit={handleDetailsSubmit}
          className="space-y-4 rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 shadow-sm"
        >
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 text-sm text-emerald-800 dark:text-emerald-200">
            ✓ {locale === "nl" ? "Code geldig" : "Code valid"}{" "}
            <span className="font-mono text-xs">{code}</span>
          </div>

          <Field
            label={locale === "nl" ? "Naam in de groep" : "Display name"}
            hint={
              locale === "nl"
                ? "Zoals je naam in de Facebook-groep wordt weergegeven"
                : "How your name shows up in the Facebook group"
            }
            required
          >
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Bijv. Dikke Jan"
              className="input"
              autoFocus
            />
          </Field>

          <Field
            label={locale === "nl" ? "Gebruikersnaam" : "Username"}
            hint={
              locale === "nl"
                ? "3-20 tekens, alleen letters / cijfers / underscores"
                : "3-20 chars, letters / digits / underscores"
            }
            required
          >
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9_]/g, ""))}
              placeholder="DikkeJan"
              className="input font-mono"
              maxLength={20}
            />
          </Field>

          <Field label={locale === "nl" ? "E-mailadres" : "Email"} required>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jij@voorbeeld.nl"
              className="input"
            />
          </Field>

          <Field
            label={locale === "nl" ? "Kies een wachtwoord" : "Choose a password"}
            hint={locale === "nl" ? `Minimaal ${MIN_PASSWORD_LEN} tekens` : `At least ${MIN_PASSWORD_LEN} characters`}
            required
          >
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MIN_PASSWORD_LEN}
              className="input"
              autoComplete="new-password"
            />
          </Field>

          <Field label={locale === "nl" ? "Bevestig wachtwoord" : "Confirm password"} required>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={MIN_PASSWORD_LEN}
              className="input"
              autoComplete="new-password"
            />
          </Field>

          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">{error}</div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-400"
          >
            {pending
              ? locale === "nl"
                ? "Bezig…"
                : "Submitting…"
              : locale === "nl"
                ? "Account aanmaken →"
                : "Create account →"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink-600 dark:text-ink-300">
        {locale === "nl" ? "Al een account?" : "Already have an account?"}{" "}
        <Link href="/login" className="font-semibold text-ink-900 dark:text-white hover:underline">
          {locale === "nl" ? "Inloggen" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}

function codeErrorMessage(
  error: "unknown" | "consumed" | "expired" | "rate_limited",
  locale: "nl" | "en",
): string {
  if (locale === "nl") {
    return {
      unknown: "Code niet gevonden. Check of je hem goed hebt overgenomen.",
      consumed: "Deze code is al gebruikt.",
      expired: "Deze code is verlopen. Vraag een nieuwe aan.",
      rate_limited: "Te veel pogingen. Wacht 10 minuten en probeer het opnieuw.",
    }[error];
  }
  return {
    unknown: "Code not found. Double-check it.",
    consumed: "This code has already been used.",
    expired: "This code is expired. Ask for a new one.",
    rate_limited: "Too many attempts. Wait 10 minutes and try again.",
  }[error];
}

function signupErrorMessage(error: string, locale: "nl" | "en"): string {
  if (locale === "nl") {
    return (
      {
        invalid_code: "Code is niet meer geldig. Vraag een nieuwe aan.",
        code_consumed: "Deze code is al gebruikt.",
        code_expired: "Deze code is verlopen.",
        invalid_email: "Ongeldig e-mailadres.",
        email_taken: "Dit e-mailadres is al in gebruik.",
        invalid_username: "Gebruikersnaam moet 3-20 tekens zijn (letters, cijfers, underscore).",
        username_taken: "Deze gebruikersnaam is al bezet.",
        invalid_displayname: "Naam moet tussen 2 en 40 tekens zijn.",
        weak_password: "Wachtwoord te kort (min. 8 tekens).",
        send_failed: "Iets ging mis. Probeer het opnieuw.",
        rate_limited: "Te veel pogingen vanaf jouw IP. Wacht een uur.",
      }[error] ?? "Er ging iets mis."
    );
  }
  return (
    {
      invalid_code: "Code is no longer valid. Ask for a new one.",
      code_consumed: "This code has been used.",
      code_expired: "This code is expired.",
      invalid_email: "Invalid email address.",
      email_taken: "This email is already taken.",
      invalid_username: "Username must be 3-20 chars (letters, digits, underscore).",
      username_taken: "This username is taken.",
      invalid_displayname: "Display name must be 2-40 chars.",
      weak_password: "Password too short (min. 8 characters).",
      send_failed: "Something went wrong. Try again.",
      rate_limited: "Too many attempts from your IP. Wait an hour.",
    }[error] ?? "Something went wrong."
  );
}

function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-400 dark:text-ink-500">{hint}</span>}
    </label>
  );
}
