// Heuristic parser: turns OCR'd text from a betslip / FB post into structured
// bet selections. No AI needed — uses regex + line analysis tuned for the
// formats this group actually posts (Dutch + English, multiple bookies).

export type ParsedSelection = {
  match: string;
  competition?: string;
  selection: string;
  odds: number;
};

export type ParsedBetText = {
  selections: ParsedSelection[];
  isAccumulator: boolean;
  combinedOdds?: number;
  kickoff?: string;
  bookie?: string;
  notes?: string;
  confidence: "high" | "medium" | "low";
};

// Decimal odds: 1.01 - 99.99, written with `.` or `,`. Allow an optional
// single whitespace after the separator (OCR sometimes splits "1,56" into
// "1, 56"). We require a whitespace, "@", or start-of-line anchor so we
// don't pick up euros (€40.00) or %.
const ODDS_RE = /(?:^|\s|@\s?)(\d{1,2}[.,]\s?\d{2,3})\*?(?:\b|$|\*)/g;

// Two-team fixture. Not strictly anchored to start/end of line, because OCR
// often glues trailing junk onto the line ("FC Sion vs. FC Lugano * ==") or
// prefixes weird artifacts. We just require a clean team-separator-team
// segment anchored by whitespace on at least one side.
//
// Uses Unicode property classes (\p{L} = any letter, \p{N} = any number) so
// accented team names like "Atlético-GO" or "FC Köln" match correctly.
const MATCH_RE =
  /(?:^|\s)(?:\d+\.\s+(?:\d+\s+)?)?(\p{L}[\p{L}\p{N} .'’&!\-/()]{1,50})\s+(?:[-–—]|vs?\.?|tegen)\s+(\p{L}[\p{L}\p{N} .'’&!\-/()]{1,50})(?=\s|$|[^\p{L}\p{N}])/iu;

const SELECTION_HINTS = [
  /beide\s*teams?\s*scor/i,
  /btts/i,
  /over\s*\d/i,
  /under\s*\d/i,
  /meer\s*dan/i, // Dutch "more than" (Over X.X)
  /minder\s*dan/i, // Dutch "less than" (Under X.X)
  /handicap/i,
  /draw|gelijk/i,
  // NB: word boundaries on BOTH sides — without the leading \b, /no\b/ would
  // match "no" inside team names like "Valle*cano*" and "Mila*no*".
  /\bwint\b|\bwin\b|\bwins\b/i,
  /\bja\b|\bnee\b/i,
  /\byes\b|\bno\b/i,
  /\b[12x]\s*x\s*[12x]\b/i,
  /\bcorrect\s*score\b|\bjuiste\s*uitslag\b/i,
  /scoort/i, // "Vinicius Jr. scoort" (bet365 Bet Builder)
  /eindresultaat/i,
  /\bresultaat\b/i, // Toto "Resultaat" (1X2 / match winner)
  /aantal\s*goals/i,
  /aantal\s*doelpunten/i, // Unibet "Totaal Aantal Doelpunten: Meer dan 2.5"
  /doelpuntentotaal/i,
  /\brust:/i, // Unibet "Rust: Real Madrid" (halftime winner)
  /draw\s*no\s*bet/i, // Unibet
  /dubbele\s*kans/i, // Unibet "Dubbele Kans" (double chance)
  /geeft\s*een\s*assist/i, // Unibet "Scoort of Geeft Een Assist"
  /reguliere\s*speeltijd/i, // Unibet 1X2 winner — "Reguliere Speeltijd: Salford City FC"
  /schoten\s*(?:van|op)/i, // Unibet "Schoten van speler op doel" / "Schoten op doel"
];

// Lines that are summary / metadata / headers, NEVER selections.
const SUMMARY_PATTERNS = [
  /noteringen?/i,
  /\btotaal(?:\s*[:=€£$]|\s+(?:odds|quotering|inzet|inleg|uitbetaling|winst|profit))/i, // "Totaal: 5", "Totaal Quotering" — but NOT "Totaal Aantal Doelpunten"
  /total\s*odds/i,
  /combined\s*odds/i,
  /\binzet(?:\s*[:=€£$]|\s+\d)/i, // "Inzet: €5,00", "Inzet 5,00" — NOT trailing placeholder
  /\bstake(?:\s*[:=€£$]|\s+\d)/i,
  /\buitbetaling\b/i,
  /\bpayout\b/i,
  /\bpotenti[eë]le?/i,
  /winstverhoging/i,
  /odd[s]?\s*boost/i,
  /\bweddenschap\b/i,
  /\bbonnr\b/i,
  /\bticket\s*id\b/i,
  /\bpot\./i,
  /\bwinst\b/i,
  /^odds\s+\d/i,
  /^(?:dubbel|enkele|single|treble|trixie|yankee|patent|combi|systeem|accumulator)\s*$/i,
  /^(?:eindtotaal|overzicht|samenvatting|summary)/i,
  // Unibet accumulator headers ("Vijfvoudig • 0 van 5 afgehandeld").
  // No trailing \b — Tesseract often hallucinates an extra "e" (Vijfvoudige).
  /^(?:enkelvoudig|drievoudig|viervoudig|vijfvoudig|zesvoudig|zevenvoudig|achtvoudig|negenvoudig|tienvoudig)/i,
  /^\s*\d+[-‐–—]?voud\b/i,                       // bet365 "5-voud + 10% 18.14" combined-odds row
  /\+\s*\d+\s*%/,                                 // "+10%" combi-boost label often on combined-odds row
  /coupon[-\s]?id/i,
  // Toto paper receipt
  /speeldatum/i,
  /nr\.\s*wedstrijd/i,
  /^quotering\s*$/i,
  /bet\s*systeem/i,
  /\binleg\b/i,
  /winbedrag/i,
  /^bonus\s*$/i,
  // bet365
  /vroege\s*uitbetaling/i,
  /selecties\s*opnieuw/i,
  /cash\s*out/i,
  /wissel\+/i,
  /\bsaldo\b/i,                  // bet365 balance display
  /\bopties\s+tonen\b/i,        // bet365 "show options" link
  /^selecties\s*$/i,             // standalone "Selecties" header
  // Toto Spelformulier (bet builder) layout
  /^spelformulier/i,
  /^selecties\s*\(/i, // "SELECTIES (5)"
  /speel\s*in\s*de\s*winkel/i,
  /je\s*maakt\s*kans/i,
  /totale?\s*inleg/i,
  /€\s*\d/i, // any line with € followed by digits = currency, not a leg
];

// "Combined odds" hint patterns — when a line says "Totaal:/Combined/Odds X.XX",
// that number is the slip's overall odds, not an individual leg.
const COMBO_HINT_RE =
  /(?:noteringen?|notering|totaal|total|combined|combi|quote(?:ring)?|odds)[\s:]+(\d{1,3}[.,]\d{2,3})/i;

const COMPETITION_HINTS = [
  "Eredivisie",
  "Keuken Kampioen",
  "Premier League",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
  "Champions League",
  "Europa League",
  "Conference League",
  "KNVB Beker",
  "Bulgarian First League",
  "Süper Lig",
  "Eerste Divisie",
  "Super League",
  "Saudi Pro League",
];

type OddsHit = {
  value: number;
  pos: number;
};

type Line = {
  raw: string;
  odds: OddsHit[];
  hasMatch: boolean;
  hasSelection: boolean;
  isSummary: boolean;
  combinedOddsHint?: number;
};

function classifyLine(raw: string): Line {
  // Strip leading OCR noise *before* anything else so subsequent regex checks
  // (selection hints, summary patterns, MATCH_RE, looksLikeTeamName) work
  // against clean text.
  const text = stripLeadingNoise(raw.trim());
  const odds: OddsHit[] = [];

  ODDS_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ODDS_RE.exec(text)) !== null) {
    // Strip any internal whitespace (e.g. "1, 56" → "1,56") before parsing.
    const value = parseFloat(m[1].replace(/\s+/g, "").replace(",", "."));
    if (Number.isFinite(value) && value >= 1.01 && value <= 99.99) {
      const pos = m.index + m[0].indexOf(m[1]);
      odds.push({ value: +value.toFixed(3), pos });
    }
  }

  const hasMatch = Boolean(extractMatchFromLine(text));
  const hasSelection = SELECTION_HINTS.some((re) => re.test(text));
  const isSummary = SUMMARY_PATTERNS.some((re) => re.test(text));

  let combinedOddsHint: number | undefined;
  const combo = text.match(COMBO_HINT_RE);
  if (combo) {
    const value = parseFloat(combo[1].replace(",", "."));
    if (Number.isFinite(value) && value >= 1.01) combinedOddsHint = +value.toFixed(3);
  }

  return { raw: text, odds, hasMatch, hasSelection, isSummary, combinedOddsHint };
}

// Bet-type strings that masquerade as team names: "Meer dan 1.5",
// "Over 2.5", "Minder dan 3.5", "Under 4.5", "Beide teams scoren", etc.
// MATCH_RE can falsely match these as a fixture (e.g. "Patrik Schick -
// Meer dan 1.5"), so we post-filter.
const FAKE_TEAM_RE =
  /^(?:meer\s*dan|minder\s*dan|over|under)\s*\d|^beide\s*teams|^ja$|^nee$|^yes$|^no$/i;

function extractMatchFromLine(text: string): string | undefined {
  const m = text.match(MATCH_RE);
  if (!m) return undefined;
  const a = cleanTrailingTeamJunk(m[1].trim());
  const b = cleanTrailingTeamJunk(m[2].trim());
  if (FAKE_TEAM_RE.test(a) || FAKE_TEAM_RE.test(b)) return undefined;
  return `${a} - ${b}`;
}

/**
 * Strip 1-3 char lowercase trailing words from a team name — they're almost
 * always OCR noise from neighboring layout, not actual team-name suffixes.
 * "AL Anwar me"   → "AL Anwar"
 * "FC Liefering"  → unchanged (last word longer than 3 chars)
 * "AC Milan"      → unchanged
 */
function cleanTrailingTeamJunk(text: string): string {
  let out = text;
  for (let i = 0; i < 3; i++) {
    const before = out;
    out = out
      .replace(/\s+[a-z]{1,3}$/, "") // "AL Anwar me" → "AL Anwar"
      .replace(/\s+\d{1,2}[.,]\d{2,3}\*?$/, "") // "Manchester City FC 1.66" → "Manchester City FC"
      .trim();
    if (out === before) break;
  }
  return out;
}

// Strip trailing weekday + date (e.g. "do 14 mei" or "do. 14 mei 2026") and
// trailing time (e.g. "20:00"). Used when checking if a line is a team name
// in a vertical (bet365) layout.
const TRAILING_DATE_RE =
  /\s+(?:ma|di|wo|do|vr|za|zo|mon|tue|wed|thu|fri|sat|sun)\.?\s+\d{1,2}\s+\w+(?:\s+\d{2,4})?\s*$/i;
const TRAILING_TIME_RE = /\s+\d{1,2}[:.h]\d{2}\s*$/;

/**
 * Strip leading OCR noise like shirt icons, bullets, copyright marks and
 * single stray lowercase letters. Only strips if the remainder begins with
 * an uppercase letter — that way legitimate prefixes (e.g. "FC Basel") are
 * never touched.
 *
 *   "o Ja 1.61"                       → "Ja 1.61"
 *   "0 Girona do 14 mei"              → "Girona do 14 mei"
 *   "1) Real Sociedad 20:00"          → "Real Sociedad 20:00"
 *   "® Real Oviedo 21:30"             → "Real Oviedo 21:30"
 *   "ÎÈ Rayo Vallecano 19:00"         → "Rayo Vallecano 19:00"
 *   "t Real Madrid do 14 mei"         → "Real Madrid do 14 mei"
 *   "| Scoort"                        → "Scoort"
 *   "1. 7044 Bradford City vs. ..."   → unchanged (next char is digit, not uppercase)
 *   "FC Basel - FC St. Gallen"        → unchanged
 */
function stripLeadingNoise(text: string): string {
  let s = text.trim();
  // 1-3 leading non-letter chars (digits, symbols, weird unicode) + whitespace,
  // only if followed by an ASCII uppercase letter.
  s = s.replace(/^[^A-Za-z\s]{1,3}\s+(?=[A-Z])/, "");
  // Single lowercase letter prefix ("o Girona", "t Real").
  s = s.replace(/^[a-z](?=\s+[A-Z])\s+/, "");
  // Single UPPERCASE letter bullet ("X Lyngby" — bet365 delete icon,
  // "O Neuchatel Xamax" — bet365 wrap bullet). Real team prefixes are
  // 2+ letters with no space ("FC Bayern"), so a single capital + space
  // + capital can be safely stripped as an OCR-hallucinated icon.
  s = s.replace(/^[A-Z](?=\s[A-Z])\s+/, "");
  // Double-x delete-icon ("xX Ja", "Xx Augsburg") — OCR sometimes reads
  // the close-X icon as two characters. Strip when followed by uppercase.
  s = s.replace(/^[xX]{2}\s+(?=[A-Z])/, "");
  return s.trim();
}

function cleanTeamCandidate(text: string): string {
  let cleaned = stripLeadingNoise(text);
  for (let i = 0; i < 3; i++) {
    const before = cleaned;
    cleaned = cleaned.replace(TRAILING_DATE_RE, "").replace(TRAILING_TIME_RE, "");
    if (cleaned === before) break;
  }
  return cleaned.trim();
}

// Words that almost never appear inside a team name. If any of these are
// present, the line is descriptive context, not a team.
const NON_TEAM_WORDS_RE =
  /\b(?:helft|totaal|aantal|over|under|doelpunt(?:en)?|goals?|score|stand|eerste|tweede|eindstand|both|teams?|score|score(?:n|d)?)\b/i;

// Detect a line that is purely a date or time (e.g. "do 14 mei", "20:00").
// We allow these to sit *between* two team-name lines in a vertical pair,
// because some bookies render the team and its kickoff on separate lines.
function isDateOrTimeOnlyLine(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^\d{1,2}[:.h]\d{2}$/.test(t)) return true;
  if (
    /^(?:(?:ma|di|wo|do|vr|za|zo|mon|tue|wed|thu|fri|sat|sun)\.?\s+)?\d{1,2}\s+(?:jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+\d{2,4})?$/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

function looksLikeTeamName(text: string): boolean {
  const cleaned = cleanTeamCandidate(text);
  if (cleaned.length < 2 || cleaned.length > 40) return false;
  if (/[€$:@]/.test(cleaned)) return false;
  if (/\d{3,}/.test(cleaned)) return false; // long digits = ID
  // First char must be any letter (Unicode-aware — handles é, ö, etc.).
  if (!/^\p{L}/u.test(cleaned)) return false;
  if (SELECTION_HINTS.some((re) => re.test(cleaned))) return false;
  if (NON_TEAM_WORDS_RE.test(cleaned)) return false;
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  if (words.length > 4) return false;
  const letters = cleaned.match(/\p{L}/gu)?.length ?? 0;
  return letters >= Math.max(2, cleaned.length * 0.5);
}

/**
 * Scan forward (then backward) for the nearest unused match. Two strategies:
 *   1. A single line matching MATCH_RE ("Team A - Team B" / "vs" / etc.)
 *   2. Two consecutive lines that each look like a team name (bet365 verticals)
 */
function findNearbyMatch(
  allLines: Line[],
  start: number,
  used: Set<number>,
): { idx: number; lastIdx: number; text: string } | undefined {
  const scan = (step: 1 | -1): { idx: number; lastIdx: number; text: string } | undefined => {
    let from = start + step;
    const lo = step === 1 ? allLines.length : -1;
    while (step === 1 ? from < lo : from > lo) {
      const ln = allLines[from];
      // Stop if we cross into another bet (an odds-bearing, non-summary row)
      if (ln && !ln.isSummary && ln.odds.length > 0) break;
      if (!ln || ln.isSummary || used.has(from)) {
        from += step;
        continue;
      }
      // Single-line match
      if (ln.hasMatch) {
        const txt = extractMatchFromLine(ln.raw);
        if (txt) return { idx: from, lastIdx: from, text: txt };
      }
      // Vertical pair: this line is team A, look ahead 1-2 positions for
      // team B. Allow an in-between date-only or time-only line (some
      // bookies render the kickoff on its own row between team A and B).
      if (looksLikeTeamName(ln.raw)) {
        for (let off = 1; off <= 2; off++) {
          const nextIdx = from + step * off;
          if (nextIdx < 0 || nextIdx >= allLines.length) break;
          const nLn = allLines[nextIdx];
          if (used.has(nextIdx)) break;
          if (nLn.isSummary) continue;
          if (nLn.odds.length > 0) break; // crossed into next bet
          if (nLn.hasMatch) break;
          if (looksLikeTeamName(nLn.raw)) {
            const a = step === 1 ? ln.raw : nLn.raw;
            const b = step === 1 ? nLn.raw : ln.raw;
            return {
              idx: Math.min(from, nextIdx),
              lastIdx: Math.max(from, nextIdx),
              text: `${cleanTeamCandidate(a)} - ${cleanTeamCandidate(b)}`,
            };
          }
          // The intermediate line is allowed only if it's purely a date/time.
          if (!isDateOrTimeOnlyLine(nLn.raw)) break;
        }
      }
      from += step;
    }
    return undefined;
  };

  // Backward first: handles Toto-paper layout where the match line is
  // *above* the selection. Falls back to forward (digital Toto / bet365).
  const strict = scan(-1) ?? scan(1);
  if (strict) return strict;

  // Loose fallback — if the strict pair scan finds nothing, try a far more
  // permissive forward scan: any two consecutive non-summary, non-odds,
  // non-selection-hint lines that contain at least one letter become a pair.
  // This catches OCR edge cases (mis-cased team names, weird unicode glyphs,
  // line breaks that confuse the strict heuristic).
  const looseScan = (step: 1 | -1) => {
    let from = start + step;
    const lo = step === 1 ? allLines.length : -1;
    while (step === 1 ? from < lo : from > lo) {
      const ln = allLines[from];
      if (ln && !ln.isSummary && ln.odds.length > 0) break;
      if (!ln || ln.isSummary || used.has(from) || ln.hasSelection) {
        from += step;
        continue;
      }
      const nextIdx = from + step;
      if (
        nextIdx >= 0 &&
        nextIdx < allLines.length &&
        !used.has(nextIdx) &&
        !allLines[nextIdx].isSummary &&
        allLines[nextIdx].odds.length === 0 &&
        !allLines[nextIdx].hasSelection &&
        /[A-Za-z]{2,}/.test(ln.raw) &&
        /[A-Za-z]{2,}/.test(allLines[nextIdx].raw)
      ) {
        const a = step === 1 ? ln.raw : allLines[nextIdx].raw;
        const b = step === 1 ? allLines[nextIdx].raw : ln.raw;
        return {
          idx: Math.min(from, nextIdx),
          lastIdx: Math.max(from, nextIdx),
          text: `${cleanTeamCandidate(a)} - ${cleanTeamCandidate(b)}`,
        };
      }
      from += step;
    }
    return undefined;
  };
  return looseScan(1) ?? looseScan(-1);
}

function gatherDescription(allLines: Line[], from: number, to: number | undefined): string | undefined {
  // `to` can be either after (forward match) or before (backward match) `from`.
  // We always walk between them in increasing order.
  const lo = to !== undefined ? Math.min(from, to) : from;
  const hi = to !== undefined ? Math.max(from, to) : Math.min(allLines.length, from + 5);
  const rawParts: string[] = [];
  for (let j = lo + 1; j < hi; j++) {
    if (j === from) continue;
    const ln = allLines[j];
    if (ln.odds.length > 0) break;
    if (ln.hasMatch || ln.isSummary) continue;
    if (looksLikeTeamName(ln.raw)) continue;
    if (ln.raw.length < 2) continue;
    const cleaned = cleanDescriptionPart(ln.raw);
    if (cleaned.length >= 2) rawParts.push(cleaned);
  }
  if (rawParts.length === 0) return undefined;
  return dedupeDescriptionParts(rawParts).join(" · ").replace(/\s+/g, " ").trim();
}

/**
 * Strip OCR garbage from bet-type description lines:
 *   "Eindresultaat [Vu] mm"   → "Eindresultaat"
 *   "Eindresultaat —_—"        → "Eindresultaat"
 *   "Eindresultaat [VU] +"     → "Eindresultaat"
 * "VU" is bet365's "Vroege Uitbetaling" badge — not meaningful info.
 */
function cleanDescriptionPart(text: string): string {
  return text
    .replace(/\[\s*[Vv][Uu]\s*\]/g, "")              // [VU] / [Vu] badges
    .replace(/(?:^|\s)[Vv][Uu](?=\s|$)/g, "")          // standalone " VU" / " vu" tokens
    .replace(/\s+m{1,3}(?=\s|$)/gi, "")               // stray "mm" OCR noise
    .replace(/[\s\-–—_+|]+$/g, "")                    // trailing punctuation
    .replace(/^[\s\-–—_+|]+/g, "")                    // leading punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Some slips (bet365 Bet Builder in particular) repeat each sub-selection as
 * a "name" line plus a "type" line — e.g.
 *
 *   "Vinicius Jr. scoort"      ← name
 *   "Scoort"                   ← bet type (single word, last word of name)
 *   "Eindresultaat: Real Madrid"
 *   "Eindresultaat"            ← bet type (single word, first word of name)
 *
 * If a single-word part contains a word that already appeared in the
 * previous part, drop it — we keep the informative name and skip the
 * one-word echo.
 */
/**
 * Strip parenthetical content that's only relevant to the bookie's internal
 * settlement rules, not to the user. Examples we want gone:
 *   "(Afgehandeld volgens Opta-gegevens)"  (Unibet)
 *   "(Settled by Opta)"                     (international bookies)
 *   "(volgens reglement van …)"
 *
 * We leave short parentheticals like "(D)" or "(KSA)" alone — they're often
 * part of the team name or selection.
 */
function stripBookieRulesParens(text: string): string {
  return text.replace(
    /\s*\([^)]*(?:afgehandeld|settled|volgens|opta|regels|rules|handled|reglement)[^)]*\)/gi,
    "",
  );
}

function cleanSelectionText(text: string): string {
  let out = stripBookieRulesParens(text);
  out = out.replace(/\s+/g, " ").trim();
  // Strip orphan colon left behind by paren removal, e.g. "Scoort of Geeft Een Assist : Ja"
  out = out.replace(/\s+:\s+/g, ": ");
  return out;
}

/**
 * Re-join lines that OCR broke across multiple rows. If a line ends with a
 * hyphen (typesetting wrap, like "Opta-\ngegevens"), the next line continues
 * directly without a space. Otherwise lines are space-joined.
 */
function joinWrappedLines(lines: string[]): string {
  let out = "";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (i === 0) {
      out = l;
    } else if (/[-—–]$/.test(out)) {
      out = out + l;
    } else {
      out = out + " " + l;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

function dedupeDescriptionParts(parts: string[]): string[] {
  const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]+/gi, "");
  const out: string[] = [];
  for (const p of parts) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 1 && out.length > 0) {
      const w = norm(words[0]);
      const prevNormalized = out[out.length - 1].split(/\s+/).map(norm);
      if (w && prevNormalized.includes(w)) continue;
    }
    out.push(trimmed);
  }
  return out;
}

/**
 * Detect bookie either from explicit branding (text contains "Toto") or from
 * layout fingerprints (unique phrases on a particular bookie's slip).
 */
function detectBookie(rawText: string): string | undefined {
  const lower = rawText.toLowerCase();

  // Explicit branding
  const explicit = [
    { needle: "toto", label: "Toto" },
    { needle: "bet365", label: "bet365" },
    { needle: "unibet", label: "Unibet" },
    { needle: "betcity", label: "BetCity" },
    { needle: "holland casino", label: "Holland Casino" },
    { needle: "bingoal", label: "Bingoal" },
    { needle: "jacks", label: "Jacks" },
    { needle: "leovegas", label: "LeoVegas" },
    { needle: "bwin", label: "Bwin" },
  ];
  for (const { needle, label } of explicit) {
    if (lower.includes(needle)) return label;
  }

  // Layout fingerprints
  const totoPaperHits = [
    /nr\.\s*wedstrijd/i,
    /speeldatum/i,
    /bet\s*systeem/i,
    /\bp\.\s*winbedrag\b/i,
    /\bbonnr\b/i,
    /\bweddenschap\b/i,
  ].filter((re) => re.test(rawText)).length;
  if (totoPaperHits >= 2) return "Toto";

  const bet365Hits = [
    /bet\s*builder/i,
    /selecties\s*opnieuw/i,
    /vroege\s*uitbetaling/i,
    /cash\s*out/i,
    /wissel\+/i,
  ].filter((re) => re.test(rawText)).length;
  if (bet365Hits >= 2) return "bet365";

  const unibetHits = [
    /coupon[-\s]?id/i,
    /(?:enkelvoudig|drievoudig|viervoudig|vijfvoudig|zesvoudig|zevenvoudig|achtvoudig|negenvoudig|tienvoudig)/i,
    /\brust:/i,
    /draw\s*no\s*bet/i,
    /geeft\s*een\s*assist/i,
  ].filter((re) => re.test(rawText)).length;
  if (unibetHits >= 2) return "Unibet";

  return undefined;
}

export function parseBetText(rawText: string): ParsedBetText {
  const allLines = rawText
    .split(/\r?\n/)
    .map(classifyLine)
    .filter((l) => l.raw.length > 0);

  if (allLines.length === 0) {
    return { selections: [], isAccumulator: false, confidence: "low" };
  }

  const selections: ParsedSelection[] = [];
  const usedMatchIdx = new Set<number>();
  let comboHint: number | undefined;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];

    if (line.combinedOddsHint) {
      const oddsValues = line.odds.map((o) => o.value);
      comboHint = Math.max(comboHint ?? 0, ...oddsValues, line.combinedOddsHint);
    }

    if (line.isSummary) continue;
    if (line.odds.length === 0) continue;

    for (const oddsHit of line.odds) {
      let selectionText = line.raw.substring(0, oddsHit.pos);
      selectionText = selectionText.replace(/[\s@:•·\-—–○]+$/, "").trim();

      // Wrap detection (bet365 Dubbele Kans / Draw Or): if the selection
      // ends with a connector word like "of" / "en" / "and" / "or", the
      // visual selection wrapped onto the next line. E.g.
      //   "Gelijkspel of           1.40"
      //   "Egersunds"
      // OCR puts them on separate rows; without this fixup we'd lose the
      // second word and end up pairing "Gelijkspel of" with just the
      // description.
      if (/\b(?:of|en|and|or)\s*$/i.test(selectionText) && i + 1 < allLines.length) {
        const next = allLines[i + 1];
        if (
          next &&
          !next.isSummary &&
          next.odds.length === 0 &&
          !next.hasMatch &&
          !next.hasSelection &&
          next.raw.length > 0 &&
          next.raw.length < 40
        ) {
          // Trim trailing OCR junk from the wrap continuation —
          // bet365's pill borders sometimes get read as dashes / "mm" / etc.
          const wrapCont = next.raw
            .trim()
            .replace(/\s+[-–—_]+\s*$/, "")        // trailing dash
            .replace(/\s+m{1,3}\s*$/i, "")        // trailing "mm" OCR noise
            .replace(/[-–—_]+$/, "")               // bare trailing dash
            .trim();
          selectionText = `${selectionText} ${wrapCont}`.replace(/\s+/g, " ").trim();
          // Mark line consumed so findNearbyMatch skips it.
          usedMatchIdx.add(i + 1);
        }
      }

      // Wrapped match across two OCR lines (Toto digital with long fixture names):
      //   "Stade Lausanne Ouchy -   1.39"     ← team A + dash + odds
      //   "O Neuchatel Xamax"                  ← team B (with optional bullet)
      //   "U Ja"                               ← real selection
      //   "Beide teams scoren"                 ← bet type
      // The trailing dash before the odds is the signal: it indicates the
      // match name didn't fit on one line.
      let wrappedMatch: { idx: number; text: string } | undefined;
      const preStripBeforeOdds = line.raw.substring(0, oddsHit.pos);
      if (
        !line.hasMatch &&
        /[-–—]\s*$/.test(preStripBeforeOdds) &&
        i + 1 < allLines.length
      ) {
        const next = allLines[i + 1];
        if (
          next &&
          !next.isSummary &&
          next.odds.length === 0 &&
          !next.hasMatch &&
          !next.hasSelection &&
          next.raw.length > 0 &&
          next.raw.length < 60
        ) {
          // Strip a stray single-letter bullet (OCR hallucinated icon) at
          // the start: "O Neuchatel Xamax" → "Neuchatel Xamax".
          // Only single letter + single space + another capital letter — that
          // pattern never appears in real team names ("FC", "AC", "AL" all
          // have two letters before the space).
          const rawNext = next.raw.replace(/^[A-Za-z](?=\s[A-Z])\s+/, "");
          const teamB = cleanTeamCandidate(rawNext).trim();
          if (teamB.length >= 2 && /^\p{L}/u.test(teamB)) {
            wrappedMatch = { idx: i + 1, text: `${selectionText} - ${teamB}` };
            usedMatchIdx.add(i + 1);
          }
        }
      }

      // Special-case: Toto Spelformulier layout puts the match and the odds
      // on the SAME line, with the selection on lines below. e.g.:
      //   "Chelsea - Manchester City FC 1.66"   ← odds line + hasMatch
      //   "Manchester City FC"                  ← the team picked
      //   "Resultaat"                           ← bet type
      // In that case the "selectionText" we just extracted IS the match —
      // look below for the real selection content.
      let matched: { idx: number; lastIdx: number; text: string } | undefined;
      if (wrappedMatch) {
        matched = { idx: i, lastIdx: wrappedMatch.idx, text: wrappedMatch.text };
        // Look BELOW the wrap continuation for the real selection content
        // (mirrors Toto Spelformulier logic but starts after the wrap line).
        const realSelParts: string[] = [];
        for (let k = wrappedMatch.idx + 1; k < allLines.length && k <= wrappedMatch.idx + 4; k++) {
          const next = allLines[k];
          if (next.isSummary) continue;
          if (next.odds.length > 0 || next.hasMatch) break;
          if (next.raw.length < 2) continue;
          realSelParts.push(next.raw);
        }
        if (realSelParts.length > 0) {
          selectionText = realSelParts.join(" — ").trim();
        }
      } else if (line.hasMatch) {
        const inlineMatchText = extractMatchFromLine(line.raw);
        if (inlineMatchText) {
          matched = { idx: i, lastIdx: i, text: inlineMatchText };
          if (
            selectionText === inlineMatchText ||
            cleanTrailingTeamJunk(selectionText) === cleanTrailingTeamJunk(inlineMatchText)
          ) {
            const realSelParts: string[] = [];
            for (let k = i + 1; k < allLines.length && k <= i + 4; k++) {
              const next = allLines[k];
              if (next.isSummary) continue;
              if (next.odds.length > 0 || next.hasMatch) break;
              if (next.raw.length < 2) continue;
              realSelParts.push(next.raw);
            }
            if (realSelParts.length > 0) {
              selectionText = realSelParts.join(" — ").trim();
            }
          }
        }
      }

      if (!matched) {
        matched = findNearbyMatch(allLines, i, usedMatchIdx);
      }
      const description = matched ? gatherDescription(allLines, i, matched.idx) : undefined;

      let competition: string | undefined;
      const compWindow = [i - 3, i - 2, i - 1, i, i + 1, i + 2, i + 3, i + 4];
      for (const j of compWindow) {
        if (j < 0 || j >= allLines.length) continue;
        const text = allLines[j].raw.toLowerCase();
        const hit = COMPETITION_HINTS.find((c) => text.includes(c.toLowerCase()));
        if (hit) {
          competition = hit;
          break;
        }
      }

      if (matched) {
        usedMatchIdx.add(matched.idx);
        if (matched.lastIdx !== matched.idx) usedMatchIdx.add(matched.lastIdx);
      }

      const finalSelection = description
        ? `${selectionText} — ${description}`
        : selectionText || "(onbekend)";

      selections.push({
        match: matched?.text ?? "(onbekend)",
        competition,
        selection: cleanSelectionText(finalSelection),
        odds: +oddsHit.value.toFixed(3),
      });
    }
  }

  // ---- Fallback pass for slips with NO per-leg odds (e.g. Unibet) ----
  //
  // Some bookies (notably Unibet) only show the total odds at the bottom,
  // with each leg listed as <selection-text> on one line and <match> on the
  // next. If our main pass found nothing but we *do* have a combinedOddsHint
  // and several selection-then-match pairs, fall back to pair-based parsing
  // and distribute the total odds geometrically across the legs (so their
  // product roughly equals the displayed total).
  //
  // We also handle wrapped selection text: when the slip's text was wider
  // than a single OCR line, Tesseract breaks it across two rows (often with
  // a trailing hyphen like "Opta-\ngegevens"). We merge those continuations
  // before pairing with the match line.
  if (selections.length === 0 && comboHint && comboHint > 1) {
    const pairs: { selIndices: number[]; matchIdx: number }[] = [];

    let i = 0;
    while (i < allLines.length) {
      const ln = allLines[i];
      if (ln.isSummary || ln.odds.length > 0 || !ln.hasSelection) {
        i++;
        continue;
      }

      const selIndices: number[] = [i];
      let j = i + 1;

      // Gather wrapped continuation lines.
      while (j < allLines.length) {
        const next = allLines[j];
        if (next.isSummary || next.odds.length > 0) break;
        const prev = allLines[selIndices[selIndices.length - 1]];
        const prevEndsHyphenated = /[-—–]\s*$/.test(prev.raw);
        const continuation =
          prevEndsHyphenated || (next.hasSelection && !next.hasMatch);
        if (!continuation) break;
        selIndices.push(j);
        j++;
      }

      // Find the match line after the selection group.
      let matchIdx: number | undefined;
      for (let k = j; k < allLines.length && k <= j + 3; k++) {
        const cand = allLines[k];
        if (cand.isSummary) continue;
        if (cand.odds.length > 0) break;
        if (cand.hasMatch) {
          matchIdx = k;
          break;
        }
      }

      if (matchIdx !== undefined) {
        pairs.push({ selIndices, matchIdx });
        i = matchIdx + 1;
      } else {
        i = j;
      }
    }

    if (pairs.length >= 2) {
      const perLegOdds = +Math.pow(comboHint, 1 / pairs.length).toFixed(3);
      for (const pair of pairs) {
        const selectionText = joinWrappedLines(
          pair.selIndices.map((idx) => allLines[idx].raw),
        );
        const matchLine = allLines[pair.matchIdx];
        const matchText = extractMatchFromLine(matchLine.raw) ?? matchLine.raw;
        selections.push({
          match: matchText,
          selection: cleanSelectionText(selectionText),
          odds: perLegOdds,
        });
      }
    }
  }

  // Phantom-leg pass (bet365 OCR omission): when Tesseract drops the
  // "selection-name + odds" line on some legs but keeps the "bet-type"
  // line and the match line, we still have enough to identify the leg —
  // we just don't know the odds. Add them with odds=0 so the user is
  // prompted to fill them in manually instead of losing those legs.
  for (let i = 0; i < allLines.length; i++) {
    if (usedMatchIdx.has(i)) continue;
    const sel = allLines[i];
    if (sel.isSummary) continue;
    if (sel.odds.length > 0) continue;
    if (!sel.hasSelection) continue;
    // Look 1-3 lines ahead for an unused match line; don't cross into
    // another leg's odds row.
    for (let j = i + 1; j < allLines.length && j <= i + 3; j++) {
      const next = allLines[j];
      if (next.isSummary) continue;
      if (next.odds.length > 0) break;
      if (usedMatchIdx.has(j)) continue;
      if (!next.hasMatch) {
        if (looksLikeTeamName(next.raw)) continue;
        continue;
      }
      const matchText = extractMatchFromLine(next.raw) ?? next.raw;
      // Build a friendlier selection label: include the bet-type AND a hint
      // that the user needs to pick the actual team. We don't know which
      // team they picked (OCR dropped that info), but at least the bet-type
      // is still informative.
      const betType = sel.raw.trim();
      const selectionLabel = `${betType} — (kies)`;
      selections.push({
        match: matchText,
        selection: selectionLabel,
        odds: 0, // placeholder — user fills in
      });
      usedMatchIdx.add(i);
      usedMatchIdx.add(j);
      break;
    }
  }

  // Accumulator detection
  let isAccumulator = false;
  let combinedOdds: number | undefined;
  if (selections.length > 1) {
    isAccumulator = true;
    const product = +selections.reduce((acc, s) => acc * s.odds, 1).toFixed(3);
    combinedOdds = product;
    if (comboHint && Math.abs(product - comboHint) / Math.max(comboHint, 0.01) < 0.05) {
      combinedOdds = comboHint;
    }
  } else if (selections.length === 1) {
    combinedOdds = selections[0].odds;
  }

  const bookie = detectBookie(rawText);

  const total = selections.length;
  const goodMatches = selections.filter((s) => !s.match.startsWith("(onbekend")).length;
  const goodSelections = selections.filter((s) => !s.selection.startsWith("(onbekend")).length;

  let confidence: "high" | "medium" | "low";
  if (total === 0) confidence = "low";
  else if (goodMatches === total && goodSelections === total) confidence = "high";
  else if (goodMatches >= total - 1 && goodSelections >= total - 1) confidence = "medium";
  else confidence = "low";

  // Force low confidence if any leg has placeholder odds (phantom-leg pass),
  // so the form shows a warning to fill them in.
  if (selections.some((s) => s.odds === 0)) confidence = "low";

  return {
    selections,
    isAccumulator,
    combinedOdds,
    bookie,
    confidence,
  };
}
