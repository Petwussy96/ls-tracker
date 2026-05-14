"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/I18nContext";
import { BetCard } from "@/components/BetCard";
import type { Bet, User, UserRole } from "@/lib/types";
import {
  CATEGORY_FILTER_ORDER,
  computeBetCategory,
  type BetCategory,
} from "@/lib/betCategory";

type StatusFilter = "open" | "settled" | "all";
type CategoryFilter = BetCategory | "all";

export function BetsClient({
  users,
  bets,
  currentUserId,
  currentUserRole,
}: {
  users: User[];
  bets: Bet[];
  currentUserId?: string;
  currentUserRole?: UserRole;
}) {
  const { t, locale } = useI18n();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const userById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  // Compute category once per bet
  const betsWithCategory = useMemo(
    () => bets.map((b) => ({ bet: b, category: computeBetCategory(b) })),
    [bets],
  );

  // Apply status + category filters
  const filtered = useMemo(() => {
    let base = betsWithCategory;
    if (statusFilter === "open") {
      base = base.filter(({ bet }) => bet.status === "open");
    } else if (statusFilter === "settled") {
      base = base.filter(({ bet }) => bet.status !== "open");
    }
    if (categoryFilter !== "all") {
      base = base.filter(({ category }) => category === categoryFilter);
    }
    const list = base.map(({ bet }) => bet);
    if (statusFilter === "open") {
      return list.sort(
        (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
      );
    }
    if (statusFilter === "settled") {
      return list.sort(
        (a, b) =>
          new Date(b.resolvedAt ?? b.kickoff).getTime() -
          new Date(a.resolvedAt ?? a.kickoff).getTime(),
      );
    }
    return list.sort(
      (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime(),
    );
  }, [betsWithCategory, statusFilter, categoryFilter]);

  const openCount = bets.filter((b) => b.status === "open").length;

  // Build category filter list — only show categories that actually have bets
  // in the current status filter, so we don't offer empty filters.
  const visibleCategories = useMemo(() => {
    const counts = new Map<BetCategory, number>();
    for (const { bet, category } of betsWithCategory) {
      if (statusFilter === "open" && bet.status !== "open") continue;
      if (statusFilter === "settled" && bet.status === "open") continue;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return CATEGORY_FILTER_ORDER.filter((c) => counts.has(c)).map((c) => ({
      cat: c,
      count: counts.get(c) ?? 0,
    }));
  }, [betsWithCategory, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink-900 dark:text-white">
            {t("openBets.title")}
          </h1>
          <p className="mt-1 text-ink-600 dark:text-ink-300">{t("openBets.subtitle")}</p>
        </div>
        <Link
          href="/submit"
          className="rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
        >
          + {t("nav.submit")}
        </Link>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {(["open", "settled", "all"] as StatusFilter[]).map((f) => {
          const labels: Record<StatusFilter, string> = {
            open: locale === "nl" ? `Open (${openCount})` : `Open (${openCount})`,
            settled: locale === "nl" ? "Afgerond" : "Settled",
            all: locale === "nl" ? "Alles" : "All",
          };
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                statusFilter === f
                  ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                  : "border border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Category filter chips */}
      {visibleCategories.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:text-ink-500">
            {locale === "nl" ? "Categorie" : "Category"}
          </span>
          <button
            onClick={() => setCategoryFilter("all")}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              categoryFilter === "all"
                ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                : "border border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
            }`}
          >
            {t("category.all")}
          </button>
          {visibleCategories.map(({ cat, count }) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                categoryFilter === cat
                  ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                  : "border border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
              }`}
            >
              {t(`category.${cat}` as const)}{" "}
              <span className="opacity-60">({count})</span>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white py-16 text-center text-ink-400 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-500">
          {t("openBets.empty")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((bet) => (
            <BetCard
              key={bet.id}
              bet={bet}
              user={userById[bet.userId]}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          ))}
        </div>
      )}
    </div>
  );
}
