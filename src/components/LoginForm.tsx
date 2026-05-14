"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useI18n } from "@/lib/I18nContext";
import { requestMagicLink } from "@/app/login/actions";

export function LoginForm({ next }: { next?: string }) {
  const { locale } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await requestMagicLink(email);
      if (result.ok) {
        setSent(true);
        return;
      }
      setError(
        result.error === "invalid_email"
          ? locale === "nl"
            ? "Ongeldig e-mailadres."
            : "Invalid email address."
          : result.error === "unknown_email"
            ? locale === "nl"
              ? "Geen account met dit e-mailadres. Vraag een uitnodigingscode aan een beheerder."
              : "No account with that email. Ask an admin for an invite code."
            : locale === "nl"
              ? "Iets ging mis bij het verzenden. Probeer het later opnieuw."
              : "Failed to send. Try again later.",
      );
    });
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <div className="text-5xl">📬</div>
        <h1 className="mt-4 text-2xl font-black">
          {locale === "nl" ? "Check je inbox" : "Check your inbox"}
        </h1>
        <p className="mt-2 text-ink-600">
          {locale === "nl"
            ? `We hebben een inlog-link gestuurd naar ${email}. Klik op de link om verder te gaan.`
            : `We sent a sign-in link to ${email}. Click it to continue.`}
        </p>
        <p className="mt-6 text-xs text-ink-400">
          {locale === "nl"
            ? "Niets ontvangen? Check je spam-folder of vraag opnieuw."
            : "Didn't get it? Check spam or request again."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-black tracking-tight">
          {locale === "nl" ? "Inloggen" : "Sign in"}
        </h1>
        <p className="mt-1 text-ink-600">
          {locale === "nl"
            ? "We sturen een inlog-link naar je e-mail."
            : "We'll email you a sign-in link."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm"
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600">
            {locale === "nl" ? "E-mailadres" : "Email"}
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jij@voorbeeld.nl"
            className="input"
            autoFocus
          />
        </label>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {next && (
          <p className="text-xs text-ink-400">
            {locale === "nl"
              ? `Na inloggen ga je verder naar ${next}.`
              : `You'll continue to ${next} after signing in.`}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-400"
        >
          {pending
            ? locale === "nl"
              ? "Bezig…"
              : "Sending…"
            : locale === "nl"
              ? "Stuur inlog-link →"
              : "Send sign-in link →"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        {locale === "nl" ? "Nog geen account?" : "No account yet?"}{" "}
        <Link href="/join" className="font-semibold text-ink-900 hover:underline">
          {locale === "nl" ? "Aanmelden met uitnodigingscode" : "Join with invite code"}
        </Link>
      </p>
    </div>
  );
}
