// Bet categorization — infer the kind of bet from the selection text and
// aggregate across legs. Used to display a category badge on each bet card
// and to filter the Open Bets feed by category.
//
// Display-only: we compute these on the fly from `Selection.selection`
// rather than storing a separate column. That keeps the schema simple and
// means we can refine the classifier without a migration.

import type { Bet } from "./types";

export type LegCategory =
  | "btts"
  | "resultaat"
  | "overUnder"
  | "firstHalfGoals"
  | "secondHalfGoals"
  | "handicap"
  | "correctScore"
  | "scorer"
  | "halftime"
  | "doubleChance"
  | "drawNoBet"
  | "other";

export type BetCategory = LegCategory | "mix";

// Reusable sub-patterns
const OVER_UNDER_HINT =
  /\bover\s*\d|\bunder\s*\d|\bmeer\s*dan\b|\bminder\s*dan\b|doelpuntentotaal|totaal\s*aantal\s*doelpunten|aantal\s*goals|aantal\s*doelpunten|goal(?:s)?\b/i;
const FIRST_HALF =
  /\b(?:eerste|1[e]?(?:ste)?|1st)\s*helft\b|\bfirst\s*half\b/i;
const SECOND_HALF =
  /\b(?:tweede|2[e]?(?:de)?|2nd)\s*helft\b|\bsecond\s*half\b/i;

// Order matters — more specific patterns first.
const PATTERNS: { cat: LegCategory; test: (text: string) => boolean }[] = [
  // Half-specific over/under (must beat the generic overUnder + halftime patterns)
  {
    cat: "firstHalfGoals",
    test: (t) => FIRST_HALF.test(t) && OVER_UNDER_HINT.test(t),
  },
  {
    cat: "secondHalfGoals",
    test: (t) => SECOND_HALF.test(t) && OVER_UNDER_HINT.test(t),
  },
  { cat: "btts", test: (t) => /beide\s*teams?\s*scor|\bbtts\b|both\s*teams\s*to\s*score/i.test(t) },
  { cat: "overUnder", test: (t) => OVER_UNDER_HINT.test(t) },
  { cat: "correctScore", test: (t) => /correct\s*score|juiste\s*uitslag/i.test(t) },
  // Halftime *winner* (Rust: …) — distinct from half-specific goals which are above.
  { cat: "halftime", test: (t) => /\brust\b|\bhalftime\b|halve\s*tijd/i.test(t) },
  { cat: "scorer", test: (t) => /\bscoort\b|geeft\s*een\s*assist|to\s*score|first\s*scorer|laatste\s*scorer/i.test(t) },
  { cat: "handicap", test: (t) => /handicap|asian\s*handicap/i.test(t) },
  { cat: "doubleChance", test: (t) => /dubbele\s*kans|double\s*chance/i.test(t) },
  { cat: "drawNoBet", test: (t) => /draw\s*no\s*bet/i.test(t) },
  // Resultaat / 1X2 — last because the word can leak into other categories
  { cat: "resultaat", test: (t) => /\b(eind)?resultaat\b|\b1\s*x\s*2\b|wint|win\b|gelijk(spel)?|draw\b/i.test(t) },
];

export function inferLegCategory(selectionText: string): LegCategory {
  // Backwards-compatible: returns the first / most-specific match. For new
  // code prefer inferLegCategoriesAll() which returns all matches so combo
  // legs (BTTS+Resultaat, etc.) can be detected.
  for (const { cat, test } of PATTERNS) {
    if (test(selectionText)) return cat;
  }
  return "other";
}

/** Return EVERY category a leg's selection text matches. Used by
 * computeBetCategory so a single combo leg (e.g. "Wint en Beide teams
 * scoren") contributes both "resultaat" and "btts" to the bet's category
 * union — which forces mix detection when expected. */
export function inferLegCategoriesAll(selectionText: string): Set<LegCategory> {
  const out = new Set<LegCategory>();
  for (const { cat, test } of PATTERNS) {
    if (test(selectionText)) out.add(cat);
  }
  if (out.size === 0) out.add("other");
  return out;
}

/**
 * Compute the bet's overall category by looking at every leg:
 * - 1 leg → that leg's category
 * - All legs same category → that category
 * - Mixed → "mix"
 */
export function computeBetCategory(bet: Pick<Bet, "selections" | "category">): BetCategory {
  // Manual override: stored category wins over auto-detect. We validate it's
  // one of the known categories so a stray DB value can't crash the UI.
  if (bet.category) {
    const all: BetCategory[] = [...CATEGORY_FILTER_ORDER, "other"];
    if ((all as string[]).includes(bet.category)) {
      return bet.category as BetCategory;
    }
  }
  if (bet.selections.length === 0) return "other";
  // Aggregate ALL matches per leg, so a combo leg contributes multiple
  // categories to the union (forces mix when warranted).
  const cats = new Set<LegCategory>();
  for (const sel of bet.selections) {
    for (const c of inferLegCategoriesAll(sel.selection)) cats.add(c);
  }
  if (cats.size === 0) return "other";
  // "other" only matters when it's the ONLY thing present. If at least one
  // meaningful category was detected, drop "other" — unclassified legs
  // shouldn't count.
  cats.delete("other");
  if (cats.size === 0) return "other";
  if (cats.size === 1) return [...cats][0];
  return "mix";
}

/** Ordered list of categories used for filter chips. */
export const CATEGORY_FILTER_ORDER: BetCategory[] = [
  "btts",
  "resultaat",
  "overUnder",
  "firstHalfGoals",
  "secondHalfGoals",
  "mix",
  "doubleChance",
  "handicap",
  "correctScore",
  "scorer",
  "halftime",
  "drawNoBet",
];
