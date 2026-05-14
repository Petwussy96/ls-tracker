"use client";

import Link from "next/link";
import { useI18n } from "@/lib/I18nContext";

export function CheckEmailMessage() {
  const { locale } = useI18n();
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <div className="text-5xl">📬</div>
      <h1 className="mt-4 text-2xl font-black">
        {locale === "nl" ? "Check je inbox" : "Check your inbox"}
      </h1>
      <p className="mt-2 text-ink-600">
        {locale === "nl"
          ? "We hebben je een inlog-link gestuurd. Klik op de link om verder te gaan."
          : "We sent you a sign-in link. Click it to continue."}
      </p>
      <p className="mt-6 text-xs text-ink-400">
        {locale === "nl"
          ? "Niets ontvangen? Check je spam-folder."
          : "Didn't get it? Check your spam folder."}
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-sm font-semibold text-ink-900 underline"
      >
        ← {locale === "nl" ? "Terug naar de ranglijst" : "Back to the leaderboard"}
      </Link>
    </div>
  );
}
