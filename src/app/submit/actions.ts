"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { BetType } from "@/lib/types";

export type SubmitSelectionInput = {
  match: string;
  competition?: string;
  selection: string;
  odds: number;
};

export type SubmitBetInput = {
  selections: SubmitSelectionInput[];
  /**
   * For a single-leg bet, this is the user-chosen bet type (btts, 1x2, etc.).
   * For multi-leg, this is ignored — the server sets type="accumulator".
   */
  betType: BetType;
  kickoff: string; // ISO datetime-local string (treated as local time)
  notes?: string;
};

export type SubmitBetResult =
  | { ok: true; betId: string }
  | { ok: false; error: string };

const ALLOWED_TYPES: BetType[] = [
  "btts",
  "1x2",
  "overUnder",
  "handicap",
  "correctScore",
  "accumulator",
  "other",
];

export async function submitBet(input: SubmitBetInput): Promise<SubmitBetResult> {
  // ---- Auth ----
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "not_authenticated" };
  }

  // ---- Validation ----
  if (!Array.isArray(input.selections) || input.selections.length === 0) {
    return { ok: false, error: "No selections provided." };
  }
  if (input.selections.length > 20) {
    return { ok: false, error: "Too many legs (max 20)." };
  }

  for (const [i, sel] of input.selections.entries()) {
    if (!sel.match || sel.match.trim().length < 3) {
      return { ok: false, error: `Leg ${i + 1}: match is too short.` };
    }
    if (!sel.selection || sel.selection.trim().length < 1) {
      return { ok: false, error: `Leg ${i + 1}: selection is empty.` };
    }
    if (!Number.isFinite(sel.odds) || sel.odds <= 1) {
      return { ok: false, error: `Leg ${i + 1}: odds must be greater than 1.` };
    }
  }

  if (!ALLOWED_TYPES.includes(input.betType)) {
    return { ok: false, error: "Unknown bet type." };
  }

  const kickoffDate = new Date(input.kickoff);
  if (isNaN(kickoffDate.getTime())) {
    return { ok: false, error: "Invalid kickoff date." };
  }

  // Multi-leg → force type to accumulator
  const finalType: BetType = input.selections.length > 1 ? "accumulator" : input.betType;
  const combinedOdds = +input.selections
    .reduce((acc, s) => acc * s.odds, 1)
    .toFixed(2);

  const userId = session.user.id;
  const username = session.user.username;

  const bet = await prisma.bet.create({
    data: {
      userId,
      type: finalType,
      combinedOdds,
      status: "open",
      kickoff: kickoffDate,
      notes: input.notes?.trim() || null,
      selections: {
        create: input.selections.map((s, i) => ({
          match: s.match.trim(),
          competition: s.competition?.trim() || null,
          selection: s.selection.trim(),
          odds: s.odds,
          position: i,
        })),
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/bets");
  if (username) revalidatePath(`/profile/${username}`);

  return { ok: true, betId: bet.id };
}
