"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/lib/I18nContext";
import { reportBet } from "@/app/actions/reportBet";

// Small "🚩 Melden"-button shown on resolved bets to non-owners. Clicking opens
// an inline confirm with an optional reason field. After submission the local
// state remembers that this user already reported — re-clicking is no-op.
//
// Persistence-across-reload isn't important here: the server upsert is keyed
// on (betId, reporterId) so re-clicking won't duplicate, and the visual
// "Gemeld" state isn't security-critical.

export function ReportButton({ betId }: { betId: string }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await reportBet({ betId, reason: reason.trim() || undefined });
      if (r.ok) {
        setDone(true);
        setOpen(false);
        return;
      }
      const msg: Record<typeof r.error, string> =
        locale === "nl"
          ? {
              not_authenticated: "Log eerst in.",
              bet_not_found: "Bet bestaat niet meer.",
              cannot_report_own: "Je kunt je eigen bet niet melden.",
              rate_limited: "Te veel meldingen — wacht even.",
              server_error: "Er ging iets mis, probeer opnieuw.",
            }
          : {
              not_authenticated: "Sign in first.",
              bet_not_found: "Bet no longer exists.",
              cannot_report_own: "You can't report your own bet.",
              rate_limited: "Too many reports — slow down.",
              server_error: "Something went wrong. Try again.",
            };
      setError(msg[r.error]);
    });
  }

  if (done) {
    return (
      <p className="mt-3 text-xs text-ink-400 dark:text-ink-500">
        ✓ {locale === "nl" ? "Gemeld — bedankt." : "Reported — thanks."}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1 text-xs text-ink-400 hover:text-rose-600 dark:text-ink-500 dark:hover:text-rose-400"
      >
        🚩 {locale === "nl" ? "Verkeerd afgehandeld?" : "Wrong outcome?"}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/40">
      <p className="font-semibold text-ink-800 dark:text-ink-100">
        {locale === "nl"
          ? "Melden dat deze bet verkeerd is afgehandeld?"
          : "Report that this bet was resolved incorrectly?"}
      </p>
      <p className="mt-1 text-ink-600 dark:text-ink-300">
        {locale === "nl"
          ? "Bij 3+ meldingen kijkt een beheerder ernaar."
          : "At 3+ reports an admin will review it."}
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={300}
        placeholder={
          locale === "nl"
            ? "Optioneel: korte toelichting (bv. 'Cardiff won, niet verloren')"
            : "Optional: a short note (e.g. 'Cardiff won, not lost')"
        }
        className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs text-ink-800 dark:border-amber-900/40 dark:bg-ink-900 dark:text-ink-100"
      />
      {error && <p className="mt-2 text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setReason("");
          }}
          className="rounded-full px-3 py-1 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
        >
          {locale === "nl" ? "Annuleer" : "Cancel"}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-full bg-ink-900 px-3 py-1 font-semibold text-white hover:bg-ink-800 disabled:opacity-50 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
        >
          {pending
            ? locale === "nl"
              ? "Versturen…"
              : "Sending…"
            : locale === "nl"
              ? "Verstuur melding"
              : "Send report"}
        </button>
      </div>
    </div>
  );
}
