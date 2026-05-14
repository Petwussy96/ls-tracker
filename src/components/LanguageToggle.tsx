"use client";

import { useI18n } from "@/lib/I18nContext";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex rounded-full border border-ink-200 bg-white p-0.5 text-xs font-medium dark:border-ink-700 dark:bg-ink-800">
      <button
        onClick={() => setLocale("nl")}
        className={`rounded-full px-3 py-1 transition ${
          locale === "nl"
            ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
            : "text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        }`}
        aria-pressed={locale === "nl"}
      >
        NL
      </button>
      <button
        onClick={() => setLocale("en")}
        className={`rounded-full px-3 py-1 transition ${
          locale === "en"
            ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
            : "text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        }`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}
