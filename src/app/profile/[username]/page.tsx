// Server component — fetches a user and their bets, hands them to the client UI.

import Link from "next/link";
import { auth } from "@/auth";
import { ProfileClient } from "@/components/ProfileClient";
import { getBetsForUser, getUserByUsername } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const [user, session] = await Promise.all([getUserByUsername(params.username), auth()]);

  if (!user) {
    return (
      <div className="py-16 text-center text-ink-600">
        <div className="text-5xl">🤷</div>
        <h1 className="mt-4 text-2xl font-bold">Speler niet gevonden</h1>
        <Link href="/" className="mt-4 inline-block text-sm font-semibold text-ink-900 underline">
          ← Ranglijst
        </Link>
      </div>
    );
  }

  const bets = await getBetsForUser(user.id);
  return (
    <ProfileClient
      user={user}
      bets={bets}
      currentUserId={session?.user?.id}
      currentUserRole={session?.user?.role}
    />
  );
}
