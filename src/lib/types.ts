// Core data model for LS Tracker.
// Mirrors what we'll later store in the database.
//
// Stake and profit are intentionally NOT tracked: the group wanted to keep
// money out of the picture so no one feels judged about bet size. We track
// outcomes (open / won / lost / void) and odds for context.

export type BetStatus = "open" | "won" | "lost" | "void";

export type BetType =
  | "btts"
  | "1x2"
  | "overUnder"
  | "handicap"
  | "correctScore"
  | "accumulator"
  | "other";

export type UserRole = "member" | "moderator" | "admin";

export interface User {
  id: string;
  username: string; // matches their FB display name / group alias
  displayName: string;
  email?: string;
  image?: string;
  avatar?: string;
  role: UserRole;
  joinedAt: string; // ISO date
}

export interface BetSelection {
  match: string; // "FK Septemvri Sofia - Spartak Varna"
  competition?: string; // "Bulgarian First League"
  selection: string; // "Beide teams scoren - Ja"
  odds: number;
}

export interface Bet {
  id: string;
  userId: string;
  type: BetType;
  selections: BetSelection[]; // 1 entry for single, >1 for accumulator
  combinedOdds: number; // product of selections.odds — kept as context, not money
  status: BetStatus;
  kickoff: string; // ISO datetime
  placedAt: string; // ISO datetime
  resolvedAt?: string; // ISO datetime
  notes?: string;
}
