// Server component — admin view of bets that have reached the report
// threshold and are awaiting human review.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ReportedBetsAdminClient } from "@/components/ReportedBetsAdminClient";

export const dynamic = "force-dynamic";

const REPORT_THRESHOLD = 3;

export default async function ReportsAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/reports");
  if (session.user.role !== "admin" && session.user.role !== "moderator") {
    return (
      <div className="py-16 text-center text-ink-600 dark:text-ink-300">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 text-2xl font-bold">Geen toegang</h1>
      </div>
    );
  }

  // Find bets with REPORT_THRESHOLD+ unreviewed reports.
  const groups = await prisma.betReport.groupBy({
    by: ["betId"],
    where: { reviewedAt: null },
    _count: { betId: true },
    having: { betId: { _count: { gte: REPORT_THRESHOLD } } },
    orderBy: { _count: { betId: "desc" } },
  });

  const betIds = groups.map((g) => g.betId);

  const bets = betIds.length
    ? await prisma.bet.findMany({
        where: { id: { in: betIds } },
        include: {
          user: { select: { id: true, username: true, displayName: true, image: true, avatar: true } },
          selections: { orderBy: { position: "asc" } },
          reports: {
            where: { reviewedAt: null },
            orderBy: { createdAt: "desc" },
            include: {
              reporter: { select: { username: true, displayName: true } },
            },
          },
        },
      })
    : [];

  // Sort by report count descending, then by latest report
  const rows = bets
    .map((b) => ({
      bet: {
        id: b.id,
        userId: b.userId,
        type: b.type as import("@/lib/types").BetType,
        combinedOdds: b.combinedOdds,
        status: b.status as "open" | "won" | "lost" | "void",
        kickoff: b.kickoff.toISOString(),
        placedAt: b.placedAt.toISOString(),
        resolvedAt: b.resolvedAt?.toISOString() ?? undefined,
        notes: b.notes ?? undefined,
        category: b.category ?? undefined,
        selections: b.selections.map((s) => ({
          match: s.match,
          competition: s.competition ?? undefined,
          selection: s.selection,
          odds: s.odds,
        })),
      },
      user: {
        id: b.user.id,
        username: b.user.username,
        displayName: b.user.displayName,
        image: b.user.image ?? undefined,
        avatar: b.user.avatar ?? undefined,
        role: "member" as const,
        joinedAt: "",
      },
      reports: b.reports.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        reason: r.reason ?? null,
        reporter: {
          username: r.reporter.username,
          displayName: r.reporter.displayName,
        },
      })),
    }))
    .sort((a, z) => z.reports.length - a.reports.length);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-400 dark:text-ink-500">
          Admin · meldingen
        </p>
        <h1 className="text-3xl font-black tracking-tight text-ink-900 dark:text-white">
          Bets met ≥ {REPORT_THRESHOLD} meldingen
        </h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
          Leden vinden dat deze bets verkeerd zijn afgehandeld. Pas indien nodig de
          uitslag aan via de admin-knoppen, of klik "Meldingen verwerken" om de
          meldingen weg te strepen zonder de bet te wijzigen.
        </p>
        <Link
          href="/admin"
          className="mt-3 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        >
          ← Naar dashboard
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center dark:border-ink-800 dark:bg-ink-900">
          <div className="text-4xl">✅</div>
          <p className="mt-3 text-ink-600 dark:text-ink-300">
            Geen openstaande meldingen — alles is rustig.
          </p>
        </div>
      ) : (
        <ReportedBetsAdminClient rows={rows} adminId={session.user.id} adminRole="admin" />
      )}
    </div>
  );
}
