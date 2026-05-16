// Derived achievements — computed on-the-fly from a user's bets. Nothing
// stored in the DB. New users get them automatically when their stats
// catch up.
//
// Each achievement has a "tier" so the UI can color them: bronze (easy),
// silver (medium), gold (hard), legendary (rare). Order in catalog =
// approximate progression for display.

import type { Bet } from "./types";
import { inferLegCategory } from "./betCategory";

export type AchievementTier = "bronze" | "silver" | "gold" | "legendary";

export type Achievement = {
  id: string;
  emoji: string;
  titleNl: string;
  titleEn: string;
  descNl: string;
  descEn: string;
  tier: AchievementTier;
};

const ALL: Achievement[] = [
  // Volume milestones
  {
    id: "first_strike",
    emoji: "🎯",
    titleNl: "Eerste schot",
    titleEn: "First Strike",
    descNl: "Plaats je allereerste bet.",
    descEn: "Place your very first bet.",
    tier: "bronze",
  },
  {
    id: "first_win",
    emoji: "🥇",
    titleNl: "Eerste winst",
    titleEn: "First Win",
    descNl: "Win je eerste bet.",
    descEn: "Win your first bet.",
    tier: "bronze",
  },
  {
    id: "decade",
    emoji: "🔟",
    titleNl: "Tien op de teller",
    titleEn: "Decade",
    descNl: "Plaats 10 afgehandelde bets.",
    descEn: "Settle 10 bets.",
    tier: "silver",
  },
  {
    id: "centurion",
    emoji: "💯",
    titleNl: "Centurion",
    titleEn: "Centurion",
    descNl: "Plaats 100 afgehandelde bets.",
    descEn: "Settle 100 bets.",
    tier: "gold",
  },
  // Streak milestones
  {
    id: "hot_hand",
    emoji: "🔥",
    titleNl: "Hot Hand",
    titleEn: "Hot Hand",
    descNl: "Win 5 bets op rij.",
    descEn: "Win 5 bets in a row.",
    tier: "silver",
  },
  {
    id: "legendary",
    emoji: "⚡",
    titleNl: "Legendarisch",
    titleEn: "Legendary",
    descNl: "Win 8 bets op rij.",
    descEn: "Win 8 bets in a row.",
    tier: "legendary",
  },
  // Odds milestones
  {
    id: "big_cashout",
    emoji: "🎰",
    titleNl: "Grote uitbetaling",
    titleEn: "Big Cashout",
    descNl: "Win een bet met quotering > 10.",
    descEn: "Win a bet with odds over 10.",
    tier: "silver",
  },
  {
    id: "mountain",
    emoji: "🏔️",
    titleNl: "Bergstreak",
    titleEn: "Mountain",
    descNl: "Win een bet met quotering > 25.",
    descEn: "Win a bet with odds over 25.",
    tier: "gold",
  },
  {
    id: "unicorn",
    emoji: "🦄",
    titleNl: "Unicorn",
    titleEn: "Unicorn",
    descNl: "Win een bet met quotering > 50.",
    descEn: "Win a bet with odds over 50.",
    tier: "legendary",
  },
  // Combi milestones
  {
    id: "all_in",
    emoji: "🎲",
    titleNl: "All In",
    titleEn: "All In",
    descNl: "Plaats een combi van 7+ benen.",
    descEn: "Place a 7+ leg combi.",
    tier: "bronze",
  },
  {
    id: "stacked",
    emoji: "🏗️",
    titleNl: "Gestapeld",
    titleEn: "Stacked",
    descNl: "Win een combi van 5+ benen.",
    descEn: "Win a 5+ leg combi.",
    tier: "gold",
  },
  // Category specialist
  {
    id: "btts_specialist",
    emoji: "⚽",
    titleNl: "BTTS Specialist",
    titleEn: "BTTS Specialist",
    descNl: "Win 10 BTTS-bets.",
    descEn: "Win 10 BTTS bets.",
    tier: "silver",
  },
  // Engagement
  {
    id: "lucky_sevens",
    emoji: "🍀",
    titleNl: "Geluksgetal 7",
    titleEn: "Lucky Sevens",
    descNl: "Win 7 bets in totaal.",
    descEn: "Win 7 bets total.",
    tier: "bronze",
  },
];

export function getAchievementCatalog(): readonly Achievement[] {
  return ALL;
}

/** Compute which achievements a user has earned, given their full bet list. */
export function computeEarnedAchievements(bets: Bet[]): Achievement[] {
  const settled = bets.filter((b) => b.status === "won" || b.status === "lost");
  const wins = bets.filter((b) => b.status === "won");
  const totalBets = bets.length;
  const totalWins = wins.length;

  // Longest current/historical win streak (ordered by resolvedAt or kickoff)
  const ordered = settled
    .slice()
    .sort(
      (a, b) =>
        new Date(a.resolvedAt ?? a.kickoff).getTime() -
        new Date(b.resolvedAt ?? b.kickoff).getTime(),
    );
  let longestStreak = 0;
  let cur = 0;
  for (const b of ordered) {
    if (b.status === "won") {
      cur += 1;
      if (cur > longestStreak) longestStreak = cur;
    } else {
      cur = 0;
    }
  }

  const maxOddsWon = wins.reduce((m, b) => Math.max(m, b.combinedOdds), 0);
  const maxLegsAny = bets.reduce((m, b) => Math.max(m, b.selections.length), 0);
  const maxLegsWon = wins.reduce((m, b) => Math.max(m, b.selections.length), 0);

  // Count BTTS wins (every leg is BTTS)
  const bttsWins = wins.filter((b) =>
    b.selections.every((s) => inferLegCategory(s.selection) === "btts"),
  ).length;

  const earned = new Set<string>();
  if (totalBets >= 1) earned.add("first_strike");
  if (totalWins >= 1) earned.add("first_win");
  if (settled.length >= 10) earned.add("decade");
  if (settled.length >= 100) earned.add("centurion");
  if (longestStreak >= 5) earned.add("hot_hand");
  if (longestStreak >= 8) earned.add("legendary");
  if (maxOddsWon > 10) earned.add("big_cashout");
  if (maxOddsWon > 25) earned.add("mountain");
  if (maxOddsWon > 50) earned.add("unicorn");
  if (maxLegsAny >= 7) earned.add("all_in");
  if (maxLegsWon >= 5) earned.add("stacked");
  if (bttsWins >= 10) earned.add("btts_specialist");
  if (totalWins >= 7) earned.add("lucky_sevens");

  return ALL.filter((a) => earned.has(a.id));
}
