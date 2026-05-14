"use client";

import Link from "next/link";
import { useI18n } from "@/lib/I18nContext";

export default function TermsPage() {
  const { locale } = useI18n();
  return (
    <article className="prose prose-ink mx-auto max-w-2xl text-ink-800 dark:text-ink-200">
      <h1 className="text-3xl font-black tracking-tight text-ink-900 dark:text-white">
        {locale === "nl" ? "Gebruiksvoorwaarden" : "Terms of use"}
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
        <strong>LS Tracker</strong> is een gratis, niet-commerciële community-tool waarmee
        leden van de Lucky Sucker Facebook-groep hun eigen weddenschappen kunnen vastleggen
        en vergelijken. Door in te loggen ga je akkoord met de onderstaande punten.
      </p>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">1. Geen gokaanbieder</h2>
      <p>
        LS Tracker faciliteert geen weddenschappen, neemt geen inzetten aan en houdt geen
        geldbedragen bij. Alle data wordt door gebruikers zelf ingevoerd. We hebben geen
        affiliatie met de genoemde bookmakers (Toto, bet365, Unibet, etc.).
      </p>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">2. Verantwoord spelen</h2>
      <p>
        Gokken kan verslavend zijn. Speel bewust en alleen met geld dat je je kunt veroorloven
        te verliezen. 18+. Voor hulp:{" "}
        <a className="underline" href="https://www.loketkansspel.nl" target="_blank" rel="noopener noreferrer">
          Loket Kansspel
        </a>{" "}
        of bel <strong>0900-1995</strong>.
      </p>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">3. Gedragsregels</h2>
      <ul className="list-disc pl-5">
        <li>Plaats geen inhoud die kwetsend, illegaal of inbreukmakend is.</li>
        <li>Doe je niet voor als iemand anders.</li>
        <li>Misbruik (spam, scraping, exploits) kan resulteren in directe verwijdering van je account.</li>
      </ul>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">4. Aansprakelijkheid</h2>
      <p>
        LS Tracker wordt geleverd "as is". We doen ons best dat de gegevens kloppen, maar
        garanderen niets. We zijn niet aansprakelijk voor financiële verliezen of beslissingen
        die je maakt op basis van de gegevens in deze tool.
      </p>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">5. Wijzigingen</h2>
      <p>
        Deze voorwaarden kunnen wijzigen. Bij ingrijpende wijzigingen kondigen we het aan via
        e-mail of in de app.
      </p>

      <p className="text-xs text-ink-400 dark:text-ink-500">Laatst bijgewerkt: mei 2026.</p>
    </div>
  );
}

function EN() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>
        <strong>LS Tracker</strong> is a free, non-commercial community tool that lets
        members of the Lucky Sucker Facebook group log and compare their own bets. By
        signing in you agree to the terms below.
      </p>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">1. Not a bookmaker</h2>
      <p>
        LS Tracker does not place bets, take stakes, or handle money. All data is entered by
        users. We have no affiliation with the bookmakers mentioned (Toto, bet365, Unibet,
        etc.).
      </p>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">2. Bet responsibly</h2>
      <p>
        Gambling can be addictive. Only bet what you can afford to lose. 18+. In the
        Netherlands you can contact{" "}
        <a className="underline" href="https://www.loketkansspel.nl" target="_blank" rel="noopener noreferrer">
          Loket Kansspel
        </a>{" "}
        or call <strong>0900-1995</strong>.
      </p>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">3. Conduct</h2>
      <ul className="list-disc pl-5">
        <li>Do not post content that is offensive, illegal, or infringing.</li>
        <li>Do not impersonate someone else.</li>
        <li>Abuse (spam, scraping, exploits) may result in account removal without notice.</li>
      </ul>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">4. Liability</h2>
      <p>
        LS Tracker is provided "as is". We try to keep the data correct but make no
        guarantees. We are not liable for financial losses or decisions you make based on
        the information in this tool.
      </p>

      <h2 className="text-lg font-bold text-ink-900 dark:text-white">5. Changes</h2>
      <p>
        These terms may change. We'll announce material changes via email or in-app.
      </p>

      <p className="text-xs text-ink-400 dark:text-ink-500">Last updated: May 2026.</p>
    </div>
  );
}
