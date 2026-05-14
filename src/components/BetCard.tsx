"use client";

import Link from "next/link";
import { useI18n } from "@/lib/I18nContext";
import type { TranslationKey } from "@/lib/i18n";
import type { Bet, User, UserRole } from "@/lib/types";
import { formatDate, formatOdds, timeUntil } from "@/lib/format";
import { ResolveButtons } from "@/components/ResolveButtons";
import { CategoryBadge } from "@/components/CategoryBadge";
import { computeBetCategory } from "@/lib/betCategory";
import { Avatar } from "@/components/Avatar";

export function BetCard({
  bet,
  user,
  currentUserId,
  currentUserRole,
}: {
  bet: Bet;
  user?: User;
  currentUserId?: string;
  currentUserRole?: UserRole;
}) {
  const { t, locale } = useI18n();

  const isAcca = bet.selections.length > 1;
  const isOwner = currentUserId === bet.userId;
  const isAdmin = currentUserRole === "admin";
  const canResolveOpen = bet.status === "open" && (isOwner || isAdmin);
  const canAdminOverride = bet.status !== "open" && isAdmin;
  const category = computeBetCategory(bet);

  const statusColor =
    bet.status === "won"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900"
      : bet.status === "lost"
        ? "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900"
        : bet.status === "void"
          ? "bg-ink-100 text-ink-600 ring-ink-200 dark:bg-ink-800 dark:text-ink-400 dark:ring-ink-700"
          : "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900";

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {user && (
            <Link
              href={`/profile/${user.username}`}
              className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
            >
              <Avatar user={user} size={20} />
              {user.displayName}
            </Link>
          )}
          <div className="text-sm font-semibold text-ink-900 dark:text-white">
            {isAcca
              ? `${bet.selections.length}× ${t("betType.accumulator")}`
              : bet.selections[0]?.match}
          </div>
          {!isAcca && bet.selections[0]?.competition && (
            <div className="text-xs text-ink-400 dark:text-ink-500">{bet.selections[0].competition}</div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${statusColor}`}
          >
            {t(`status.${bet.status}` as TranslationKey)}
          </span>
          <CategoryBadge category={category} />
        </div>
      </div>

      {/* Selections */}
      <ul className={`mt-3 space-y-1.5 ${isAcca ? "border-l-2 border-ink-100 pl-3 dark:border-ink-800" : ""}`}>
        {bet.selections.map((sel, i) => (
          <li key={i} className="text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-ink-800 dark:text-ink-200">{sel.selection}</span>
              <span className="shrink-0 font-bold text-ink-900 dark:text-white">{formatOdds(sel.odds)}</span>
            </div>
            {isAcca && <div className="text-xs text-ink-400 dark:text-ink-500">{sel.match}</div>}
          </li>
        ))}
      </ul>

      {bet.notes && (
        <div className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs italic text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          &ldquo;{bet.notes}&rdquo;
        </div>
      )}

      {/* Footer: odds + timing */}
      <div className="mt-3 flex items-end justify-between border-t border-ink-100 pt-3 dark:border-ink-800">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-400 dark:text-ink-500">
            {isAcca
              ? locale === "nl"
                ? "Totaal quotering"
                : "Total odds"
              : t("openBets.odds")}
          </div>
          <div className="text-xl font-black tracking-tight text-ink-900 dark:text-white">
            {formatOdds(bet.combinedOdds)}
          </div>
        </div>
        <div className="text-right text-[11px] text-ink-400 dark:text-ink-500">
          <div>
            {t("common.kickoff")}: {formatDate(bet.kickoff, locale)}
          </div>
          {bet.status === "open" && <div>{timeUntil(bet.kickoff, locale)}</div>}
          {bet.resolvedAt && (
            <div>
              {locale === "nl" ? "Afgehandeld" : "Resolved"}: {formatDate(bet.resolvedAt, locale)}
            </div>
          )}
        </div>
      </div>

      {/* Resolution UI */}
      {canResolveOpen && <ResolveButtons betId={bet.id} betStatus={bet.status} />}
      {canAdminOverride && (
        <ResolveButtons betId={bet.id} betStatus={bet.status} showAdminOverride />
      )}
    </div>
  );
}
