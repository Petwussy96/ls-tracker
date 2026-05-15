"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { BetCategory } from "@/lib/betCategory";

// Allowed values match BetCategory exactly. Server validates so users can't
// stuff arbitrary strings into the column.
const VALID: readonly BetCategory[] = [
  "btts",
  "resultaat",
  "overUnder",
  "firstHalfGoals",
  "secondHalfGoals",
  "handicap",
  "correctScore",
  "scorer",
  "halftime",
  "doubleChance",
  "drawNoBet",
  "mix",
  "other",
];

export type SetBetCategoryResult =
  | { ok: true }
  | {
      ok: false;
      error: "not_authenticated" | "not_authorized" | "not_found" | "invalid_category";
    };

/**
 * Set / clear the manual category override for a bet.
 * Owners can override their own bets; mods + admins can override any bet.
 * Pass `category: null` to revert to auto-detect.
 */
export async function setBetCategory(input: {
  betId: string;
  category: BetCategory | null;
}): Promise<SetBetCategoryResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };

  if (input.category !== null && !(VALID as readonly string[]).includes(input.category)) {
    return { ok: false, error: "invalid_category" };
  }

  const bet = await prisma.bet.findUnique({
    where: { id: input.betId },
    select: { userId: true, user: { select: { username: true } } },
  });
  if (!bet) return { ok: false, error: "not_found" };

  const isOwner = bet.userId === session.user.id;
  const role = session.user.role;
  const canModerate = role === "admin" || role === "moderator";
  if (!isOwner && !canModerate) return { ok: false, error: "not_authorized" };

  await prisma.bet.update({
    where: { id: input.betId },
    data: { category: input.category },
  });

  revalidatePath("/");
  revalidatePath("/bets");
  revalidatePath(`/profile/${bet.user.username}`);
  return { ok: true };
}
