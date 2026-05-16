// Admin-only edit page for a single bet. Loads the bet, gates on
// session.user.role === "admin", and hands off to EditBetForm.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { EditBetForm } from "@/components/EditBetForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bet bewerken — LS Tracker",
};

export default async function EditBetPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?next=/bet/${params.id}/edit`);
  }
  if (session.user.role !== "admin") {
    // Non-admin → bounce to the read-only share page.
    redirect(`/bet/${params.id}`);
  }

  const bet = await prisma.bet.findUnique({
    where: { id: params.id },
    include: {
      selections: { orderBy: { position: "asc" } },
      user: { select: { username: true, displayName: true } },
    },
  });
  if (!bet) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/bet/${bet.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        >
          ← Terug
        </Link>
        <div className="text-xs text-ink-500 dark:text-ink-400">
          Eigenaar:{" "}
          <Link
            href={`/profile/${bet.user.username}`}
            className="font-semibold hover:underline"
          >
            {bet.user.displayName}
          </Link>
        </div>
      </div>

      <EditBetForm
        initial={{
          id: bet.id,
          notes: bet.notes ?? "",
          kickoff: bet.kickoff.toISOString(),
          selections: bet.selections.map((s) => ({
            id: s.id,
            match: s.match,
            selection: s.selection,
            odds: s.odds,
          })),
        }}
      />
    </div>
  );
}
