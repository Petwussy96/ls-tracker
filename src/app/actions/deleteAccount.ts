"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { rateLimit, sweepExpiredBuckets } from "@/lib/rateLimit";

// Privacy-policy belooft account-delete binnen 7 dagen — dit is de
// zelfservice variant. Cascades op Prisma-relaties verwijderen:
//   - Bets + Selections + BetReports
//   - Sessions + Accounts + VerificationTokens
//   - Feedback (SetNull) en BetReport reviewer (SetNull) blijven behouden
//     met userId=NULL voor admin-historiek.
//
// Username/email kunnen daarna opnieuw worden geclaimd door een ander.

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: "not_authenticated" | "rate_limited" | "last_admin" | "server_error" };

export async function deleteMyAccount(): Promise<DeleteAccountResult> {
  sweepExpiredBuckets();

  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };

  const rl = rateLimit(`delete:${session.user.id}`, 3, 60 * 60 * 1000);
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  // Safety: don't let the only admin delete themselves and lock everyone out
  if (session.user.role === "admin") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount <= 1) return { ok: false, error: "last_admin" };
  }

  try {
    await prisma.user.delete({ where: { id: session.user.id } });
  } catch (err) {
    console.error("deleteMyAccount failed", err);
    return { ok: false, error: "server_error" };
  }

  // Best-effort: clear the auth cookie. Don't care about which exact name —
  // try both secure + non-secure variants.
  const jar = cookies();
  jar.delete("__Secure-authjs.session-token");
  jar.delete("authjs.session-token");

  return { ok: true };
}

export async function deleteAndRedirect(): Promise<void> {
  const r = await deleteMyAccount();
  if (r.ok) redirect("/login?deleted=1");
}
