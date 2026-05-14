"use client";

import { useTransition, useState } from "react";
import { BetCard } from "@/components/BetCard";
import { reviewReports } from "@/app/actions/reportBet";
import type { Bet, User } from "@/lib/types";

type ReportRow = {
  bet: Bet;
  user: User;
  reports: Array<{
    id: string;
    createdAt: string;
    reason: string | null;
    reporter: { username: string; displayName: string };
  }>;
};

export function ReportedBetsAdminClient({
  rows,
  adminId,
  adminRole,
}: {
  rows: ReportRow[];
  adminId: string;
  adminRole: "admin";
}) {
  return (
    <ul className="space-y-6">
      {rows.map((row) => (
        <li
          key={row.bet.id}
          className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/30"
        >
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
              🚩 {row.reports.length} melding{row.reports.length === 1 ? "" : "en"}
            </p>
            <ProcessButton betId={row.bet.id} />
          </div>

          <BetCard
            bet={row.bet}
            user={row.user}
            currentUserId={adminId}
            currentUserRole={adminRole}
          />

          <details className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs dark:bg-ink-900/70">
            <summary className="cursor-pointer font-semibold text-ink-700 dark:text-ink-200">
              Bekijk meldingen ({row.reports.length})
            </summary>
            <ul className="mt-2 space-y-1.5 text-ink-600 dark:text-ink-300">
              {row.reports.map((r) => (
                <li key={r.id}>
                  <span className="font-semibold text-ink-800 dark:text-ink-100">
                    {r.reporter.displayName}
                  </span>{" "}
                  <span className="text-ink-400 dark:text-ink-500">
                    · {new Date(r.createdAt).toLocaleString("nl-NL")}
                  </span>
                  {r.reason && (
                    <div className="ml-2 italic text-ink-500 dark:text-ink-400">
                      &ldquo;{r.reason}&rdquo;
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  );
}

function ProcessButton({ betId }: { betId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        ✓ Verwerkt
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const r = await reviewReports({ betId });
          if (r.ok) setDone(true);
        });
      }}
      className="rounded-full bg-ink-900 px-3 py-1 text-xs font-semibold text-white hover:bg-ink-800 disabled:opacity-50 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
    >
      {pending ? "Bezig…" : "Meldingen verwerken"}
    </button>
  );
}
