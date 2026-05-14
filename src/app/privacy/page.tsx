"use client";

import Link from "next/link";
import { useI18n } from "@/lib/I18nContext";

export default function PrivacyPage() {
  const { locale } = useI18n();
  return (
    <article className="prose prose-ink mx-auto max-w-2xl text-ink-800 dark:text-ink-200">
      <h1 className="text-3xl font-black tracking-tight text-ink-900 dark:text-white">
        {locale === "nl" ? "Privacybeleid" : "Privacy policy"}
      </h1>
      {locale === "nl" ? <NL /> : <EN />}
      <p className="mt-8 text-xs text-ink-400 dark:text-ink-500">
        <Link href="/" className="underline">
          ← {locale === "nl" ? "Terug" : "Back"}
        </Link>
      </p>
    </article>
  );
}

function NL() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>
        <strong>LS Tracker</strong> is een community-tool voor de Lucky Sucker Facebook-groep.
        We zijn geen gokaanbieder en houden geen inzetten of geldbedragen bij. Dit is geen
        commerciële dienst.
      </p>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">Welke gegevens slaan we op?</h2>
      <ul className="list-disc pl-5">
        <li>Je e-mailadres (om in te loggen via magic-link)</li>
        <li>Je gebruikersnaam en weergavenaam (door jou gekozen)</li>
        <li>Je gekozen avatar (preset of upload)</li>
        <li>De wedstrijden / selecties die je zelf invoert</li>
      </ul>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">Waar staan die gegevens?</h2>
      <p>
        Tekstdata staat in een PostgreSQL-database bij <strong>Supabase</strong> (EU). Avatars
        staan bij <strong>Cloudinary</strong>. Magic-link e-mails worden verstuurd via{" "}
        <strong>Resend</strong>. Het OCR-proces van een geüploade screenshot draait volledig in
        je browser — de afbeelding zelf verlaat je apparaat dus niet.
      </p>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">Cookies & localStorage</h2>
      <p>
        We gebruiken alleen strikt noodzakelijke opslag: een sessie-cookie van Auth.js zodat
        je ingelogd blijft, en localStorage voor je taal-, thema- en bannerkeuzes. Geen
        tracking-cookies, geen ad-tech, geen externe analytics buiten Vercel Analytics
        (cookie-loos, geaggregeerd).
      </p>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">Jouw rechten</h2>
      <p>
        Je kunt op elk moment je account en bijbehorende data laten verwijderen. Stuur een
        mailtje naar{" "}
        <a className="underline" href="mailto:i.dimitrijevic96@gmail.com">
          i.dimitrijevic96@gmail.com
        </a>{" "}
        en het is binnen 7 dagen geregeld. Datacorrectie of -inzage kan via hetzelfde adres.
      </p>

      <p className="text-xs text-ink-400 dark:text-ink-500">
        Laatst bijgewerkt: mei 2026.
      </p>
    </div>
  );
}

function EN() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>
        <strong>LS Tracker</strong> is a community tool for the Lucky Sucker Facebook group.
        It is not a bookmaker and does not track stakes or money. This is not a commercial
        service.
      </p>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">What data do we store?</h2>
      <ul className="list-disc pl-5">
        <li>Your email address (for magic-link sign-in)</li>
        <li>Your chosen username and display name</li>
        <li>Your chosen avatar (preset or upload)</li>
        <li>The matches / selections you submit yourself</li>
      </ul>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">Where is it stored?</h2>
      <p>
        Text data lives in a PostgreSQL database at <strong>Supabase</strong> (EU). Avatars
        live at <strong>Cloudinary</strong>. Magic-link emails are sent through{" "}
        <strong>Resend</strong>. Screenshot OCR runs entirely in your browser — the image
        itself never leaves your device.
      </p>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">Cookies & localStorage</h2>
      <p>
        Strictly-necessary storage only: an Auth.js session cookie so you stay signed in, and
        localStorage for your language, theme, and banner preferences. No tracking cookies,
        no ad-tech, and no third-party analytics beyond Vercel Analytics (cookie-less and
        aggregated).
      </p>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">Your rights</h2>
      <p>
        You can ask for your account and data to be deleted at any time. Email{" "}
        <a className="underline" href="mailto:i.dimitrijevic96@gmail.com">
          i.dimitrijevic96@gmail.com
        </a>{" "}
        and it'll be done within 7 days. Same address for correction or access requests.
      </p>

      <p className="text-xs text-ink-400 dark:text-ink-500">Last updated: May 2026.</p>
    </div>
  );
}
