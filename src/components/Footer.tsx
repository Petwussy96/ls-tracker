"use client";

import Link from "next/link";
import { useI18n } from "@/lib/I18nContext";
import { FeedbackButton } from "@/components/FeedbackButton";

export function Footer() {
  const { t, locale } = useI18n();

  function hardRefresh() {
    if (typeof window === "undefined") return;
    // location.reload(true) is deprecated; modern browsers refetch resources
    // when the URL has a cache-busting query, so we append a timestamp.
    const url = new URL(window.location.href);
    url.searchParams.set("_r", Date.now().toString());
    window.location.replace(url.toString());
  }

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
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={hardRefresh}
            className="inline-flex items-center gap-1 hover:text-ink-900 hover:underline dark:hover:text-white"
            title={locale === "nl" ? "Pagina opnieuw laden" : "Reload page"}
          >
            🔄 {locale === "nl" ? "Vernieuw" : "Refresh"}
          </button>
        </nav>
        <div className="order-1 sm:order-3">
          <FeedbackButton variant="footer" />
        </div>
      </div>
    </footer>
  );
}
