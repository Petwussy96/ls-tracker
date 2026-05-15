"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/lib/I18nContext";
import type { BetCategory } from "@/lib/betCategory";
import { CATEGORY_FILTER_ORDER } from "@/lib/betCategory";
import { setBetCategory } from "@/app/actions/setBetCategory";

const PALETTE: Record<BetCategory, string> = {
  btts: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  resultaat: "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900",
  overUnder: "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-900",
  firstHalfGoals: "bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-900",
  secondHalfGoals: "bg-purple-100 text-purple-700 ring-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:ring-purple-900",
  handicap: "bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-900",
  correctScore: "bg-pink-100 text-pink-700 ring-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:ring-pink-900",
  scorer: "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:ring-fuchsia-900",
  halftime: "bg-cyan-100 text-cyan-700 ring-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:ring-cyan-900",
  doubleChance: "bg-teal-100 text-teal-700 ring-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:ring-teal-900",
  drawNoBet: "bg-lime-100 text-lime-700 ring-lime-200 dark:bg-lime-950 dark:text-lime-300 dark:ring-lime-900",
  mix: "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
  other: "bg-ink-100 text-ink-600 ring-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-700",
};

// All editable categories (filter order + "other" at the end).
const ALL_CATEGORIES: BetCategory[] = [...CATEGORY_FILTER_ORDER, "other"];

export function CategoryBadge({
  category,
  betId,
  editable = false,
}: {
  category: BetCategory;
  /** Required when editable=true */
  betId?: string;
  /** True if the current viewer can change this bet's category. */
  editable?: boolean;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<BetCategory>(category);
  const [pending, startTransition] = useTransition();

  if (!editable || !betId) {
    return <PlainBadge category={current} t={t} />;
  }

  function pick(next: BetCategory | null) {
    setOpen(false);
    const prev = current;
    if (next !== null) setCurrent(next);
    startTransition(async () => {
      const r = await setBetCategory({ betId: betId!, category: next });
      if (!r.ok) setCurrent(prev); // rollback
    });
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 transition hover:ring-2 disabled:opacity-50 ${PALETTE[current]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={locale === "nl" ? "Categorie aanpassen" : "Change category"}
      >
        {t(`category.${current}` as const)}
        <span aria-hidden className="text-[8px] opacity-60">▼</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            className="absolute right-0 z-40 mt-1 max-h-72 w-44 overflow-y-auto rounded-xl border border-ink-200 bg-white py-1 shadow-lg dark:border-ink-700 dark:bg-ink-800"
          >
            {ALL_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => pick(c)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-ink-50 dark:hover:bg-ink-700 ${
                  c === current ? "font-bold text-ink-900 dark:text-white" : "text-ink-700 dark:text-ink-300"
                }`}
              >
                <span>{t(`category.${c}` as const)}</span>
                {c === current && <span aria-hidden>✓</span>}
              </button>
            ))}
            <div className="my-1 h-px bg-ink-100 dark:bg-ink-700" />
            <button
              type="button"
              onClick={() => pick(null)}
              className="block w-full px-3 py-1.5 text-left text-xs text-ink-500 hover:bg-ink-50 dark:text-ink-400 dark:hover:bg-ink-700"
            >
              ↺ {locale === "nl" ? "Auto-detecteren" : "Auto-detect"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function PlainBadge({
  category,
  t,
}: {
  category: BetCategory;
  t: (key: `category.${BetCategory}`) => string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${PALETTE[category]}`}
    >
      {t(`category.${category}` as const)}
    </span>
  );
}
