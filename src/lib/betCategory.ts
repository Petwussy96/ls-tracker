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
  for (const { cat, test } of PATTERNS) {
    if (test(selectionText)) return cat;
  }
  return "other";
}

/**
 * Compute the bet's overall category by looking at every leg:
 * - 1 leg → that leg's category
 * - All legs same category → that category
 * - Mixed → "mix"
 */
export function computeBetCategory(bet: Pick<Bet, "selections">): BetCategory {
  if (bet.selections.length === 0) return "other";
  const cats = new Set<LegCategory>();
  for (const sel of bet.selections) {
    cats.add(inferLegCategory(sel.selection));
  }
  if (cats.size === 1) {
    return [...cats][0];
  }
  // If "other" is among them but the rest are the same, prefer the meaningful one.
  cats.delete("other");
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
  "scorer",
  "handicap",
  "halftime",
  "correctScore",
  "doubleChance",
  "drawNoBet",
  "other",
];
