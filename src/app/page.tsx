// Server component — fetches DB data and hands it to the client UI.

import { LeaderboardClient } from "@/components/LeaderboardClient";
import { getLeaderboardData } from "@/lib/queries";
import { auth } from "@/auth";

// ISR with 30s window — bet submissions/resolutions trigger
// revalidatePath() in their server actions, which invalidates this
// cache immediately, so the leaderboard stays fresh on real changes
// while idle navigations reuse the cached HTML.
export const revalidate = 30;

export default async function LeaderboardPage() {
  const [{ users, bets }, session] = await Promise.all([getLeaderboardData(), auth()]);
  return (
    <LeaderboardClient users={users} bets={bets} currentUserId={session?.user?.id ?? null} />
  );
}
