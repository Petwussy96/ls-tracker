"use client";

import type { ReactNode } from "react";

// Lightweight stat card used across leaderboard and profile.
// "tone" colors the value to draw the eye; optional `icon` gives extra polish.

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "gold";
  icon?: ReactNode;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : tone === "gold"
          ? "text-amber-600 dark:text-amber-400"
          : "text-ink-900 dark:text-white";

  const accentBgClass =
    tone === "positive"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : tone === "negative"
        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
        : tone === "gold"
          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          : "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-ink-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 dark:text-ink-500">
          {label}
        </div>
        {icon && (
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${accentBgClass}`}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>
      <div className={`mt-2 text-2xl font-black tracking-tight ${toneClass}`}>{value}</div>
      {hint && (
        <div className="mt-1 text-xs text-ink-400 dark:text-ink-500">{hint}</div>
      )}
    </div>
  );
}
