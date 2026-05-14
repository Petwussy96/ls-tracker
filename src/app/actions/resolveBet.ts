"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { BetStatus } from "@/lib/types";

export type ResolveBetResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_authorized"
        | "not_found"
        | "already_resolved"
        | "invalid_status";
    };

const RESOLVABLE_STATUSES: BetStatus[] = ["won", "lost", "void"];

/**
 * Resolve an open bet to won/lost/void.
 * - Owners can resolve their own open bets.
 * - Admins can resolve any open bet (also lets them correct bad calls).
 * - An admin can re-resolve an already-settled bet; members cannot.
 */
export async function resolveBet(
  betId: string,
  newStatus: BetStatus,
): Promise<ResolveBetResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };

  if (!RESOLVABLE_STATUSES.includes(newStatus)) {
    return { ok: false, error: "invalid_status" };
  }

  const bet = await prisma.bet.findUnique({
    where: { id: betId },
    select: { id: true, userId: true, status: true, user: { select: { username: true } } },
  });
  if (!bet) return { ok: false, error: "not_found" };

  const isOwner = bet.userId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) return { ok: false, error: "not_authorized" };

  // Members can only resolve OPEN bets. Admins may correct settled bets too.
  if (bet.status !== "open" && !isAdmin) {
    return { ok: false, error: "already_resolved" };
  }

  await prisma.bet.update({
    where: { id: betId },
    data: {
      status: newStatus,
      resolvedAt: new Date(),
    },
  });

  // Refresh anything that reads from this bet.
  revalidatePath("/");
  revalidatePath("/bets");
  revalidatePath(`/profile/${bet.user.username}`);

  return { ok: true };
}
