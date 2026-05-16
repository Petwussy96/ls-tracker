"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/I18nContext";
import { computeUserStats } from "@/lib/stats";
import { formatOdds, formatPercent } from "@/lib/format";
import type { Bet, User, UserRole } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { AchievementsSection } from "@/components/AchievementsSection";
import { BetCard } from "@/components/BetCard";
import { StreakBadge } from "@/components/StreakBadge";
import { Avatar } from "@/components/Avatar";
import { AvatarPicker } from "@/components/AvatarPicker";
import {
  CategoryFilterChips,
  applyCategoryFilter,
  type CategorySelection,
} from "@/components/CategoryFilterChips";

export function ProfileClient({
  user,
  bets,
  currentUserId,
  currentUserRole,
}: {
  user: User;
  bets: Bet[];
  currentUserId?: string;
  currentUserRole?: UserRole;
}) {
  const { t, locale } = useI18n();
  const [category, setCategory] = useState<CategorySelection>("all");
  const [avatarOpen, setAvatarOpen] = useState(false);

  const isOwnProfile = currentUserId === user.id;

  const filteredBets = useMemo(() => applyCategoryFilter(bets, category), [bets, category]);
  const stats = useMemo(() => computeUserStats(user, filteredBets), [user, filteredBets]);

  const userBets = useMemo(
    () =>
      [...filteredBets].sort(
        (a, b) =>
          new Date(b.resolvedAt ?? b.placedAt).getTime() -
          new Date(a.resolvedAt ?? a.placedAt).getTime(),
      ),
    [filteredBets],
  );

  // Cumulative "wins minus losses" walk over time + rolling 5-bet win-rate.
  const { series, winRateSeries } = useMemo(() => {
    const settled = filteredBets
      .filter((b) => b.status === "won" || b.status === "lost")
      .slice()
      .sort(
        (a, b) =>
          new Date(a.resolvedAt ?? a.kickoff).getTime() -
          new Date(b.resolvedAt ?? b.kickoff).getTime(),
      );
    let acc = 0;
    const series: number[] = [];
    const wins: number[] = []; // 1 for win, 0 for loss
    for (const b of settled) {
      acc += b.status === "won" ? 1 : -1;
      series.push(acc);
      wins.push(b.status === "won" ? 1 : 0);
    }
    // Rolling 5-bet window win-rate. For early bets we use whatever's
    // available so the chart starts at bet 1, not bet 5.
    const WINDOW = 5;
    const winRateSeries = wins.map((_, i) => {
      const start = Math.max(0, i - WINDOW + 1);
      const slice = wins.slice(start, i + 1);
      return slice.reduce((a, v) => a + v, 0) / slice.length;
    });
    return { series, winRateSeries };
  }, [filteredBets]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="rounded-3xl bg-white border border-ink-200 p-6 shadow-sm sm:p-8 dark:border-ink-800 dark:bg-ink-900">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative">
            <Avatar user={user} size={72} />
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setAvatarOpen(true)}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-ink-900 text-white shadow-md transition hover:bg-ink-800 dark:border-ink-900 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
                aria-label={locale === "nl" ? "Avatar wijzigen" : "Change avatar"}
                title={locale === "nl" ? "Avatar wijzigen" : "Change avatar"}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-ink-900 dark:text-white">
              {user.displayName}
            </h1>
            <div className="text-sm text-ink-400 dark:text-ink-500">@{user.username}</div>
          </div>
          <div className="flex items-center gap-2">
            <StreakBadge streak={stats.currentStreak} />
          </div>
        </div>
      </section>

      {isOwnProfile && (
        <AvatarPicker
          open={avatarOpen}
          onClose={() => setAvatarOpen(false)}
          currentUser={{ displayName: user.displayName, image: user.image }}
        />
      )}

      {/* Category filter */}
      <CategoryFilterChips
        bets={bets}
        selected={category}
        onSelect={setCategory}
        label={locale === "nl" ? "Categorie" : "Category"}
      />

      {/* Stats grid (reflects filtered subset) */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t("profile.winRate")}
          value={stats.settledBets === 0 ? "–" : formatPercent(stats.winRate, locale)}
          tone={
            stats.winRate >= 0.5 ? "positive" : stats.settledBets === 0 ? "default" : "negative"
          }
          hint={
            stats.settledBets === 0
              ? t("leaderboard.unsettled")
              : `${stats.wins}W / ${stats.losses}L`
          }
        />
        <StatCard
          label={t("profile.totalBets")}
          value={stats.totalBets}
          hint={`${stats.openBets} ${locale === "nl" ? "open" : "open"}`}
        />
        <StatCard
          label={t("profile.longestStreak")}
          value={stats.longestWinStreak === 0 ? "–" : `${stats.longestWinStreak} 🔥`}
        />
        <StatCard
          label={t("profile.highestOdds")}
          value={stats.highestOddsWon === 0 ? "–" : formatOdds(stats.highestOddsWon)}
          tone="gold"
        />
        <StatCard
          label={t("profile.averageOdds")}
          value={stats.averageOdds === 0 ? "–" : formatOdds(stats.averageOdds)}
        />
        <StatCard
          label={t("profile.record")}
          value={
            stats.settledBets === 0 ? (
              "–"
            ) : (
              <span>
                <span className="text-emerald-600 dark:text-emerald-400">{stats.wins}</span>
                <span className="text-ink-400 dark:text-ink-500"> - </span>
                <span className="text-rose-600 dark:text-rose-400">{stats.losses}</span>
              </span>
            )
          }
        />
        <StatCard label={locale === "nl" ? "Geannuleerd" : "Void"} value={stats.voids} />
        <StatCard label={locale === "nl" ? "Afgerond" : "Settled"} value={stats.settledBets} />
      </section>

      {/* Achievements */}
      <AchievementsSection bets={userBets} />

      {/* Charts: cumulative net + rolling win-rate (side-by-side on desktop) */}
      {series.length > 1 && (
        <section className="grid gap-4 md:grid-cols-2">
          {/* Cumulative net wins */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-900">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink-600 dark:text-ink-300">
                  {locale === "nl" ? "Winst minus verlies" : "Wins minus losses"}
                  {category !== "all" && ` · ${t(`category.${category}` as const)}`}
                </h2>
                <div className="text-2xl font-black text-ink-900 dark:text-white">
                  {series[series.length - 1] >= 0 ? "+" : ""}
                  {series[series.length - 1]}
                </div>
              </div>
              <div className="text-xs text-ink-400 dark:text-ink-500">
                {stats.settledBets} {locale === "nl" ? "bets" : "bets"}
              </div>
            </div>
            <Sparkline values={series} />
          </div>

          {/* Rolling 5-bet win-rate */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-900">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink-600 dark:text-ink-300">
                  {locale === "nl" ? "Win-rate (5-bet venster)" : "Win-rate (5-bet window)"}
                </h2>
                <div className="text-2xl font-black text-ink-900 dark:text-white">
                  {formatPercent(winRateSeries[winRateSeries.length - 1] ?? 0, locale)}
                </div>
              </div>
              <div className="text-xs text-ink-400 dark:text-ink-500">
                {locale === "nl" ? "huidige vorm" : "current form"}
              </div>
            </div>
            <WinRateSparkline values={winRateSeries} />
          </div>
        </section>
      )}

      {/* Bet history */}
      <section>
        <h2 className="mb-3 text-xl font-black tracking-tight text-ink-900 dark:text-white">
          {category === "all"
            ? t("profile.recentBets")
            : `${t("profile.recentBets")} · ${t(`category.${category}` as const)}`}
        </h2>
        {userBets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-12 text-center text-ink-400 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-500">
            {category === "all"
              ? locale === "nl"
                ? "Nog geen bets geplaatst."
                : "No bets placed yet."
              : locale === "nl"
                ? "Geen bets in deze categorie."
                : "No bets in this category."}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {userBets.map((bet) => (
              <BetCard
                key={bet.id}
                bet={bet}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WinRateSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 600;
  const h = 80;
  const stepX = w / (values.length - 1);
  // Always render on 0..1 scale so 50% is consistently the mid-line.
  const path = values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - v * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const lastVal = values[values.length - 1];
  const stroke = lastVal >= 0.5 ? "#10b981" : "#e11d48";
  const fill = lastVal >= 0.5 ? "rgba(16,185,129,0.12)" : "rgba(225,29,72,0.12)";
  const midY = h / 2;
  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
      {/* 50% baseline */}
      <line
        x1={0}
        y1={midY}
        x2={w}
        y2={midY}
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeDasharray="4 4"
      />
      <path d={areaPath} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 600;
  const h = 80;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const stepX = w / (values.length - 1);
  const path = values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / span) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const zeroY = h - ((0 - min) / span) * h;
  const isPositive = values[values.length - 1] >= 0;
  const stroke = isPositive ? "#10b981" : "#e11d48";
  const fill = isPositive ? "rgba(16,185,129,0.12)" : "rgba(225,29,72,0.12)";

  const areaPath = `${path} L ${w} ${zeroY} L 0 ${zeroY} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
      <line x1={0} x2={w} y1={zeroY} y2={zeroY} stroke="currentColor" strokeDasharray="3 3" className="text-ink-200 dark:text-ink-700" />
      <path d={areaPath} fill={fill} />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
