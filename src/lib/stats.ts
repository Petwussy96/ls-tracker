import type { Bet, User } from "./types";

export interface UserStats {
  user: User;
  totalBets: number;
  openBets: number;
  settledBets: number; // wins + losses (void excluded)
  wins: number;
  losses: number;
  voids: number;
  winRate: number; // 0..1, over settled bets
  currentStreak: number; // positive = win streak, negative = loss streak
  longestWinStreak: number;
  longestLossStreak: number;
  averageOdds: number; // mean combined odds on settled bets
  highestOddsWon: number; // highest combined odds on a won bet
}

const EMPTY: Omit<UserStats, "user"> = {
  totalBets: 0,
  openBets: 0,
  settledBets: 0,
  wins: 0,
  losses: 0,
  voids: 0,
  winRate: 0,
  currentStreak: 0,
  longestWinStreak: 0,
  longestLossStreak: 0,
  averageOdds: 0,
  highestOddsWon: 0,
};

export function computeUserStats(user: User, bets: Bet[]): UserStats {
  const userBets = bets.filter((b) => b.userId === user.id);
  if (userBets.length === 0) return { user, ...EMPTY };

  const open = userBets.filter((b) => b.status === "open");
  const wins = userBets.filter((b) => b.status === "won");
  const losses = userBets.filter((b) => b.status === "lost");
  const voids = userBets.filter((b) => b.status === "void");
  const settled = [...wins, ...losses];

  const winRate = settled.length === 0 ? 0 : wins.length / settled.length;
  const averageOdds =
    settled.length === 0
      ? 0
      : settled.reduce((s, b) => s + b.combinedOdds, 0) / settled.length;
  const highestOddsWon = wins.reduce((max, b) => Math.max(max, b.combinedOdds), 0);

  // Streaks — walk settled bets in chronological order
  const chronological = [...settled].sort(
    (a, b) =>
      new Date(a.resolvedAt ?? a.kickoff).getTime() -
      new Date(b.resolvedAt ?? b.kickoff).getTime(),
  );

  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let runningWin = 0;
  let runningLoss = 0;
  for (const b of chronological) {
    if (b.status === "won") {
      runningWin += 1;
      runningLoss = 0;
      longestWinStreak = Math.max(longestWinStreak, runningWin);
    } else {
      runningLoss += 1;
      runningWin = 0;
      longestLossStreak = Math.max(longestLossStreak, runningLoss);
    }
  }

  // Current streak — count back from most recent settled bet
  let currentStreak = 0;
  for (let i = chronological.length - 1; i >= 0; i--) {
    const b = chronological[i];
    if (currentStreak === 0) {
      currentStreak = b.status === "won" ? 1 : -1;
      continue;
    }
    if (currentStreak > 0 && b.status === "won") currentStreak += 1;
    else if (currentStreak < 0 && b.status === "lost") currentStreak -= 1;
    else break;
  }

  return {
    user,
    totalBets: userBets.length,
    openBets: open.length,
    settledBets: settled.length,
    wins: wins.length,
    losses: losses.length,
    voids: voids.length,
    winRate,
    currentStreak,
    longestWinStreak,
    longestLossStreak,
    averageOdds,
    highestOddsWon,
  };
}

/**
 * Leaderboard ordering:
 *   1) Win rate (higher better)
 *   2) Settled bets (more is more credible — breaks ties in favor of volume)
 *   3) Current streak (positive ahead of negative)
 *
 * Users with zero settled bets sink to the bottom but still appear.
 */
export function rankUsers(users: User[], bets: Bet[]): UserStats[] {
  return users
    .map((u) => computeUserStats(u, bets))
    .sort((a, b) => {
      if (a.settledBets === 0 && b.settledBets > 0) return 1;
      if (b.settledBets === 0 && a.settledBets > 0) return -1;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.settledBets !== a.settledBets) return b.settledBets - a.settledBets;
      return b.currentStreak - a.currentStreak;
    });
}
