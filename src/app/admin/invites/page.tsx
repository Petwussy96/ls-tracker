// Server component: admin-only. Lists invites and renders the admin client UI.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { InvitesAdminClient } from "@/components/InvitesAdminClient";

export const dynamic = "force-dynamic";

export default async function InvitesAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/invites");
  if (session.user.role !== "admin") {
    return (
      <div className="py-16 text-center text-ink-600">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 text-2xl font-bold">Geen toegang</h1>
        <p className="mt-2 text-sm">Alleen beheerders kunnen uitnodigingen beheren.</p>
      </div>
    );
  }

  const invites = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      consumedBy: { select: { username: true, displayName: true } },
    },
  });

  const safeInvites = invites.map((i) => ({
    id: i.id,
    code: i.code,
    createdAt: i.createdAt.toISOString(),
    consumedAt: i.consumedAt?.toISOString() ?? null,
    expiresAt: i.expiresAt?.toISOString() ?? null,
    note: i.note,
    consumedBy: i.consumedBy
      ? { username: i.consumedBy.username, displayName: i.consumedBy.displayName }
      : null,
  }));

  return <InvitesAdminClient invites={safeInvites} />;
}
