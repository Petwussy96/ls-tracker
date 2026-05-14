"use client";

import Link from "next/link";
import { useI18n } from "@/lib/I18nContext";

export default function NotFound() {
  const { t, locale } = useI18n();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="text-6xl">🎯</div>
      <h1 className="mt-4 text-3xl font-black tracking-tight text-ink-900 dark:text-white">
        {locale === "nl" ? "Pagina niet gevonden" : "Page not found"}
      </h1>
      <p className="mt-2 text-ink-600 dark:text-ink-300">
        {locale === "nl"
          ? "Deze pagina bestaat niet — of is verloren gegaan in een combi van 8."
          : "This page doesn't exist — or got lost in an 8-leg accumulator."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
        >
          {t("nav.leaderboard")}
        </Link>
        <Link
          href="/bets"
          className="rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-white dark:hover:bg-ink-700"
        >
          {t("nav.openBets")}
        </Link>
      </div>
    </div>
  );
}
