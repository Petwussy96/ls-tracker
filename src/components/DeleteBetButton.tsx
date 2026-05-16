"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/I18nContext";
import { deleteBet } from "@/app/actions/deleteBet";

/**
 * "Verwijder" button. Two-step confirm: first click expands inline; second
 * click actually fires the delete. We avoid `window.confirm` so the prompt
 * looks consistent with the rest of the app (and works inside modals where
 * native confirms can be flaky).
 */
export function DeleteBetButton({ betId }: { betId: string }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function commit() {
    setError(null);
    startTransition(async () => {
      const r = await deleteBet(betId);
      if (!r.ok) {
        setError(errorMessage(r.error, locale));
        setArmed(false);
        return;
      }
      router.refresh();
    });
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="mt-2 inline-flex items-center gap-1 rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-500 hover:bg-rose-50 hover:text-rose-700 dark:bg-ink-800 dark:text-ink-400 dark:hover:bg-rose-950 dark:hover:text-rose-300"
        title={
          locale === "nl" ? "Bet permanent verwijderen" : "Delete bet permanently"
        }
      >
        🗑️ {locale === "nl" ? "Verwijder" : "Delete"}
      </button>
    );
  }

  return (
    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs dark:bg-rose-950/50">
      <span className="font-semibold text-rose-700 dark:text-rose-300">
        {locale === "nl" ? "Zeker weten?" : "Are you sure?"}
      </span>
      <button
        type="button"
        onClick={commit}
        disabled={pending}
        className="rounded-full bg-rose-600 px-3 py-0.5 font-bold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {pending
          ? locale === "nl"
            ? "Bezig…"
            : "Working…"
          : locale === "nl"
            ? "Ja, verwijder"
            : "Yes, delete"}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        disabled={pending}
        className="rounded-full bg-ink-100 px-3 py-0.5 font-semibold text-ink-700 hover:bg-ink-200 disabled:opacity-50 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
      >
        {locale === "nl" ? "Annuleer" : "Cancel"}
      </button>
      {error && (
        <span className="text-rose-700 dark:text-rose-300">{error}</span>
      )}
    </div>
  );
}

function errorMessage(
  err: "not_authenticated" | "not_authorized" | "not_found",
  locale: "nl" | "en",
): string {
  if (locale === "nl") {
    switch (err) {
      case "not_authenticated":
        return "Niet ingelogd";
      case "not_authorized":
        return "Geen rechten om te verwijderen";
      case "not_found":
        return "Bet niet gevonden";
    }
  }
  switch (err) {
    case "not_authenticated":
      return "Not signed in";
    case "not_authorized":
      return "Not allowed to delete";
    case "not_found":
      return "Bet not found";
  }
}
