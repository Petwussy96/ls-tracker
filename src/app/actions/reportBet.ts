"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { rateLimit, sweepExpiredBuckets } from "@/lib/rateLimit";

// Members can flag a bet they think is wrongly resolved. We dedupe on
// (betId, reporterId) so each user can only file one report per bet,
// and we cap to 10 reports per user per hour as a basic abuse guard.
const REPORT_LIMIT_PER_USER = 10;
const REPORT_WINDOW_MS = 60 * 60 * 1000;

export type ReportBetResult =
  | { ok: true; alreadyReported?: boolean }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "bet_not_found"
        | "cannot_report_own"
        | "rate_limited"
        | "server_error";
    };

export async function reportBet(input: {
  betId: string;
  reason?: string;
}): Promise<ReportBetResult> {
  sweepExpiredBuckets();

  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };

  const userId = session.user.id;
  const rl = rateLimit(`report:${userId}`, REPORT_LIMIT_PER_USER, REPORT_WINDOW_MS);
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  const bet = await prisma.bet.findUnique({ where: { id: input.betId } });
  if (!bet) return { ok: false, error: "bet_not_found" };

  // You can't flag your own bet — for that, just use the regular Resolve UI.
  if (bet.userId === userId) return { ok: false, error: "cannot_report_own" };

  const reason = input.reason?.trim().slice(0, 300) || null;

  try {
    await prisma.betReport.upsert({
      where: { betId_reporterId: { betId: input.betId, reporterId: userId } },
      create: { betId: input.betId, reporterId: userId, reason },
      // If they re-report, update the reason but don't reset the createdAt
      // (we already block in UI by checking hasReported; this is just safe-by-default).
      update: { reason: reason ?? undefined },
    });
  } catch (err) {
    console.error("reportBet failed", err);
    return { ok: false, error: "server_error" };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  return { ok: true };
}

// Admin clears reports after reviewing — used both for "report dismissed,
// resolution stands" and "I changed the resolution, marking reports as
// handled". Stamps the reviewedAt/by on every unreviewed report for this bet.
export async function reviewReports(input: { betId: string }): Promise<{ ok: boolean }> {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "admin" && role !== "moderator") return { ok: false };

  try {
    await prisma.betReport.updateMany({
      where: { betId: input.betId, reviewedAt: null },
      data: { reviewedAt: new Date(), reviewedById: session.user.id },
    });
  } catch (err) {
    console.error("reviewReports failed", err);
    return { ok: false };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidatePath("/bets");
  return { ok: true };
}
