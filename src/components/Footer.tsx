"use client";

import { useI18n } from "@/lib/I18nContext";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white/60 dark:border-ink-800 dark:bg-ink-900/60">
      <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-ink-400 dark:text-ink-500 sm:px-6">
        {t("footer.disclaimer")}
      </div>
    </footer>
  );
}
