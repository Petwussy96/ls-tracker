import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SettingsClient } from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/settings");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      image: true,
      avatar: true,
      role: true,
      passwordHash: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href={`/profile/${user.username}`}
          className="text-xs font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
        >
          ← Profiel
        </Link>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-900 dark:text-white">
          Instellingen
        </h1>
      </div>
      <SettingsClient
        user={{
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email ?? "",
          image: user.image,
          avatar: user.avatar,
          role: user.role as "member" | "moderator" | "admin",
          hasPassword: !!user.passwordHash,
        }}
      />
    </div>
  );
}
