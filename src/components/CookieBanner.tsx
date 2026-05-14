"use client";

// Small EU-compliant cookie/privacy banner.
// We use minimal tracking: only localStorage (theme/locale/welcome) +
// the Auth.js session cookie. No third-party analytics cookies, no ad tech.
// Banner is purely a notice — there's nothing to opt out of beyond not
// logging in, so a single "Akkoord" button is sufficient under GDPR for
// strictly-necessary + first-party storage.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/I18nContext";

const STORAGE_KEY = "lucky-sucker-cookie-ack";

export function CookieBanner() {
  const { locale } = useI18n();
  // Hidden by default to avoid SSR/CSR flash; we reveal it after mount
  // if the user hasn't acknowledged it yet.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "1") setVisible(true);
    } catch {
      // localStorage blocked — just show the banner each visit
      setVisible(true);
    }
  }, []);

  function accept() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={locale === "nl" ? "Cookie melding" : "Cookie notice"}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white/95 backdrop-blur dark:border-ink-700 dark:bg-ink-900/95"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 text-sm text-ink-700 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:text-ink-200">
        <p className="leading-snug">
          {locale === "nl" ? (
            <>
              🍪 We gebruiken alleen <strong>strikt noodzakelijke</strong> cookies en
              localStorage — voor je sessie, taalkeuze en thema. Geen tracking, geen
              advertenties.{" "}
              <Link href="/privacy" className="underline hover:text-ink-900 dark:hover:text-white">
                Privacybeleid
              </Link>
            </>
          ) : (
            <>
              🍪 We only use <strong>strictly necessary</strong> cookies and localStorage —
              for your session, language, and theme. No tracking, no ads.{" "}
              <Link href="/privacy" className="underline hover:text-ink-900 dark:hover:text-white">
                Privacy policy
              </Link>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 self-end rounded-full bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 sm:self-auto dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
        >
          {locale === "nl" ? "Akkoord" : "Got it"}
        </button>
      </div>
    </div>
  );
}
