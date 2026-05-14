"use client";

import { useI18n } from "@/lib/I18nContext";
import type { BetCategory } from "@/lib/betCategory";

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

export function CategoryBadge({ category }: { category: BetCategory }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${PALETTE[category]}`}
    >
      {t(`category.${category}` as const)}
    </span>
  );
}
