"use client";

import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "gold";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : tone === "gold"
          ? "text-gold-600 dark:text-gold-400"
          : "text-ink-900 dark:text-white";

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm dark:border-ink-800 dark:bg-ink-900">
      <div className="text-[10px] uppercase tracking-wider text-ink-400 dark:text-ink-500">{label}</div>
      <div className={`mt-1 text-2xl font-black tracking-tight ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-400 dark:text-ink-500">{hint}</div>}
    </div>
  );
}
