// Server component — fetches DB data and hands it to the client UI.

import { auth } from "@/auth";
import { BetsClient } from "@/components/BetsClient";
import { getAllBets, getAllUsers } from "@/lib/queries";

export const revalidate = 30;

export default async function OpenBetsPage() {
  const [users, bets, session] = await Promise.all([getAllUsers(), getAllBets(), auth()]);
  return (
    <BetsClient
      users={users}
      bets={bets}
      currentUserId={session?.user?.id}
      currentUserRole={session?.user?.role}
    />
  );
}
