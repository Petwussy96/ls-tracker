import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { UsersAdminClient } from "@/components/UsersAdminClient";

export const dynamic = "force-dynamic";

export default async function UsersAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/users");
  if (session.user.role !== "admin") {
    return (
      <div className="py-16 text-center text-ink-600 dark:text-ink-300">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 text-2xl font-bold">Geen toegang</h1>
        <p className="mt-2 text-sm">Alleen beheerders kunnen rollen aanpassen.</p>
      </div>
    );
  }

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      joinedAt: true,
      image: true,
      avatar: true,
    },
  });

  const items = users.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role as "member" | "moderator" | "admin",
    joinedAt: u.joinedAt.toISOString(),
    image: u.image,
    avatar: u.avatar,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-400 dark:text-ink-500">
          Admin · users
        </p>
        <h1 className="text-3xl font-black tracking-tight text-ink-900 dark:text-white">
          Spelers & rollen
        </h1>
        <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
          Promote vertrouwde leden tot <strong>moderator</strong> — die kunnen meldingen
          afhandelen en bets overrulen, maar geen invites of magic-links maken.
        </p>
        <Link
          href="/admin"
          className="mt-2 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        >
          ← Dashboard
        </Link>
      </div>
      <UsersAdminClient users={items} currentUserId={session.user.id} />
    </div>
  );
}
