"use client";

import { useMemo } from "react";
import { useI18n } from "@/lib/I18nContext";
import {
  CATEGORY_FILTER_ORDER,
  computeBetCategory,
  type BetCategory,
} from "@/lib/betCategory";
import type { Bet } from "@/lib/types";

export type CategorySelection = BetCategory | "all";

/**
 * A row of filter chips: "All" + every category that actually has bets in
 * the given list (so we never show empty filters). Used on the Open Bets
 * feed, leaderboard, and profile pages.
 */
export function CategoryFilterChips({
  bets,
  selected,
  onSelect,
  label,
}: {
  bets: Bet[];
  selected: CategorySelection;
  onSelect: (next: CategorySelection) => void;
  /** Optional small heading shown before the chips (e.g. "Categorie"). */
  label?: string;
}) {
  const { t, locale } = useI18n();

  const visible = useMemo(() => {
    const counts = new Map<BetCategory, number>();
    for (const b of bets) {
      const cat = computeBetCategory(b);
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return CATEGORY_FILTER_ORDER.filter((c) => counts.has(c)).map((c) => ({
      cat: c,
      count: counts.get(c) ?? 0,
    }));
  }, [bets]);

  if (visible.length === 0) return null;

  const chip = (sel: CategorySelection, label: string, count?: number) => (
    <button
      key={sel}
      onClick={() => onSelect(sel)}
      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
        selected === sel
          ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
          : "border border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
      }`}
    >
      {label}
      {count !== undefined && <span className="opacity-60"> ({count})</span>}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:text-ink-500">
          {label}
        </span>
      )}
      {chip("all", t("category.all"), bets.length)}
      {visible.map(({ cat, count }) =>
        chip(cat, t(`category.${cat}` as const), count),
      )}
    </div>
  );
}

/** Helper: filter a bets array by a CategorySelection. */
export function applyCategoryFilter<T extends Bet>(
  bets: T[],
  selection: CategorySelection,
): T[] {
  if (selection === "all") return bets;
  return bets.filter((b) => computeBetCategory(b) === selection);
}
