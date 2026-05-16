"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/I18nContext";

// 4-step intro tour that auto-fires on the first visit per logged-in user.
// Completion is stored in localStorage so it never re-appears after dismiss.
// Users who want to see it again can clear localStorage or DM admin to reset.

const STORAGE_KEY = "lucky-sucker-onboarded";

type Step = {
  emoji: string;
  title: { nl: string; en: string };
  body: { nl: string; en: string };
  cta?: { href: string; nl: string; en: string };
};

const STEPS: Step[] = [
  {
    emoji: "🎯",
    title: { nl: "Welkom bij LS Tracker!", en: "Welcome to LS Tracker!" },
    body: {
      nl: "Dit is de plek waar de Lucky Sucker community elkaars bets bijhoudt. Geen geld, geen inzetten — alleen wie de scherpste calls maakt.",
      en: "This is where the Lucky Sucker community tracks each other's bets. No money, no stakes — just who makes the sharpest calls.",
    },
  },
  {
    emoji: "📸",
    title: { nl: "Plaats je eerste bet", en: "Place your first bet" },
    body: {
      nl: "Upload een screenshot van je wedstrijdformulier — wedstrijden, selecties en odds worden automatisch ingevuld. Werkt voor Toto, bet365 en Unibet.",
      en: "Upload a screenshot of your slip — matches, selections, and odds auto-fill. Works for Toto, bet365, and Unibet.",
    },
    cta: { href: "/submit", nl: "Naar plaatsen →", en: "Place a bet →" },
  },
  {
    emoji: "🏆",
    title: { nl: "Volg de ranglijst", en: "Follow the leaderboard" },
    body: {
      nl: "Filter op categorie (BTTS / Mix / Resultaat / etc.) en zie wie er bovenaan staat. Top-3 krijgen medal-chips, bij streaks komen er vlammen 🔥.",
      en: "Filter by category (BTTS / Mix / Result / etc.) and see who's on top. Top 3 get medal chips, streaks light up with flames 🔥.",
    },
    cta: { href: "/", nl: "Naar leaderboard →", en: "View leaderboard →" },
  },
  {
    emoji: "👤",
    title: { nl: "Je eigen stats", en: "Your own stats" },
    body: {
      nl: "Op je profiel zie je je win-rate, hoogste gewonnen quotering, streaks en een grafiek van je vorm over tijd. Klaar voor de eerste bet?",
      en: "Your profile shows your win-rate, biggest odds won, streaks, and a chart of your form over time. Ready for your first bet?",
    },
  },
];

export function OnboardingTour({ enabled }: { enabled: boolean }) {
  const { locale } = useI18n();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "1") setShow(true);
    } catch {
      setShow(true);
    }
  }, [enabled]);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl dark:border-ink-700 dark:bg-ink-900">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-8 bg-ink-900 dark:bg-white"
                  : i < step
                    ? "w-1.5 bg-ink-400"
                    : "w-1.5 bg-ink-200 dark:bg-ink-700"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="mt-6 text-center">
          <div className="text-6xl">{current.emoji}</div>
          <h2 className="mt-4 text-2xl font-black text-ink-900 dark:text-white">
            {current.title[locale]}
          </h2>
          <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">
            {current.body[locale]}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2">
          {current.cta && (
            <Link
              href={current.cta.href}
              onClick={dismiss}
              className="rounded-full bg-ink-900 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
            >
              {current.cta[locale]}
            </Link>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
            >
              {locale === "nl" ? "Sla over" : "Skip"}
            </button>

            <div className="flex gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="rounded-full border border-ink-200 bg-white px-4 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
                >
                  ←
                </button>
              )}
              <button
                type="button"
                onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
                className="rounded-full bg-ink-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
              >
                {isLast
                  ? locale === "nl"
                    ? "Klaar 🎉"
                    : "Done 🎉"
                  : locale === "nl"
                    ? "Volgende →"
                    : "Next →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
