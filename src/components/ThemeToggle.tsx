"use client";

import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/I18nContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { locale } = useI18n();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        isDark
          ? locale === "nl"
            ? "Schakel naar lichte modus"
            : "Switch to light mode"
          : locale === "nl"
            ? "Schakel naar donkere modus"
            : "Switch to dark mode"
      }
      title={isDark ? "Light mode" : "Dark mode"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-100 hover:text-ink-900 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700 dark:hover:text-white"
    >
      {isDark ? (
        // Sun icon (currently dark, click → light)
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Moon icon (currently light, click → dark)
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
