// Seed script for LS Tracker.
// Reuses the mock data so the local DB starts with a believable group state.
//
// Run with: npm run db:seed
// Or to wipe and reseed: npm run db:reset

import { PrismaClient } from "@prisma/client";
import { mockBets, mockUsers } from "../src/lib/mockData";

const prisma = new PrismaClient();

async function main() {
  console.log("Wiping existing data…");
  await prisma.selection.deleteMany();
  await prisma.bet.deleteMany();
  await prisma.inviteCode.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  console.log(`Seeding ${mockUsers.length} users…`);
  // We respect the mock IDs so the bets can reference them.
  for (const u of mockUsers) {
    await prisma.user.create({
      data: {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        email: u.email,
        avatar: u.avatar,
        role: u.role,
        joinedAt: new Date(u.joinedAt),
      },
    });
  }

  console.log(`Seeding ${mockBets.length} bets…`);
  for (const b of mockBets) {
    await prisma.bet.create({
      data: {
        id: b.id,
        userId: b.userId,
        type: b.type,
        combinedOdds: b.combinedOdds,
        status: b.status,
        kickoff: new Date(b.kickoff),
        placedAt: new Date(b.placedAt),
        resolvedAt: b.resolvedAt ? new Date(b.resolvedAt) : null,
        notes: b.notes,
        selections: {
          create: b.selections.map((s, idx) => ({
            match: s.match,
            competition: s.competition,
            selection: s.selection,
            odds: s.odds,
            position: idx,
          })),
        },
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    bets: await prisma.bet.count(),
    selections: await prisma.selection.count(),
  };
  console.log("Done.", counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
