"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export type UpdateBetInput = {
  betId: string;
  notes?: string | null;
  kickoff?: string; // ISO datetime
  selections: {
    /** When present, update existing Selection by id; otherwise create new. */
    id?: string;
    match: string;
    selection: string;
    odds: number;
  }[];
};

export type UpdateBetResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_authorized"
        | "not_found"
        | "validation";
      detail?: string;
    };

/**
 * Edit an existing bet. Owners can edit their own bet; admins + moderators
 * can edit any bet. We rewrite the selections wholesale (delete + create)
 * to keep the action simple — selections are owned 1:1 by the bet, so this
 * is safe and avoids dealing with partial updates / orphan rows.
 *
 * combinedOdds is recomputed from the new selections.odds product so it
 * always stays consistent with what's on screen.
 */
export async function updateBet(
  input: UpdateBetInput,
): Promise<UpdateBetResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };

  const bet = await prisma.bet.findUnique({
    where: { id: input.betId },
    select: { id: true, userId: true, user: { select: { username: true } } },
  });
  if (!bet) return { ok: false, error: "not_found" };

  // Admin-only — bet edits change historical truth, so we restrict it
  // tighter than resolve (owner + mods) or report (anyone).
  if (session.user.role !== "admin") {
    return { ok: false, error: "not_authorized" };
  }

  // Validate selections.
  if (!Array.isArray(input.selections) || input.selections.length === 0) {
    return { ok: false, error: "validation", detail: "no_selections" };
  }
  for (const s of input.selections) {
    if (!s.match || s.match.trim().length === 0) {
      return { ok: false, error: "validation", detail: "empty_match" };
    }
    if (!s.selection || s.selection.trim().length === 0) {
      return { ok: false, error: "validation", detail: "empty_selection" };
    }
    if (!Number.isFinite(s.odds) || s.odds < 1.01 || s.odds > 999) {
      return { ok: false, error: "validation", detail: "invalid_odds" };
    }
  }

  let kickoffDate: Date | undefined;
  if (input.kickoff) {
    const d = new Date(input.kickoff);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: "validation", detail: "invalid_kickoff" };
    }
    kickoffDate = d;
  }

  const combinedOdds = +input.selections
    .reduce((acc, s) => acc * s.odds, 1)
    .toFixed(3);

  await prisma.$transaction([
    prisma.selection.deleteMany({ where: { betId: bet.id } }),
    prisma.selection.createMany({
      data: input.selections.map((s, i) => ({
        betId: bet.id,
        match: s.match.trim(),
        selection: s.selection.trim(),
        odds: s.odds,
        position: i,
      })),
    }),
    prisma.bet.update({
      where: { id: bet.id },
      data: {
        combinedOdds,
        notes: input.notes === undefined ? undefined : input.notes,
        ...(kickoffDate ? { kickoff: kickoffDate } : {}),
        type: input.selections.length > 1 ? "accumulator" : "other",
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/bets");
  revalidatePath(`/profile/${bet.user.username}`);
  revalidatePath(`/bet/${bet.id}`);

  return { ok: true };
}
