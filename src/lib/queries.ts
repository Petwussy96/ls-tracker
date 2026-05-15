// Server-side query helpers. These run in Server Components and Server Actions.
// They normalize Prisma rows into our domain types (lib/types.ts).

import "server-only";
import { prisma } from "./db";
import type { Bet, BetSelection, BetStatus, BetType, User } from "./types";

function rowToUser(u: {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  image: string | null;
  avatar: string | null;
  role: string;
  joinedAt: Date;
}): User {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email ?? undefined,
    image: u.image ?? undefined,
    avatar: u.avatar ?? undefined,
    role: (u.role as "member" | "admin") ?? "member",
    joinedAt: u.joinedAt.toISOString(),
  };
}

function rowToBet(b: {
  id: string;
  userId: string;
  type: string;
  combinedOdds: number;
  status: string;
  kickoff: Date;
  placedAt: Date;
  resolvedAt: Date | null;
  notes: string | null;
  category?: string | null;
  selections: Array<{
    match: string;
    competition: string | null;
    selection: string;
    odds: number;
    position: number;
  }>;
}): Bet {
  const selections: BetSelection[] = [...b.selections]
    .sort((a, z) => a.position - z.position)
    .map((s) => ({
      match: s.match,
      competition: s.competition ?? undefined,
      selection: s.selection,
      odds: s.odds,
    }));

  return {
    id: b.id,
    userId: b.userId,
    type: b.type as BetType,
    selections,
    combinedOdds: b.combinedOdds,
    status: b.status as BetStatus,
    kickoff: b.kickoff.toISOString(),
    placedAt: b.placedAt.toISOString(),
    resolvedAt: b.resolvedAt?.toISOString(),
    notes: b.notes ?? undefined,
    category: b.category ?? undefined,
  };
}

export async function getAllUsers(): Promise<User[]> {
  const rows = await prisma.user.findMany({ orderBy: { joinedAt: "asc" } });
  return rows.map(rowToUser);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const row = await prisma.user.findFirst({
    where: { username: { equals: username } },
  });
  return row ? rowToUser(row) : null;
}

export async function getAllBets(): Promise<Bet[]> {
  const rows = await prisma.bet.findMany({
    include: { selections: true },
    orderBy: { placedAt: "desc" },
  });
  return rows.map(rowToBet);
}

export async function getBetsForUser(userId: string): Promise<Bet[]> {
  const rows = await prisma.bet.findMany({
    where: { userId },
    include: { selections: true },
    orderBy: { placedAt: "desc" },
  });
  return rows.map(rowToBet);
}

// Convenience: everything needed to render the leaderboard in one round-trip.
export async function getLeaderboardData(): Promise<{ users: User[]; bets: Bet[] }> {
  const [users, bets] = await Promise.all([getAllUsers(), getAllBets()]);
  return { users, bets };
}
