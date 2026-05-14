"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/I18nContext";
import { rankUsers } from "@/lib/stats";
import { formatOdds, formatPercent } from "@/lib/format";
import type { Bet, User } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { StreakBadge } from "@/components/StreakBadge";
import { Avatar } from "@/components/Avatar";
import {
  CategoryFilterChips,
  applyCategoryFilter,
  type CategorySelection,
} from "@/components/CategoryFilterChips";

const WELCOME_DISMISS_KEY = "lucky-sucker-welcome-dismissed";

export function LeaderboardClient({
  users,
  bets,
  currentUserId,
}: {
  users: User[];
  bets: Bet[];
  currentUserId?: string | null;
}) {
  const { t, locale } = useI18n();
  const [category, setCategory] = useState<CategorySelection>("all");
  const [welcomeDismissed, setWelcomeDismissed] = useState(true); // start hidden to avoid flash

  // Restore dismissed state after hydration.
  useEffect(() => {
    try {
      setWelcomeDismissed(localStorage.getItem(WELCOME_DISMISS_KEY) === "1");
    } catch {
      // localStorage can fail in private mode — just leave it dismissed.
    }
  }, []);

  const filteredBets = useMemo(() => applyCategoryFilter(bets, category), [bets, category]);
  const ranked = useMemo(() => rankUsers(users, filteredBets), [users, filteredBets]);

  // Show welcome banner only for logged-in users who haven't placed any bet yet
  // and haven't dismissed it.
  const showWelcome =
    !welcomeDismissed &&
    !!currentUserId &&
    bets.every((b) => b.userId !== currentUserId);

  function dismissWelcome() {
    setWelcomeDismissed(true);
    try {
      localStorage.setItem(WELCOME_DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  const groupWins = ranked.reduce((s, u) => s + u.wins, 0);
  const groupSettled = ranked.reduce((s, u) => s + u.settledBets, 0);
  const groupOpen = ranked.reduce((s, u) => s + u.openBets, 0);
  const groupTotal = ranked.reduce((s, u) => s + u.totalBets, 0);
  const groupWinRate = groupSettled === 0 ? 0 : groupWins / groupSettled;

  return (
    <div className="space-y-8">
      {/* Hero — gradient looks similar in both themes */}
      <section className="rounded-3xl bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 p-6 text-white shadow-lg sm:p-10 dark:from-ink-950 dark:via-ink-900 dark:to-ink-950">
        <div className="max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {locale === "nl" ? "Live tracker" : "Live tracker"}
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{t("leaderboard.title")}</h1>
          <p className="mt-3 text-base text-ink-200 sm:text-lg">{t("leaderboard.subtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/submit"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-ink-100"
            >
              {t("nav.submit")} →
            </Link>
            <Link
              href="/bets"
              className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              {t("nav.openBets")}
            </Link>
          </div>
        </div>
      </section>

      {/* Welcome banner — shown once to new users with no bets yet */}
      {showWelcome && (
        <section className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm dark:border-amber-900/40 dark:from-amber-950/40 dark:to-orange-950/40">
          <button
            type="button"
            onClick={dismissWelcome}
            aria-label={t("welcome.dismiss")}
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-400 hover:bg-amber-100 hover:text-ink-700 dark:text-ink-500 dark:hover:bg-amber-900/40 dark:hover:text-ink-200"
          >
            ✕
          </button>
          <h2 className="text-lg font-black tracking-tight text-ink-900 dark:text-white sm:text-xl">
            {t("welcome.title")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-700 dark:text-ink-200">
            {t("welcome.body")}
          </p>
          <div className="mt-4">
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
            >
              {t("welcome.cta")} →
            </Link>
          </div>
        </section>
      )}

      {/* Category filter — re-ranks the leaderboard within that category */}
      <CategoryFilterChips
        bets={bets}
        selected={category}
        onSelect={setCategory}
        label={locale === "nl" ? "Categorie" : "Category"}
      />

      {/* Group stats — reflects the filtered category */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t("leaderboard.winRate")}
          value={formatPercent(groupWinRate, locale)}
          tone="positive"
        />
        <StatCard
          label={locale === "nl" ? "Actieve spelers" : "Active players"}
          value={ranked.filter((s) => s.totalBets > 0).length}
        />
        <StatCard label={locale === "nl" ? "Totaal bets" : "Total bets"} value={groupTotal} />
        <StatCard label={locale === "nl" ? "Open bets" : "Open bets"} value={groupOpen} tone="gold" />
      </section>

      {/* Leaderboard table */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl font-black tracking-tight text-ink-900 dark:text-white">
            {category === "all"
              ? t("leaderboard.title")
              : `${t("leaderboard.title")} · ${t(`category.${category}` as const)}`}
          </h2>
          <div className="hidden sm:block text-xs text-ink-400 dark:text-ink-500">
            {locale === "nl" ? "Gerangschikt op win-percentage" : "Sorted by win rate"}
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-900">
          <table className="min-w-full divide-y divide-ink-100 dark:divide-ink-800">
            <thead className="bg-ink-50/60 dark:bg-ink-800/60">
              <tr className="text-left text-[10px] uppercase tracking-wider text-ink-400 dark:text-ink-500">
                <th className="px-3 py-3 sm:px-4">{t("leaderboard.rank")}</th>
                <th className="px-3 py-3 sm:px-4">{t("leaderboard.player")}</th>
                <th className="px-3 py-3 text-right sm:px-4">{t("leaderboard.winRate")}</th>
                <th className="hidden px-3 py-3 text-right sm:table-cell sm:px-4">
                  {t("leaderboard.record")}
                </th>
                <th className="hidden px-3 py-3 text-right md:table-cell md:px-4">
                  {t("leaderboard.avgOdds")}
                </th>
                <th className="hidden px-3 py-3 text-right md:table-cell md:px-4">
                  {t("leaderboard.bets")}
                </th>
                <th className="px-3 py-3 text-right sm:px-4">{t("leaderboard.streak")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 text-sm dark:divide-ink-800">
              {ranked.map((stats, idx) => {
                const rankIcon =
                  stats.settledBets === 0
                    ? "–"
                    : idx === 0
                      ? "🥇"
                      : idx === 1
                        ? "🥈"
                        : idx === 2
                          ? "🥉"
                          : `${idx + 1}`;
                return (
                  <tr key={stats.user.id} className="hover:bg-ink-50/40 dark:hover:bg-ink-800/40">
                    <td className="px-3 py-3 font-semibold sm:px-4">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-xs dark:bg-ink-800">
                        {rankIcon}
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <Link
                        href={`/profile/${stats.user.username}`}
                        className="inline-flex items-center gap-2 group"
                      >
                        <Avatar user={stats.user} size={28} />
                        <span>
                          <span className="block font-semibold text-ink-900 group-hover:underline dark:text-white">
                            {stats.user.displayName}
                          </span>
                          <span className="block text-xs text-ink-400 dark:text-ink-500">
                            @{stats.user.username}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right font-bold sm:px-4">
                      {stats.settledBets === 0 ? (
                        <span className="text-ink-400 dark:text-ink-500">–</span>
                      ) : (
                        <span
                          className={
                            stats.winRate >= 0.5
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }
                        >
                          {formatPercent(stats.winRate, locale)}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-3 py-3 text-right text-ink-600 sm:table-cell sm:px-4 dark:text-ink-300">
                      {stats.settledBets === 0 ? (
                        <span className="text-ink-400 dark:text-ink-500">–</span>
                      ) : (
                        <>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {stats.wins}
                          </span>
                          <span className="text-ink-400 dark:text-ink-500"> / </span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            {stats.losses}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="hidden px-3 py-3 text-right text-ink-600 md:table-cell md:px-4 dark:text-ink-300">
                      {stats.settledBets === 0 ? "–" : formatOdds(stats.averageOdds)}
                    </td>
                    <td className="hidden px-3 py-3 text-right text-ink-600 md:table-cell md:px-4 dark:text-ink-300">
                      {stats.totalBets}
                    </td>
                    <td className="px-3 py-3 text-right sm:px-4">
                      <StreakBadge streak={stats.currentStreak} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">
          {category === "all"
            ? locale === "nl"
              ? "Tip: filter op categorie hierboven om te zien wie het best is per type bet."
              : "Tip: filter by category above to see who's best per bet type."
            : locale === "nl"
              ? `Tip: ranglijst beperkt tot bets in de "${t(`category.${category}` as const)}"-categorie.`
              : `Tip: leaderboard limited to bets in the "${t(`category.${category}` as const)}" category.`}
        </p>
      </section>
    </div>
  );
}
