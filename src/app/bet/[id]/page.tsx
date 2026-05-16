// Public bet detail page — works without login so Facebook/WhatsApp can
// render OG previews when a bet is shared. Logged-in users see the full
// BetCard (with resolve / report); guests see a read-only summary + CTA.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { BetCard } from "@/components/BetCard";
import { Avatar } from "@/components/Avatar";
import { RoleBadge, avatarRingClass } from "@/components/RoleBadge";
import type { Bet, BetType, UserRole } from "@/lib/types";

export const revalidate = 60;

async function getBet(id: string) {
  try {
    return await prisma.bet.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            image: true,
            avatar: true,
            role: true,
            joinedAt: true,
          },
        },
        selections: { orderBy: { position: "asc" } },
      },
    });
  } catch (err) {
    console.error("bet detail getBet failed", err);
    return null;
  }
}

async function safeAuth() {
  try {
    return await auth();
  } catch (err) {
    console.error("bet detail auth failed", err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const row = await getBet(params.id);
  if (!row) return { title: "LS Tracker" };

  const isAcca = row.selections.length > 1;
  const legPreview = row.selections[0]
    ? `${row.selections[0].match} — ${row.selections[0].selection}`
    : "";
  const title = isAcca
    ? `${row.user.displayName}'s ${row.selections.length}x combi @ ${row.combinedOdds.toFixed(2)}`
    : `${row.user.displayName}: ${legPreview}`;
  const desc = `LS Tracker — ${row.user.displayName} · status: ${row.status} · totaal quotering ${row.combinedOdds.toFixed(2)}`;

  return {
    title,
    description: desc,
    openGraph: { title, description: desc, type: "article" },
    twitter: { card: "summary_large_image", title, description: desc },
  };
}

export default async function BetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const row = await getBet(params.id);
  if (!row) notFound();

  const session = await safeAuth();

  const bet: Bet = {
    id: row.id,
    userId: row.userId,
    type: row.type as BetType,
    selections: row.selections.map((s) => ({
      match: s.match,
      competition: s.competition ?? undefined,
      selection: s.selection,
      odds: s.odds,
    })),
    combinedOdds: row.combinedOdds,
    status: row.status as Bet["status"],
    kickoff: row.kickoff.toISOString(),
    placedAt: row.placedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString(),
    notes: row.notes ?? undefined,
    category: row.category ?? undefined,
  };

  const user = {
    id: row.user.id,
    username: row.user.username,
    displayName: row.user.displayName,
    image: row.user.image ?? undefined,
    avatar: row.user.avatar ?? undefined,
    role: (row.user.role as UserRole) ?? "member",
    joinedAt: row.user.joinedAt?.toISOString() ?? new Date().toISOString(),
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        >
          ← LS Tracker
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-ink-900 dark:text-white">
          Gedeelde bet
        </h1>
        <Link
          href={`/profile/${user.username}`}
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-ink-700 hover:text-ink-900 dark:text-ink-200 dark:hover:text-white"
        >
          <Avatar user={user} size={28} className={avatarRingClass(user.role)} />
          {user.displayName}
          <RoleBadge role={user.role} />
        </Link>
      </div>

      <BetCard
        bet={bet}
        user={user}
        currentUserId={session?.user?.id}
        currentUserRole={session?.user?.role}
      />

      {!session?.user && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-900/40 dark:bg-amber-950/40">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            Wil je zelf bets bijhouden? <strong>LS Tracker</strong> is een
            community-tool voor de Lucky Sucker FB-groep.
          </p>
          <Link
            href="/login"
            className="mt-3 inline-block rounded-full bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
          >
            Inloggen →
          </Link>
        </div>
      )}
    </div>
  );
}
