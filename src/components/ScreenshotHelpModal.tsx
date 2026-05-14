"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/I18nContext";

type TabId =
  | "general"
  | "toto"
  | "bet365"
  | "unibet"
  | "hc"
  | "betcity"
  | "totoWinkel"
  | "fb";

const TABS: { id: TabId; label: { nl: string; en: string }; emoji?: string }[] = [
  { id: "general", label: { nl: "Algemeen", en: "General" }, emoji: "💡" },
  { id: "toto", label: { nl: "Toto", en: "Toto" } },
  { id: "bet365", label: { nl: "bet365", en: "bet365" } },
  { id: "unibet", label: { nl: "Unibet", en: "Unibet" } },
  { id: "hc", label: { nl: "Holland Casino", en: "Holland Casino" } },
  { id: "betcity", label: { nl: "BetCity", en: "BetCity" } },
  { id: "totoWinkel", label: { nl: "Toto Winkel (papier)", en: "Toto retail (paper)" }, emoji: "🧾" },
  { id: "fb", label: { nl: "Anders / FB-post", en: "Other / FB post" }, emoji: "📝" },
];

type Block = {
  title: { nl: string; en: string };
  do?: { nl: string[]; en: string[] };
  dont?: { nl: string[]; en: string[] };
  warning?: { nl: string; en: string };
  steps?: { nl: string[]; en: string[] };
};

const CONTENT: Record<TabId, Block> = {
  general: {
    title: { nl: "Algemene tips", en: "General tips" },
    do: {
      nl: [
        "Goed contrast — donker scherm op donker / licht op licht is moeilijk voor de OCR",
        "Recht gefotografeerd, niet schuin",
        "Alle wedstrijden in één screenshot — niet halverwege scrollen",
        "Decimale quoteringen (1.83), niet fractioneel of Amerikaans",
        "Eén bet per screenshot — geen meerdere bets onder elkaar",
      ],
      en: [
        "Good contrast — dark text on dark bg (or light on light) is hard for OCR",
        "Photographed straight-on, not at an angle",
        "All legs visible in one screenshot — don't scroll partway",
        "Decimal odds (1.83), not fractional or American",
        "One bet per screenshot — don't stack multiple bets",
      ],
    },
    dont: {
      nl: [
        "Geen reclame-banners eromheen meefotograferen",
        "Geen menu-balken of app-chrome",
        "Geen marketing-popups (\"Cashout-aanbieding!\")",
      ],
      en: [
        "No marketing banners around the bet",
        "No menu bars or app chrome",
        "No promo pop-ups (\"Cashout offer!\")",
      ],
    },
  },
  toto: {
    title: { nl: "Toto (app)", en: "Toto (app)" },
    steps: {
      nl: [
        "Open de Toto-app",
        "Ga naar 'Mijn weddenschappen'",
        "Tap op de bet die je wilt delen",
        "Screenshot de volledige bet-pagina (Odds + alle wedstrijden + totaal-quotering)",
      ],
      en: [
        "Open the Toto app",
        "Go to 'Mijn weddenschappen' (My bets)",
        "Tap the bet you want to share",
        "Screenshot the full bet page (Odds + all matches + total odds)",
      ],
    },
    do: {
      nl: ["De parser werkt het best op de digitale Toto-layout met 'Odds' bovenaan en 'Inzet / Pot. Winst' onderaan"],
      en: ["The parser handles digital Toto best — 'Odds' on top, 'Inzet / Pot. Winst' at the bottom"],
    },
  },
  bet365: {
    title: { nl: "bet365", en: "bet365" },
    steps: {
      nl: [
        "Open de bet365-app of website",
        "Ga naar 'Mijn weddenschappen' / 'Bet History'",
        "Tap op de bet",
        "Screenshot de volledige betslip — zorg dat alle legs zichtbaar zijn voor je scrollt",
      ],
      en: [
        "Open the bet365 app or website",
        "Go to 'My bets' / 'Bet History'",
        "Tap the bet",
        "Screenshot the full betslip — make sure all legs are visible before scrolling",
      ],
    },
    warning: {
      nl: "Bet Builder met meerdere sub-selecties wordt soms rommelig geparseerd (de sub-condities worden allemaal in de selectie-tekst geplakt). Het werkt, maar wil je het netjes — corrigeer de Keuze-veld handmatig.",
      en: "Bet Builder with multiple sub-selections sometimes parses messily (all sub-conditions get packed into the selection text). It works, but tidy up the Selection field manually if you want it clean.",
    },
  },
  unibet: {
    title: { nl: "Unibet", en: "Unibet" },
    steps: {
      nl: [
        "Open de Unibet-app",
        "'Mijn weddenschappen' → tap op de bet",
        "Screenshot de volledige pagina — zorg dat 'Noteringen: X.XX' onderaan zichtbaar is",
      ],
      en: [
        "Open the Unibet app",
        "'My bets' → tap the bet",
        "Screenshot the full page — make sure 'Noteringen: X.XX' at the bottom is visible",
      ],
    },
    warning: {
      nl: "Unibet toont géén per-wedstrijd quoteringen op de bet-overview, alleen het totaal onderaan. De parser verdeelt het totaal gelijkmatig over de legs als placeholder — pas de losse quoteringen handmatig aan als je ze nodig hebt voor de details.",
      en: "Unibet doesn't show per-leg odds on the bet overview, only the total at the bottom. The parser distributes the total evenly across the legs as a placeholder — adjust per-leg odds manually if you need them for the details.",
    },
  },
  hc: {
    title: { nl: "Holland Casino", en: "Holland Casino" },
    steps: {
      nl: [
        "Open de Holland Casino-app",
        "Ga naar je weddenschappen",
        "Tap op de bet en maak screenshot",
      ],
      en: [
        "Open the Holland Casino app",
        "Go to your bets",
        "Tap the bet and screenshot",
      ],
    },
    warning: {
      nl: "Holland Casino's app-layout verandert geregeld. Werkt iets niet? Stuur de screenshot in de FB-groep, dan kijk ik er naar.",
      en: "Holland Casino's app layout changes regularly. Something not working? Post the screenshot in the FB group and I'll have a look.",
    },
  },
  betcity: {
    title: { nl: "BetCity", en: "BetCity" },
    steps: {
      nl: [
        "Open de BetCity-app",
        "Ga naar 'Mijn weddenschappen'",
        "Tap op de bet en maak screenshot",
      ],
      en: [
        "Open the BetCity app",
        "Go to 'My bets'",
        "Tap the bet and screenshot",
      ],
    },
  },
  totoWinkel: {
    title: { nl: "Toto Winkel (papieren bon)", en: "Toto retail (paper receipt)" },
    warning: {
      nl: "Foto's van papieren bonnen werken niet goed — de donker-gemarkeerde balken, de boost-asterisks en de strijdige belichting verwarren de OCR vrijwel altijd. Slechts ~50% van de bets wordt correct herkend.",
      en: "Photos of paper receipts don't parse well — the dark highlight bars, boost asterisks, and inconsistent lighting confuse the OCR almost every time. Only ~50% of legs come through correctly.",
    },
    steps: {
      nl: [
        "Scan de QR-code op de bon met de camera van je telefoon",
        "Open de link die de QR teruggeeft (gaat naar toto.nl)",
        "Op die pagina staat een schone weergave van je bet — vul vanuit daar handmatig in",
      ],
      en: [
        "Scan the QR code on the receipt with your phone camera",
        "Open the link the QR points to (goes to toto.nl)",
        "That page shows a clean view of your bet — fill in manually from there",
      ],
    },
    do: {
      nl: ["Geen tijd? Typ de wedstrijden handmatig in — vaak sneller dan een onleesbare foto repareren"],
      en: ["No time? Type the matches in manually — often faster than fixing a botched photo"],
    },
  },
  fb: {
    title: { nl: "Geschreven Facebook-post", en: "Plain Facebook post" },
    steps: {
      nl: [
        "Maak screenshot van de FB-post-tekst",
        "Of: kopieer de tekst en plak deze in een notitie-app, screenshot de notitie",
        "Of: typ de bet gewoon handmatig in",
      ],
      en: [
        "Screenshot the FB post text",
        "Or: copy the text into a notes app and screenshot that",
        "Or: just type the bet manually",
      ],
    },
    do: {
      nl: [
        "Layout zoals 'Beide Teams Scoren: Ja @ 1.83 / FK Septemvri Sofia - Spartak Varna' parseert het best",
        "Eén bet per screenshot voor de duidelijkheid",
      ],
      en: [
        "Layout like 'Beide Teams Scoren: Ja @ 1.83 / FK Septemvri Sofia - Spartak Varna' parses best",
        "One bet per screenshot for clarity",
      ],
    },
  },
};

export function ScreenshotHelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const [active, setActive] = useState<TabId>("general");

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const block = CONTENT[active];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black tracking-tight">
              {locale === "nl" ? "Tips voor screenshots" : "Screenshot tips"}
            </h2>
            <p className="text-xs text-ink-400">
              {locale === "nl"
                ? "Hoe je per bookie de beste OCR-resultaten krijgt"
                : "How to get the best OCR results per bookie"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-ink-100 px-3 py-2 scrollbar-thin">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active === tab.id
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:bg-ink-100"
              }`}
            >
              {tab.emoji && <span className="mr-1">{tab.emoji}</span>}
              {tab.label[locale]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          <h3 className="text-base font-black tracking-tight">{block.title[locale]}</h3>

          {block.warning && (
            <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
              ⚠️ {block.warning[locale]}
            </div>
          )}

          {block.steps && (
            <div className="mt-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                {locale === "nl" ? "Stappen" : "Steps"}
              </div>
              <ol className="space-y-2 text-sm text-ink-700">
                {block.steps[locale].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {block.do && (
            <div className="mt-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                ✓ {locale === "nl" ? "Wel doen" : "Do"}
              </div>
              <ul className="space-y-1.5 text-sm text-ink-700">
                {block.do[locale].map((tip, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 text-emerald-600">✓</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {block.dont && (
            <div className="mt-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                ✗ {locale === "nl" ? "Niet doen" : "Don't"}
              </div>
              <ul className="space-y-1.5 text-sm text-ink-700">
                {block.dont[locale].map((tip, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 text-rose-600">✗</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-ink-100 px-5 py-3 text-center">
          <button
            onClick={onClose}
            className="rounded-full bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800"
          >
            {locale === "nl" ? "Sluiten" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
