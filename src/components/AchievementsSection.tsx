"use client";

import { useState } from "react";
import { useI18n } from "@/lib/I18nContext";
import type { Bet } from "@/lib/types";
import {
  type Achievement,
  type AchievementTier,
  computeEarnedAchievements,
  getAchievementCatalog,
} from "@/lib/achievements";

const TIER_STYLE: Record<AchievementTier, { earned: string; locked: string }> = {
  bronze: {
    earned: "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/60 dark:text-amber-100 dark:ring-amber-700",
    locked: "bg-ink-50 text-ink-400 ring-ink-200 dark:bg-ink-800/40 dark:text-ink-500 dark:ring-ink-700",
  },
  silver: {
    earned: "bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-900/60 dark:text-sky-100 dark:ring-sky-700",
    locked: "bg-ink-50 text-ink-400 ring-ink-200 dark:bg-ink-800/40 dark:text-ink-500 dark:ring-ink-700",
  },
  gold: {
    earned: "bg-gradient-to-br from-amber-200 to-orange-300 text-amber-900 ring-orange-300 shadow-sm dark:from-amber-700 dark:to-orange-700 dark:text-amber-50 dark:ring-orange-600",
    locked: "bg-ink-50 text-ink-400 ring-ink-200 dark:bg-ink-800/40 dark:text-ink-500 dark:ring-ink-700",
  },
  legendary: {
    earned: "bg-gradient-to-br from-rose-500 via-orange-500 to-amber-400 text-white ring-rose-400 shadow-md dark:ring-rose-700",
    locked: "bg-ink-50 text-ink-400 ring-ink-200 dark:bg-ink-800/40 dark:text-ink-500 dark:ring-ink-700",
  },
};

export function AchievementsSection({
  bets,
  showAll = false,
}: {
  bets: Bet[];
  /** If true, show the entire catalog (earned + locked). Otherwise earned-only with a "Toon alle" toggle. */
  showAll?: boolean;
}) {
  const { locale } = useI18n();
  const [expanded, setExpanded] = useState(showAll);

  const catalog = getAchievementCatalog();
  const earned = computeEarnedAchievements(bets);
  const earnedIds = new Set(earned.map((a) => a.id));
  const totalCount = catalog.length;
  const earnedCount = earned.length;

  const display = expanded ? catalog : earned;

  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-900">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">
            🏅 {locale === "nl" ? "Achievements" : "Achievements"}
          </h2>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {earnedCount} / {totalCount} {locale === "nl" ? "behaald" : "earned"}
          </p>
        </div>
        {!showAll && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
          >
            {expanded
              ? locale === "nl"
                ? "Verberg vergrendelde"
                : "Hide locked"
              : locale === "nl"
                ? `Toon alle (${totalCount})`
                : `Show all (${totalCount})`}
          </button>
        )}
      </div>

      {display.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-500 dark:text-ink-400">
          {locale === "nl"
            ? "Nog geen achievements behaald. Plaats je eerste bet om te starten!"
            : "No achievements yet. Place your first bet to start!"}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {display.map((a) => (
            <BadgeCard key={a.id} a={a} earned={earnedIds.has(a.id)} locale={locale} />
          ))}
        </div>
      )}
    </section>
  );
}

function BadgeCard({
  a,
  earned,
  locale,
}: {
  a: Achievement;
  earned: boolean;
  locale: "nl" | "en";
}) {
  const style = TIER_STYLE[a.tier];
  return (
    <div
      className={`relative flex flex-col items-center gap-1 rounded-xl p-3 text-center ring-1 transition ${
        earned ? style.earned : style.locked
      }`}
      title={locale === "nl" ? a.descNl : a.descEn}
    >
      <span
        className={`text-2xl ${earned ? "" : "grayscale opacity-40"}`}
        aria-hidden
      >
        {a.emoji}
      </span>
      <span className="text-xs font-bold leading-tight">
        {locale === "nl" ? a.titleNl : a.titleEn}
      </span>
      <span className="text-[10px] leading-tight opacity-80">
        {locale === "nl" ? a.descNl : a.descEn}
      </span>
      {!earned && (
        <span className="absolute right-1 top-1 text-[10px] opacity-60" aria-hidden>
          🔒
        </span>
      )}
    </div>
  );
}
