// Admin / mod view: groups of bets that share the exact same fingerprint
// (matches + selections + odds). Cross-user duplicates are usually fine
// (different people calling the same combo), but useful for spotting bots
// or accidental double-submits.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { betFingerprint } from "@/lib/betFingerprint";
import { Avatar } from "@/components/Avatar";
import { RoleBadge, avatarRingClass } from "@/components/RoleBadge";

export const dynamic = "force-dynamic";

export default async function DuplicatesAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/duplicates");
  if (session.user.role !== "admin" && session.user.role !== "moderator") {
    return (
      <div className="py-16 text-center text-ink-600 dark:text-ink-300">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 text-2xl font-bold">Geen toegang</h1>
      </div>
    );
  }

  // Pull recent bets and bucket by fingerprint. Limit scope: last ~500 bets.
  const bets = await prisma.bet.findMany({
    take: 500,
    orderBy: { placedAt: "desc" },
    include: {
      selections: true,
      user: { select: { username: true, displayName: true, image: true, avatar: true, role: true } },
    },
  });

  const buckets = new Map<
    string,
    Array<{
      id: string;
      placedAt: string;
      status: string;
      user: { username: string; displayName: string; image: string | null; avatar: string | null; role: string };
      preview: string;
    }>
  >();

  for (const b of bets) {
    const fp = betFingerprint(b.selections);
    const preview =
      b.selections.length === 1
        ? `${b.selections[0].match} — ${b.selections[0].selection}`
        : `${b.selections.length}× combi · ${b.selections[0]?.match ?? "?"} +${b.selections.length - 1}`;
    if (!buckets.has(fp)) buckets.set(fp, []);
    buckets.get(fp)!.push({
      id: b.id,
      placedAt: b.placedAt.toISOString(),
      status: b.status,
      user: b.user as typeof buckets extends Map<string, Array<infer T>> ? T extends { user: infer U } ? U : never : never,
      preview,
    });
  }

  // Keep only fingerprints with 2+ bets.
  const groups = [...buckets.values()]
    .filter((g) => g.length >= 2)
    .sort((a, z) => z.length - a.length);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-400 dark:text-ink-500">
          Admin · duplicaten
        </p>
        <h1 className="text-3xl font-black tracking-tight text-ink-900 dark:text-white">
          Mogelijke duplicaten
        </h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
          Bets met identieke wedstrijden, selecties en odds. Cross-user
          duplicaten zijn meestal prima — handig om bots of dubbele submits
          te spotten.
        </p>
        <Link
          href="/admin"
          className="mt-2 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        >
          ← Dashboard
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center dark:border-ink-800 dark:bg-ink-900">
          <div className="text-4xl">🧹</div>
          <p className="mt-3 text-ink-600 dark:text-ink-300">Geen duplicaten in de laatste 500 bets.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {groups.map((group, i) => (
            <li
              key={i}
              className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm dark:border-ink-800 dark:bg-ink-900"
            >
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">
                  {group.length}× {group[0].preview}
                </p>
                <span className="text-[10px] uppercase tracking-wider text-ink-400">
                  {group.length} bets
                </span>
              </div>
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {group.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link
                      href={`/profile/${b.user.username}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Avatar
                        user={{ displayName: b.user.displayName, image: b.user.image ?? b.user.avatar }}
                        size={24}
                        className={avatarRingClass(b.user.role as "member" | "moderator" | "admin")}
                      />
                      <span className="font-semibold text-ink-800 dark:text-ink-100">
                        {b.user.displayName}
                      </span>
                      <RoleBadge role={b.user.role as "member" | "moderator" | "admin"} />
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
                      <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase dark:bg-ink-800">
                        {b.status}
                      </span>
                      <span>{new Date(b.placedAt).toLocaleString("nl-NL")}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
