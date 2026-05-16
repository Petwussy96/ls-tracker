// Public bet detail page — works without login so Facebook/WhatsApp can
// render OG previews when a bet is shared. Renders an inline read-only
// summary on its own (no BetCard) so the page can never crash due to a
// regression in BetCard's tree of resolve / report / share controls.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/Avatar";
import { RoleBadge } from "@/components/RoleBadge";
import { avatarRingClass } from "@/lib/avatarRing";
import { ShareBetButton } from "@/components/ShareBetButton";
import { DeleteBetButton } from "@/components/DeleteBetButton";
import { CategoryBadge } from "@/components/CategoryBadge";
import { computeBetCategory } from "@/lib/betCategory";
import { formatOdds } from "@/lib/format";
import type { Bet, BetType, UserRole } from "@/lib/types";

// Node runtime — Prisma can't run on the edge. Force-dynamic — we don't want
// any stale cache to serve a broken page once we've patched it. /bet/[id]
// is low-traffic (only hit when someone follows a shared link), so the cost
// of disabling ISR is negligible.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BetRow = {
  id: string;
  userId: string;
  type: string;
  combinedOdds: number;
  status: string;
  kickoff: Date;
  placedAt: Date;
  resolvedAt: Date | null;
  notes: string | null;
  category: string | null;
  user: {
    id: string;
    username: string;
    displayName: string;
    image: string | null;
    avatar: string | null;
    role: string | null;
    joinedAt: Date | null;
  };
  selections: {
    match: string;
    competition: string | null;
    selection: string;
    odds: number;
  }[];
};

async function getBet(id: string): Promise<BetRow | null> {
  try {
    const row = await prisma.bet.findUnique({
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
    return row as BetRow | null;
  } catch (err) {
    console.error("[bet/[id]] getBet failed for id=", id, err);
    return null;
  }
}

// Imported lazily inside the page so a hypothetical bug in auth() can never
// take the whole page down. The catch returns null and the page renders the
// guest variant (no resolve buttons, no share button).
async function safeAuth() {
  try {
    const mod = await import("@/auth");
    return await mod.auth();
  } catch (err) {
    console.error("[bet/[id]] auth() failed", err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  try {
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
  } catch (err) {
    console.error("[bet/[id]] generateMetadata failed", err);
    return { title: "LS Tracker" };
  }
}

function formatNL(iso: string): string {
  try {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function BetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const row = await getBet(params.id);
  if (!row) notFound();

  const session = await safeAuth();

  // Build a defensive Bet projection — every nullable field is coerced.
  let bet: Bet;
  let user: {
    id: string;
    username: string;
    displayName: string;
    image?: string;
    avatar?: string;
    role: UserRole;
    joinedAt: string;
  };
  try {
    bet = {
      id: row.id,
      userId: row.userId,
      type: (row.type ?? "other") as BetType,
      selections: (row.selections ?? []).map((s) => ({
        match: s.match ?? "",
        competition: s.competition ?? undefined,
        selection: s.selection ?? "",
        odds: typeof s.odds === "number" ? s.odds : Number(s.odds) || 0,
      })),
      combinedOdds:
        typeof row.combinedOdds === "number"
          ? row.combinedOdds
          : Number(row.combinedOdds) || 0,
      status: (row.status ?? "open") as Bet["status"],
      kickoff: row.kickoff
        ? new Date(row.kickoff).toISOString()
        : new Date().toISOString(),
      placedAt: row.placedAt
        ? new Date(row.placedAt).toISOString()
        : new Date().toISOString(),
      resolvedAt: row.resolvedAt
        ? new Date(row.resolvedAt).toISOString()
        : undefined,
      notes: row.notes ?? undefined,
      category: row.category ?? undefined,
    };
    user = {
      id: row.user.id,
      username: row.user.username,
      displayName:
        row.user.displayName ?? row.user.username ?? "Onbekend",
      image: row.user.image ?? undefined,
      avatar: row.user.avatar ?? undefined,
      role: ((row.user.role as UserRole) ?? "member") as UserRole,
      joinedAt: row.user.joinedAt
        ? new Date(row.user.joinedAt).toISOString()
        : new Date().toISOString(),
    };
  } catch (err) {
    console.error("[bet/[id]] projection failed", err);
    notFound();
  }

  const isAcca = bet.selections.length > 1;
  const category = computeBetCategory(bet);
  const isOwner =
    Boolean(session?.user?.id) && session?.user?.id === bet.userId;
  const canModerate =
    session?.user?.role === "admin" || session?.user?.role === "moderator";

  const statusPill =
    bet.status === "won"
      ? "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900"
      : bet.status === "lost"
        ? "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900"
        : bet.status === "void"
          ? "bg-ink-100 text-ink-600 ring-ink-200 dark:bg-ink-800 dark:text-ink-400 dark:ring-ink-700"
          : "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900";

  const accentStrip =
    bet.status === "won"
      ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400"
      : bet.status === "lost"
        ? "bg-gradient-to-r from-rose-400 via-rose-500 to-rose-400"
        : bet.status === "void"
          ? "bg-gradient-to-r from-ink-300 via-ink-400 to-ink-300 dark:from-ink-700 dark:via-ink-600 dark:to-ink-700"
          : "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400";

  const statusLabel =
    bet.status === "won"
      ? "Gewonnen"
      : bet.status === "lost"
        ? "Verloren"
        : bet.status === "void"
          ? "Geannuleerd"
          : "Open";

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
          <Avatar
            user={user}
            size={28}
            className={avatarRingClass(user.role)}
          />
          {user.displayName}
          <RoleBadge role={user.role} />
        </Link>
      </div>

      {/* Inline read-only bet summary — purpose-built for this page so we
          don't ride along with BetCard's resolve / report / mod controls. */}
      <div className="relative overflow-hidden rounded-2xl border border-ink-200 bg-white p-4 shadow-sm dark:border-ink-800 dark:bg-ink-900">
        <div className={`absolute inset-x-0 top-0 h-1 ${accentStrip}`} aria-hidden />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink-900 dark:text-white">
              {isAcca
                ? `${bet.selections.length}x Combinatie`
                : bet.selections[0]?.match}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${statusPill}`}
            >
              {statusLabel}
            </span>
            <CategoryBadge category={category} betId={bet.id} editable={false} />
          </div>
        </div>

        <ul
          className={`mt-3 space-y-1.5 ${isAcca ? "border-l-2 border-ink-100 pl-3 dark:border-ink-800" : ""}`}
        >
          {bet.selections.map((sel, i) => (
            <li key={i} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-ink-800 dark:text-ink-200">
                  {sel.selection}
                </span>
                <span className="shrink-0 font-bold text-ink-900 dark:text-white">
                  {formatOdds(sel.odds)}
                </span>
              </div>
              {isAcca && (
                <div className="text-xs text-ink-400 dark:text-ink-500">
                  {sel.match}
                </div>
              )}
            </li>
          ))}
        </ul>

        {bet.notes && (
          <div className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs italic text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            &ldquo;{bet.notes}&rdquo;
          </div>
        )}

        <div className="mt-3 flex items-end justify-between border-t border-ink-100 pt-3 dark:border-ink-800">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400 dark:text-ink-500">
              {isAcca ? "Totaal quotering" : "Quotering"}
            </div>
            <div className="text-2xl font-black tracking-tight text-ink-900 dark:text-white">
              {formatOdds(bet.combinedOdds)}
            </div>
          </div>
          <div className="text-right text-[11px] text-ink-400 dark:text-ink-500">
            <div>Kickoff: {formatNL(bet.kickoff)}</div>
            {bet.resolvedAt && (
              <div>Afgehandeld: {formatNL(bet.resolvedAt)}</div>
            )}
          </div>
        </div>

        {isOwner && <ShareBetButton betId={bet.id} />}
        {session?.user?.role === "admin" && (
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={`/bet/${bet.id}/edit`}
              className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-600 hover:bg-ink-100 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
            >
              ✏️ Bewerk
            </a>
            <DeleteBetButton betId={bet.id} />
          </div>
        )}
      </div>

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
