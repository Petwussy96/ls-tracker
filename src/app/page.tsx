// Server component — fetches DB data and hands it to the client UI.

import { LeaderboardClient } from "@/components/LeaderboardClient";
import { getLeaderboardData } from "@/lib/queries";

export const dynamic = "force-dynamic"; // always fresh — small group, low traffic

export default async function LeaderboardPage() {
  const { users, bets } = await getLeaderboardData();
  return <LeaderboardClient users={users} bets={bets} />;
}
