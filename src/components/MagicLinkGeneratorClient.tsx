"use client";

import { useState, useTransition } from "react";
import {
  generateAdminMagicLink,
  type GenerateMagicLinkResult,
} from "@/app/actions/generateMagicLink";

export function MagicLinkGeneratorClient() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<GenerateMagicLinkResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setCopied(false);
    startTransition(async () => {
      const r = await generateAdminMagicLink({ email });
      setResult(r);
    });
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — older browsers / iframe contexts
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={submit}
        className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-900"
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
            E-mailadres
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tester@voorbeeld.nl"
            className="input"
            autoFocus
          />
        </label>
        <button
          type="submit"
          disabled={pending || !email}
          className="mt-4 w-full rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-400 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100 dark:disabled:bg-ink-700"
        >
          {pending ? "Bezig…" : "Genereer magic-link →"}
        </button>
      </form>

      {result && !result.ok && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
          {errorMessage(result.error)}
        </div>
      )}

      {result && result.ok && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/40">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
            ✓ Link aangemaakt voor <strong>{result.displayName}</strong>
          </p>
          <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">
            Geldig tot {new Date(result.expiresAt).toLocaleString("nl-NL")}
          </p>
          <div className="mt-3 rounded-xl border border-emerald-300 bg-white p-3 dark:border-emerald-800 dark:bg-ink-900">
            <code className="block break-all text-xs text-ink-800 dark:text-ink-100">
              {result.url}
            </code>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard(result.url)}
              className="rounded-full bg-ink-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
            >
              {copied ? "✓ Gekopieerd" : "📋 Kopieer link"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Hier is je inlog-link voor LS Tracker (24u geldig):\n${result.url}`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-ink-200 bg-white px-4 py-1.5 text-xs font-semibold text-ink-800 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700"
            >
              💬 Deel via WhatsApp
            </a>
          </div>
          <p className="mt-3 text-[11px] text-emerald-700 dark:text-emerald-300">
            Eén keer bruikbaar — daarna kan je een nieuwe genereren.
          </p>
        </div>
      )}
    </div>
  );
}

function errorMessage(
  err: Exclude<GenerateMagicLinkResult, { ok: true }>["error"],
): string {
  switch (err) {
    case "not_admin":
      return "Alleen beheerders kunnen magic-links genereren.";
    case "invalid_email":
      return "Ongeldig e-mailadres.";
    case "unknown_email":
      return "Geen account met dit e-mailadres. Maak eerst een invite aan via /admin/invites.";
    case "missing_secret":
      return "AUTH_SECRET ontbreekt op de server — neem contact op met de techneut.";
    case "missing_base_url":
      return "AUTH_URL ontbreekt op de server — moet ingesteld zijn op Vercel.";
    case "server_error":
      return "Iets ging mis op de server. Probeer opnieuw.";
  }
}
