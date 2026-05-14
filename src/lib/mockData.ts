import type { Bet, User } from "./types";

// Mock data so the UI has something believable to render before the DB is wired up.
// Aliases mirror what the FB group looks like: "Kanskoning", "DikkeJan", etc.
// No stake/profit: we only track outcomes and odds.

export const mockUsers: User[] = [
  { id: "u1", username: "Kanskoning", displayName: "Kanskoning", role: "member", joinedAt: "2024-09-01" },
  { id: "u2", username: "DikkeJan", displayName: "Dikke Jan", role: "member", joinedAt: "2024-10-12" },
  { id: "u3", username: "BalkonBobby", displayName: "Balkon Bobby", role: "member", joinedAt: "2024-11-03" },
  { id: "u4", username: "OmaWillemien", displayName: "Oma Willemien", role: "member", joinedAt: "2024-08-17" },
  { id: "u5", username: "VierVoor1", displayName: "Vier Voor 1", role: "member", joinedAt: "2025-01-22" },
  // The admin gets an email so you can sign in immediately after seeding.
  // Change this to whoever should be the initial admin in production.
  {
    id: "u6",
    username: "IwanD",
    displayName: "Iwan",
    email: "i.dimitrijevic96@gmail.com",
    role: "admin",
    joinedAt: "2024-09-15",
  },
];

const now = new Date();
function isoDaysAgo(days: number, hourOffset = 0): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() + hourOffset);
  return d.toISOString();
}
function isoHoursFromNow(hours: number): string {
  const d = new Date(now);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function buildBet(input: Omit<Bet, "combinedOdds">): Bet {
  const combinedOdds = input.selections.reduce((acc, s) => acc * s.odds, 1);
  return { ...input, combinedOdds: +combinedOdds.toFixed(2) };
}

export const mockBets: Bet[] = [
  // Kanskoning — sharp BTTS specialist
  buildBet({
    id: "b1",
    userId: "u1",
    type: "btts",
    selections: [
      {
        match: "FK Septemvri Sofia - Spartak Varna",
        competition: "Bulgarian First League",
        selection: "Beide teams scoren: Ja",
        odds: 1.83,
      },
    ],
    status: "won",
    kickoff: isoDaysAgo(3, -3),
    placedAt: isoDaysAgo(3, -5),
    resolvedAt: isoDaysAgo(3, -1),
  }),
  buildBet({
    id: "b2",
    userId: "u1",
    type: "btts",
    selections: [
      {
        match: "Botev Vratsa - Montana",
        competition: "Bulgarian First League",
        selection: "Beide teams scoren: Ja",
        odds: 1.86,
      },
    ],
    status: "lost",
    kickoff: isoDaysAgo(3, -3),
    placedAt: isoDaysAgo(3, -5),
    resolvedAt: isoDaysAgo(3, -1),
  }),
  buildBet({
    id: "b3",
    userId: "u1",
    type: "btts",
    selections: [
      {
        match: "Slavia Sofia - CSKA 1948",
        competition: "Bulgarian First League",
        selection: "Beide teams scoren: Ja",
        odds: 1.72,
      },
    ],
    status: "won",
    kickoff: isoDaysAgo(1, -4),
    placedAt: isoDaysAgo(1, -6),
    resolvedAt: isoDaysAgo(1, -2),
  }),
  buildBet({
    id: "b4",
    userId: "u1",
    type: "btts",
    selections: [
      {
        match: "Ludogorets - Levski Sofia",
        competition: "Bulgarian First League",
        selection: "Beide teams scoren: Ja",
        odds: 1.66,
      },
    ],
    status: "open",
    kickoff: isoHoursFromNow(5),
    placedAt: isoHoursFromNow(-1),
  }),

  // Dikke Jan — accumulator gambler, mostly losing
  buildBet({
    id: "b5",
    userId: "u2",
    type: "accumulator",
    selections: [
      { match: "Ajax - PSV", selection: "Ajax wint", odds: 2.5, competition: "Eredivisie" },
      { match: "Feyenoord - AZ", selection: "Over 2.5", odds: 1.8, competition: "Eredivisie" },
      { match: "Twente - Utrecht", selection: "BTTS Ja", odds: 1.7, competition: "Eredivisie" },
    ],
    status: "lost",
    kickoff: isoDaysAgo(7, -4),
    placedAt: isoDaysAgo(7, -8),
    resolvedAt: isoDaysAgo(7, -1),
  }),
  buildBet({
    id: "b6",
    userId: "u2",
    type: "accumulator",
    selections: [
      { match: "Man City - Liverpool", selection: "Over 3.5", odds: 2.1, competition: "Premier League" },
      { match: "Real Madrid - Barcelona", selection: "Beide scoren", odds: 1.65, competition: "La Liga" },
    ],
    status: "won",
    kickoff: isoDaysAgo(5, -4),
    placedAt: isoDaysAgo(5, -8),
    resolvedAt: isoDaysAgo(5, -1),
  }),
  buildBet({
    id: "b7",
    userId: "u2",
    type: "1x2",
    selections: [
      { match: "Bayern - Dortmund", selection: "Bayern wint", odds: 1.55, competition: "Bundesliga" },
    ],
    status: "lost",
    kickoff: isoDaysAgo(2, -2),
    placedAt: isoDaysAgo(2, -5),
    resolvedAt: isoDaysAgo(2, -0.5),
  }),
  buildBet({
    id: "b8",
    userId: "u2",
    type: "accumulator",
    selections: [
      { match: "Inter - Milan", selection: "Inter wint", odds: 2.2, competition: "Serie A" },
      { match: "Juventus - Napoli", selection: "Over 2.5", odds: 1.9, competition: "Serie A" },
      { match: "Roma - Lazio", selection: "BTTS Ja", odds: 1.75, competition: "Serie A" },
      { match: "Atalanta - Fiorentina", selection: "Atalanta wint", odds: 1.6, competition: "Serie A" },
    ],
    status: "open",
    kickoff: isoHoursFromNow(20),
    placedAt: isoHoursFromNow(-3),
    notes: "Lekker combi'tje voor het weekend",
  }),

  // Balkon Bobby — steady value picker
  buildBet({
    id: "b9",
    userId: "u3",
    type: "overUnder",
    selections: [
      { match: "Arsenal - Chelsea", selection: "Over 2.5", odds: 1.95, competition: "Premier League" },
    ],
    status: "won",
    kickoff: isoDaysAgo(6, -4),
    placedAt: isoDaysAgo(6, -7),
    resolvedAt: isoDaysAgo(6, -1),
  }),
  buildBet({
    id: "b10",
    userId: "u3",
    type: "1x2",
    selections: [
      { match: "Brighton - Tottenham", selection: "Draw", odds: 3.4, competition: "Premier League" },
    ],
    status: "won",
    kickoff: isoDaysAgo(4, -3),
    placedAt: isoDaysAgo(4, -6),
    resolvedAt: isoDaysAgo(4, -1),
  }),
  buildBet({
    id: "b11",
    userId: "u3",
    type: "btts",
    selections: [
      { match: "PSG - Marseille", selection: "BTTS Ja", odds: 1.75, competition: "Ligue 1" },
    ],
    status: "lost",
    kickoff: isoDaysAgo(2, -2),
    placedAt: isoDaysAgo(2, -5),
    resolvedAt: isoDaysAgo(2, -0.5),
  }),

  // Oma Willemien — quiet but very accurate, low volume
  buildBet({
    id: "b12",
    userId: "u4",
    type: "1x2",
    selections: [
      { match: "Heracles - Sparta", selection: "Heracles wint", odds: 2.4, competition: "Eredivisie" },
    ],
    status: "won",
    kickoff: isoDaysAgo(10, -3),
    placedAt: isoDaysAgo(10, -7),
    resolvedAt: isoDaysAgo(10, -1),
  }),
  buildBet({
    id: "b13",
    userId: "u4",
    type: "correctScore",
    selections: [
      { match: "NEC - Vitesse", selection: "2-1 NEC", odds: 8.5, competition: "Eredivisie" },
    ],
    status: "won",
    kickoff: isoDaysAgo(8, -3),
    placedAt: isoDaysAgo(8, -7),
    resolvedAt: isoDaysAgo(8, -1),
  }),

  // VierVoor1 — longshot lover
  buildBet({
    id: "b14",
    userId: "u5",
    type: "accumulator",
    selections: [
      { match: "FC Volendam - Heerenveen", selection: "Volendam wint", odds: 4.2, competition: "Eredivisie" },
      { match: "Go Ahead Eagles - RKC", selection: "Over 3.5", odds: 2.8, competition: "Eredivisie" },
    ],
    status: "lost",
    kickoff: isoDaysAgo(3, -3),
    placedAt: isoDaysAgo(3, -7),
    resolvedAt: isoDaysAgo(3, -1),
  }),
  buildBet({
    id: "b15",
    userId: "u5",
    type: "accumulator",
    selections: [
      { match: "RB Leipzig - Stuttgart", selection: "Stuttgart wint", odds: 3.5, competition: "Bundesliga" },
      { match: "Köln - Mainz", selection: "Beide scoren", odds: 1.7, competition: "Bundesliga" },
      { match: "Bremen - Wolfsburg", selection: "Bremen wint", odds: 2.6, competition: "Bundesliga" },
    ],
    status: "open",
    kickoff: isoHoursFromNow(8),
    placedAt: isoHoursFromNow(-2),
    notes: "Yolo combi van het weekend 🚀",
  }),

  // Iwan
  buildBet({
    id: "b16",
    userId: "u6",
    type: "1x2",
    selections: [
      {
        match: "FC Utrecht - Sparta Rotterdam",
        selection: "FC Utrecht wint",
        odds: 1.65,
        competition: "Eredivisie",
      },
    ],
    status: "won",
    kickoff: isoDaysAgo(5, -4),
    placedAt: isoDaysAgo(5, -8),
    resolvedAt: isoDaysAgo(5, -1),
  }),
  buildBet({
    id: "b17",
    userId: "u6",
    type: "btts",
    selections: [
      { match: "Excelsior - Heracles", selection: "BTTS Ja", odds: 1.8, competition: "Eredivisie" },
    ],
    status: "open",
    kickoff: isoHoursFromNow(3),
    placedAt: isoHoursFromNow(-1),
  }),
];
