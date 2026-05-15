"use client";

import Link from "next/link";
import { useI18n } from "@/lib/I18nContext";
import { FeedbackButton } from "@/components/FeedbackButton";

export function Footer() {
  const { t, locale } = useI18n();
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white/60 dark:border-ink-800 dark:bg-ink-900/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-center text-xs text-ink-400 sm:flex-row sm:justify-between sm:px-6 dark:text-ink-500">
        <p className="order-3 sm:order-1">{t("footer.disclaimer")}</p>
        <nav className="order-2 flex flex-wrap items-center justify-center gap-3 text-ink-500 dark:text-ink-400">
          <Link href="/privacy" className="hover:text-ink-900 hover:underline dark:hover:text-white">
            {locale === "nl" ? "Privacy" : "Privacy"}
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-ink-900 hover:underline dark:hover:text-white">
            {locale === "nl" ? "Voorwaarden" : "Terms"}
          </Link>
        </nav>
        <div className="order-1 sm:order-3">
          <FeedbackButton variant="footer" />
        </div>
      </div>
    </footer>
  );
}
