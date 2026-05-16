"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export type DeleteBetResult =
  | { ok: true }
  | {
      ok: false;
      error: "not_authenticated" | "not_authorized" | "not_found";
    };

/**
 * Permanently delete a bet.
 *  - Owners can delete their own bet, regardless of status.
 *  - Admins + moderators can delete any bet.
 *  - Selection rows and BetReport rows cascade-delete via the schema's
 *    `onDelete: Cascade` rule, so we don't need to clean them up manually.
 */
export async function deleteBet(betId: string): Promise<DeleteBetResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };

  const bet = await prisma.bet.findUnique({
    where: { id: betId },
    select: {
      id: true,
      userId: true,
      user: { select: { username: true } },
    },
  });
  if (!bet) return { ok: false, error: "not_found" };

  const isOwner = bet.userId === session.user.id;
  const role = session.user.role;
  const canModerate = role === "admin" || role === "moderator";
  if (!isOwner && !canModerate) return { ok: false, error: "not_authorized" };

  await prisma.bet.delete({ where: { id: betId } });

  revalidatePath("/");
  revalidatePath("/bets");
  revalidatePath(`/profile/${bet.user.username}`);
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/duplicates");

  return { ok: true };
}
