"use client";

import Link from "next/link";
import { useI18n } from "@/lib/I18nContext";

// Tijdelijke info-pagina. Tot we een echt e-mail-verzendend domein hebben
// gaat een reset via de admin: gebruiker stuurt een DM met z'n email, admin
// klikt "🔑 Reset wachtwoord" in /admin/users en deelt de link terug.

export default function ForgotPasswordPage() {
  const { locale } = useI18n();
  return (
    <div className="mx-auto max-w-md py-12">
      <div className="rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-sm dark:border-ink-700 dark:bg-ink-900">
        <div className="text-5xl">🔐</div>
        <h1 className="mt-4 text-2xl font-black text-ink-900 dark:text-white">
          {locale === "nl" ? "Wachtwoord vergeten?" : "Forgot your password?"}
        </h1>
        <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">
          {locale === "nl" ? (
            <>
              Zolang we nog geen automatische mails versturen, regelt de
              beheerder het persoonlijk. <strong>Stuur een korte DM via
              Facebook Messenger</strong> met je e-mailadres en je krijgt
              binnen no-time een resetlink terug.
            </>
          ) : (
            <>
              Until we have automated emails, the admin handles resets by
              hand. <strong>Send a short DM on Facebook Messenger</strong>{" "}
              with your email and you'll get a reset link back in no time.
            </>
          )}
        </p>
        <p className="mt-4 text-xs text-ink-500 dark:text-ink-400">
          {locale === "nl"
            ? "Tip: vermeld in je bericht 'wachtwoord-reset' + je e-mail. Hoe sneller je info hoe sneller je weer binnen bent."
            : "Tip: mention 'password reset' + your email in the message. The clearer the request, the faster you're back in."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <a
            href="https://m.me/iwan.dimitrijevic.5"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
          >
            💬 {locale === "nl" ? "DM op Messenger" : "DM on Messenger"}
          </a>
          <Link
            href="/login"
            className="rounded-full border border-ink-200 bg-white px-5 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700"
          >
            ← {locale === "nl" ? "Terug naar inloggen" : "Back to sign in"}
          </Link>
        </div>
      </div>
    </div>
  );
}
