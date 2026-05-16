"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/I18nContext";
import { updateBet } from "@/app/actions/updateBet";

type EditableSelection = {
  id: string;
  match: string;
  selection: string;
  odds: string; // string so we can hold partial input like "1." while typing
};

export type EditBetInitial = {
  id: string;
  notes: string;
  /** ISO datetime — converted to <input type="datetime-local"> format. */
  kickoff: string;
  selections: { id: string; match: string; selection: string; odds: number }[];
};

function isoToLocalInput(iso: string): string {
  // <input type="datetime-local"> wants "YYYY-MM-DDTHH:MM" in *local* time.
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const off = d.getTimezoneOffset() * 60_000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

export function EditBetForm({ initial }: { initial: EditBetInitial }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState(initial.notes ?? "");
  const [kickoff, setKickoff] = useState(isoToLocalInput(initial.kickoff));
  const [legs, setLegs] = useState<EditableSelection[]>(
    initial.selections.map((s) => ({
      id: s.id,
      match: s.match,
      selection: s.selection,
      odds: s.odds.toFixed(2),
    })),
  );

  function updateLeg(idx: number, patch: Partial<EditableSelection>) {
    setLegs((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function combinedOdds(): number {
    return +legs
      .reduce((acc, l) => {
        const o = parseFloat(l.odds.replace(",", "."));
        return acc * (Number.isFinite(o) ? o : 1);
      }, 1)
      .toFixed(3);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate up front.
    for (const l of legs) {
      if (!l.match.trim() || !l.selection.trim()) {
        setError(
          locale === "nl"
            ? "Vul alle wedstrijden en keuzes in"
            : "Fill in every match and selection",
        );
        return;
      }
      const o = parseFloat(l.odds.replace(",", "."));
      if (!Number.isFinite(o) || o < 1.01 || o > 999) {
        setError(
          locale === "nl"
            ? "Quotering moet tussen 1.01 en 999 zijn"
            : "Odds must be between 1.01 and 999",
        );
        return;
      }
    }

    startTransition(async () => {
      const r = await updateBet({
        betId: initial.id,
        notes: notes.trim() === "" ? null : notes.trim(),
        kickoff: kickoff ? new Date(kickoff).toISOString() : undefined,
        selections: legs.map((l) => ({
          match: l.match.trim(),
          selection: l.selection.trim(),
          odds: parseFloat(l.odds.replace(",", ".")),
        })),
      });
      if (!r.ok) {
        setError(translateError(r.error, r.detail, locale));
        return;
      }
      router.push(`/bet/${initial.id}`);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-900"
    >
      <h2 className="text-lg font-black tracking-tight text-ink-900 dark:text-white">
        {locale === "nl" ? "Bet bewerken" : "Edit bet"}
      </h2>

      {legs.map((leg, i) => (
        <div
          key={leg.id}
          className="rounded-xl border border-ink-100 bg-ink-50 p-4 dark:border-ink-800 dark:bg-ink-800/50"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
              {locale === "nl" ? "Been" : "Leg"} {i + 1}
            </span>
          </div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            {locale === "nl" ? "Wedstrijd" : "Match"} *
          </label>
          <input
            value={leg.match}
            onChange={(e) => updateLeg(i, { match: e.target.value })}
            className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />

          <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            {locale === "nl" ? "Keuze" : "Selection"} *
          </label>
          <input
            value={leg.selection}
            onChange={(e) => updateLeg(i, { selection: e.target.value })}
            className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />

          <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
            {locale === "nl" ? "Quotering" : "Odds"} *
          </label>
          <input
            value={leg.odds}
            onChange={(e) => updateLeg(i, { odds: e.target.value })}
            inputMode="decimal"
            className="mt-1 w-32 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-bold text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
          />
        </div>
      ))}

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          {locale === "nl" ? "Kick-off" : "Kick-off"}
        </label>
        <input
          type="datetime-local"
          value={kickoff}
          onChange={(e) => setKickoff(e.target.value)}
          className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          {locale === "nl" ? "Notities" : "Notes"}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
      </div>

      <div className="flex items-end justify-between border-t border-ink-100 pt-4 dark:border-ink-800">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-500 dark:text-ink-400">
            {locale === "nl" ? "Nieuwe totaal quotering" : "New total odds"}
          </div>
          <div className="text-2xl font-black tracking-tight text-ink-900 dark:text-white">
            {combinedOdds().toFixed(2)}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push(`/bet/${initial.id}`)}
            disabled={pending}
            className="rounded-full border border-ink-200 bg-white px-5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
          >
            {locale === "nl" ? "Annuleer" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
          >
            {pending
              ? locale === "nl"
                ? "Opslaan…"
                : "Saving…"
              : locale === "nl"
                ? "Opslaan"
                : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </div>
      )}
    </form>
  );
}

function translateError(
  err: "not_authenticated" | "not_authorized" | "not_found" | "validation",
  detail: string | undefined,
  locale: "nl" | "en",
): string {
  if (locale === "nl") {
    switch (err) {
      case "not_authenticated":
        return "Niet ingelogd";
      case "not_authorized":
        return "Alleen admins mogen bets bewerken";
      case "not_found":
        return "Bet niet gevonden";
      case "validation":
        return detail
          ? `Validatie mislukt: ${detail}`
          : "Validatie mislukt";
    }
  }
  switch (err) {
    case "not_authenticated":
      return "Not signed in";
    case "not_authorized":
      return "Only admins can edit bets";
    case "not_found":
      return "Bet not found";
    case "validation":
      return detail ? `Validation failed: ${detail}` : "Validation failed";
  }
}
