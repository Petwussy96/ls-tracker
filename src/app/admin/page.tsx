// Server component — admin dashboard with group-wide stats and quick links.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const REPORT_THRESHOLD = 3;

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin");
  const role = session.user.role;
  if (role !== "admin" && role !== "moderator") {
    return <NoAccess />;
  }
  const isAdminUser = role === "admin";

  // Parallel queries — none of these depend on each other.
  const [
    userCount,
    adminCount,
    totalBets,
    openBets,
    settledBets,
    wonBets,
    lostBets,
    voidBets,
    pendingReportRows,
    inviteCount,
    consumedInviteCount,
    recentUsers,
    openFeedbackCount,
    recentBets,
    topByWinRate,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.bet.count(),
    prisma.bet.count({ where: { status: "open" } }),
    prisma.bet.count({ where: { status: { in: ["won", "lost", "void"] } } }),
    prisma.bet.count({ where: { status: "won" } }),
    prisma.bet.count({ where: { status: "lost" } }),
    prisma.bet.count({ where: { status: "void" } }),
    prisma.betReport.groupBy({
      by: ["betId"],
      where: { reviewedAt: null },
      _count: { betId: true },
      having: { betId: { _count: { gte: REPORT_THRESHOLD } } },
    }),
    prisma.inviteCode.count(),
    prisma.inviteCode.count({ where: { consumedAt: { not: null } } }),
    prisma.user.findMany({
      orderBy: { joinedAt: "desc" },
      take: 5,
      select: { id: true, username: true, displayName: true, joinedAt: true, role: true },
    }),
    prisma.feedback.count({ where: { status: "open" } }),
    prisma.bet.findMany({
      orderBy: { placedAt: "desc" },
      take: 5,
      include: {
        user: { select: { username: true, displayName: true } },
        selections: { orderBy: { position: "asc" }, take: 1 },
      },
    }),
    prisma.bet.groupBy({
      by: ["userId"],
      where: { status: { in: ["won", "lost"] } },
      _count: { _all: true },
    }),
  ]);

  const wonByUser = await prisma.bet.groupBy({
    by: ["userId"],
    where: { status: "won" },
    _count: { _all: true },
  });

  const wonMap = new Map(wonByUser.map((r) => [r.userId, r._count._all]));
  const ranked = topByWinRate
    .map((r) => ({
      userId: r.userId,
      settled: r._count._all,
      wins: wonMap.get(r.userId) ?? 0,
    }))
    .filter((r) => r.settled >= 5)
    .map((r) => ({ ...r, winRate: r.wins / r.settled }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5);

  const rankedUsers = ranked.length
    ? await prisma.user.findMany({
        where: { id: { in: ranked.map((r) => r.userId) } },
        select: { id: true, username: true, displayName: true },
      })
    : [];
  const userMap = new Map(rankedUsers.map((u) => [u.id, u]));

  const winRate = settledBets === 0 ? 0 : wonBets / settledBets;
  const pendingReportCount = pendingReportRows.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-400 dark:text-ink-500">
            Admin
          </p>
          <h1 className="text-3xl font-black tracking-tight text-ink-900 dark:text-white">
            Dashboard
          </h1>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/admin/reports"
            className="rounded-full bg-rose-100 px-4 py-2 font-semibold text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900"
          >
            🚩 Meldingen
            {pendingReportCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1 text-xs text-white">
                {pendingReportCount}
              </span>
            )}
          </Link>
          {isAdminUser && (
            <>
              <Link
                href="/admin/invites"
                className="rounded-full border border-ink-200 bg-white px-4 py-2 font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
              >
                ✉️ Invites
              </Link>
              <Link
                href="/admin/magic"
                className="rounded-full border border-ink-200 bg-white px-4 py-2 font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
              >
                🔗 Magic-link
              </Link>
              <Link
                href="/admin/users"
                className="rounded-full border border-ink-200 bg-white px-4 py-2 font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
              >
                👥 Users
              </Link>
            </>
          )}
          <Link
            href="/admin/duplicates"
            className="rounded-full border border-ink-200 bg-white px-4 py-2 font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
          >
            🔁 Duplicaten
          </Link>
          <Link
            href="/admin/feedback"
            className="rounded-full border border-ink-200 bg-white px-4 py-2 font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
          >
            💬 Feedback
            {openFeedbackCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-xs text-white">
                {openFeedbackCount}
              </span>
            )}
          </Link>
        </nav>
      </div>

      {/* Top-line metrics */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Spelers" value={userCount} sub={`${adminCount} admin${adminCount === 1 ? "" : "s"}`} />
        <Metric label="Bets totaal" value={totalBets} sub={`${openBets} open`} />
        <Metric
          label="Win-percentage"
          value={settledBets === 0 ? "—" : `${(winRate * 100).toFixed(1)}%`}
          sub={`${wonBets} W · ${lostBets} L · ${voidBets} V`}
          tone={winRate >= 0.5 ? "positive" : "neutral"}
        />
        <Metric
          label="Open meldingen"
          value={pendingReportCount}
          sub={`≥ ${REPORT_THRESHOLD} reports`}
          tone={pendingReportCount > 0 ? "warning" : "neutral"}
        />
      </section>

      {/* Invites overview */}
      <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-900">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">Invites</h2>
          <Link
            href="/admin/invites"
            className="text-xs font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
          >
            Beheren →
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Stat label="Aangemaakt" value={inviteCount} />
          <Stat label="Gebruikt" value={consumedInviteCount} />
          <Stat label="Conversie" value={inviteCount === 0 ? "—" : `${Math.round((consumedInviteCount / inviteCount) * 100)}%`} />
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent users */}
        <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-900">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">Laatste spelers</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {recentUsers.length === 0 && (
              <li className="text-ink-400 dark:text-ink-500">Nog geen spelers.</li>
            )}
            {recentUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2">
                <Link
                  href={`/profile/${u.username}`}
                  className="font-semibold text-ink-800 hover:underline dark:text-ink-100"
                >
                  {u.displayName}
                </Link>
                <span className="text-xs text-ink-400 dark:text-ink-500">
                  {u.role === "admin" ? "admin · " : ""}
                  {relativeDate(u.joinedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Recent bets */}
        <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-900">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">Laatste bets</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {recentBets.length === 0 && (
              <li className="text-ink-400 dark:text-ink-500">Nog geen bets.</li>
            )}
            {recentBets.map((b) => (
              <li key={b.id} className="flex items-baseline justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-ink-800 dark:text-ink-100">
                    {b.user.displayName}
                  </span>{" "}
                  <span className="truncate text-xs text-ink-500 dark:text-ink-400">
                    {b.selections[0]?.match ?? "?"}
                  </span>
                </div>
                <StatusPill status={b.status} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Top win-rate */}
      <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-900">
        <h2 className="text-lg font-bold text-ink-900 dark:text-white">
          Beste win-rate <span className="text-xs font-normal text-ink-400">(min. 5 settled)</span>
        </h2>
        <ol className="mt-3 space-y-2 text-sm">
          {ranked.length === 0 && (
            <li className="text-ink-400 dark:text-ink-500">Nog niet genoeg afgehandelde bets.</li>
          )}
          {ranked.map((r, i) => {
            const u = userMap.get(r.userId);
            if (!u) return null;
            return (
              <li key={r.userId} className="flex items-center justify-between gap-2">
                <span>
                  <span className="mr-2 text-ink-400">#{i + 1}</span>
                  <Link href={`/profile/${u.username}`} className="font-semibold hover:underline">
                    {u.displayName}
                  </Link>
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {(r.winRate * 100).toFixed(0)}%
                  <span className="ml-2 text-xs font-normal text-ink-400 dark:text-ink-500">
                    {r.wins}/{r.settled}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function NoAccess() {
  return (
    <div className="py-16 text-center text-ink-600 dark:text-ink-300">
      <div className="text-5xl">🔒</div>
      <h1 className="mt-4 text-2xl font-bold">Geen toegang</h1>
      <p className="mt-2 text-sm">Alleen beheerders kunnen dit dashboard zien.</p>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "neutral" | "positive" | "warning";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-ink-900 dark:text-white";
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm dark:border-ink-800 dark:bg-ink-900">
      <div className="text-xs uppercase tracking-wider text-ink-400 dark:text-ink-500">{label}</div>
      <div className={`mt-1 text-2xl font-black tracking-tight ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-ink-400 dark:text-ink-500">{sub}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-ink-400 dark:text-ink-500">{label}</div>
      <div className="text-xl font-bold text-ink-900 dark:text-white">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    lost: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    void: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400",
  };
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${map[status] ?? map.open}`}>
      {status}
    </span>
  );
}

function relativeDate(d: Date): string {
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return "vandaag";
  if (days === 1) return "gisteren";
  if (days < 7) return `${days}d geleden`;
  if (days < 30) return `${Math.floor(days / 7)}w geleden`;
  return d.toISOString().slice(0, 10);
}
