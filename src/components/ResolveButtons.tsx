"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/I18nContext";
import { resolveBet, type ResolveBetResult } from "@/app/actions/resolveBet";
import type { BetStatus } from "@/lib/types";

type Outcome = "won" | "lost" | "void";

export function ResolveButtons({
  betId,
  betStatus,
  showAdminOverride = false,
}: {
  betId: string;
  betStatus: BetStatus;
  /** When true (admin viewing a settled bet), wrap the buttons in a collapsible "change outcome" toggle. */
  showAdminOverride?: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  function commit(outcome: Outcome) {
    const messages: Record<Outcome, string> = {
      won: t("resolve.confirmWon"),
      lost: t("resolve.confirmLost"),
      void: t("resolve.confirmVoid"),
    };
    if (!confirm(messages[outcome])) return;

    setError(null);
    startTransition(async () => {
      const result: ResolveBetResult = await resolveBet(betId, outcome);
      if (!result.ok) {
        setError(errorMessage(result.error, locale));
        return;
      }
      router.refresh();
    });
  }

  if (showAdminOverride && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-3 inline-flex items-center gap-1 rounded-full border border-ink-200 dark:border-ink-800 px-3 py-1 text-[11px] font-semibold text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800 dark:bg-ink-800"
      >
        ✏ {t("resolve.adminOverride")}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-400 dark:text-ink-500">
        {t("resolve.prompt")}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ResolveButton
          label={t("resolve.won")}
          tone="won"
          active={betStatus === "won"}
          disabled={pending}
          onClick={() => commit("won")}
        />
        <ResolveButton
          label={t("resolve.lost")}
          tone="lost"
          active={betStatus === "lost"}
          disabled={pending}
          onClick={() => commit("lost")}
        />
        <ResolveButton
          label={t("resolve.void")}
          tone="void"
          active={betStatus === "void"}
          disabled={pending}
          onClick={() => commit("void")}
        />
      </div>
      {error && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-200">{error}</div>
      )}
      {showAdminOverride && expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-[11px] font-semibold text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 dark:text-ink-300"
        >
          {locale === "nl" ? "Annuleren" : "Cancel"}
        </button>
      )}
    </div>
  );
}

function ResolveButton({
  label,
  tone,
  active,
  disabled,
  onClick,
}: {
  label: string;
  tone: "won" | "lost" | "void";
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const palette = {
    won: active
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : "bg-white dark:bg-ink-900 border border-emerald-200 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950/40",
    lost: active
      ? "bg-rose-600 text-white hover:bg-rose-700"
      : "bg-white dark:bg-ink-900 border border-rose-200 text-rose-700 dark:text-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900 dark:bg-rose-950/40",
    void: active
      ? "bg-ink-600 text-white hover:bg-ink-700"
      : "bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800 dark:bg-ink-800",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${palette}`}
    >
      {label}
    </button>
  );
}

type ResolveError = Extract<ResolveBetResult, { ok: false }>["error"];

function errorMessage(error: ResolveError, locale: "nl" | "en"): string {
  const map: Record<string, { nl: string; en: string }> = {
    not_authorized: {
      nl: "Alleen de eigenaar (of een beheerder) kan deze bet afhandelen.",
      en: "Only the owner (or an admin) can resolve this bet.",
    },
    not_authenticated: {
      nl: "Log eerst in.",
      en: "Sign in first.",
    },
    not_found: {
      nl: "Bet niet gevonden.",
      en: "Bet not found.",
    },
    already_resolved: {
      nl: "Deze bet is al afgehandeld.",
      en: "This bet is already resolved.",
    },
    invalid_status: {
      nl: "Ongeldige uitkomst.",
      en: "Invalid outcome.",
    },
  };
  return map[error]?.[locale] ?? (locale === "nl" ? "Er ging iets mis." : "Something went wrong.");
}
