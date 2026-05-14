// Server component — fetches DB data and hands it to the client UI.

import { LeaderboardClient } from "@/components/LeaderboardClient";
import { getLeaderboardData } from "@/lib/queries";
import { auth } from "@/auth";

export const dynamic = "force-dynamic"; // always fresh — small group, low traffic

export default async function LeaderboardPage() {
  const [{ users, bets }, session] = await Promise.all([getLeaderboardData(), auth()]);
  return (
    <LeaderboardClient users={users} bets={bets} currentUserId={session?.user?.id ?? null} />
  );
}
