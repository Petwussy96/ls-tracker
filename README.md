# LS Tracker

Community bet tracker for the **Lucky Sucker** Facebook group (700+ members). Members submit their bets, the app tracks win rate, streaks, and average odds, and a live leaderboard shows who's actually picking the most winners.

Built with **Next.js 14** (App Router, Server Components, Server Actions), **TypeScript**, **Tailwind CSS**, **Prisma + SQLite**, and **Auth.js v5** (email magic links). Bilingual UI (Dutch default, English toggle).

---

## What's working

- ✅ Full UI: leaderboard, open bets, submit form, per-user profiles
- ✅ Bilingual NL/EN with localStorage-persisted toggle
- ✅ Leaderboard ranked by win rate, with W-L record, average odds, streak
- ✅ Open bets feed with filter (open / settled / all)
- ✅ Submission form persists to the database via Server Actions
- ✅ Profile pages with stats grid + "wins minus losses" sparkline
- ✅ **Email magic-link authentication** (Resend) with **invite codes** for signup
- ✅ Admin page for generating/revoking invite codes
- ✅ Dev fallback: magic links print to the server console when no email provider is configured
- ✅ **Bet resolution** — members mark their own bets won/lost/void; admins can override
- ✅ **Screenshot OCR parsing** — drop a betslip image; Tesseract OCR runs locally (no API costs) and a heuristic parser extracts match / selection / odds / accumulator legs
- ✅ **Accumulators** — submit forms supports add/remove legs; screenshot parser fills all legs of a multi-leg slip; combined odds auto-computed

## What we deliberately don't track

Stake and profit are out of scope by design. Members spend different amounts and we don't want the leaderboard to be a "who bets bigger" contest. The app tracks **outcomes** (open / won / lost / void) and **odds** (as context — winning at 3.50 is harder than at 1.20).

## What's next

- ⏳ **Multiple bets per screenshot** — when a single image contains several independent bets, propose them as separate cards
- ⏳ **Auto-resolution** — pair with a sports-results API so wins/losses get marked without manual input
- ⏳ **Deployment** — Vercel + a real (Postgres) database so the group can use it on phones

## Getting started

You need a Postgres database (Supabase free tier works) and a Cloudinary
account (free tier) before you can run the app — see the setup section below.

```bash
npm install                      # also runs `prisma generate` via postinstall
npm run db:push                  # apply schema to Supabase
npm run db:seed                  # load seed users + bets (incl. admin account)
npm run dev
```

Then open <http://localhost:3000>.

### Service setup (one-time)

**1. Supabase Postgres**

1. Create a project at <https://supabase.com> (free tier is fine).
2. Project Settings → Database → Connection string:
   - Copy the **Transaction pooler** URL (port 6543) → `DATABASE_URL`
   - Copy the **Direct connection** URL (port 5432) → `DIRECT_DATABASE_URL`
3. Paste both into `.env`.

**2. Cloudinary (avatar storage)**

1. Sign up at <https://cloudinary.com> (free tier: 25 GB storage / 25 GB bandwidth/month).
2. Dashboard → Settings → API Keys → copy `Cloud name`, `API Key`, `API Secret`.
3. Add to `.env` as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

**3. Resend (magic-link emails) — optional for dev**

Without `AUTH_RESEND_KEY` set, magic links print to the dev-server terminal.
For real emails: <https://resend.com> → create API key → add as `AUTH_RESEND_KEY`.
Note: until you verify a sending domain in Resend, emails only deliver to
test recipients you've added in the Resend dashboard.

### Logging in (dev)

The seed data gives the admin user (Iwan) an email address. To sign in for the first time:

1. Go to <http://localhost:3000/login>
2. Enter the admin's email (set in `src/lib/mockData.ts` — `i.dimitrijevic96@gmail.com` by default)
3. Without `AUTH_RESEND_KEY` set, the magic link is **printed to the dev server's terminal** instead of being emailed. Look for the `🔐 LS Tracker magic link for…` block, copy the URL, paste it in your browser.
4. You're in. Open `/admin/invites` to generate codes for the rest of the group.

## Deploying to Vercel

The codebase is already set up for Vercel — only environment configuration is needed.

### One-time deploy setup

1. **Push to GitHub.** Create a new repo, push the project.
2. **Create Vercel project.** Import the repo at <https://vercel.com/new>. Framework auto-detect = Next.js. Don't deploy yet — add env vars first.
3. **Add environment variables** in Vercel → Project → Settings → Environment Variables. Set them for **Production, Preview, and Development**:
   - `DATABASE_URL` — Supabase pooler URL (with `?pgbouncer=true&connection_limit=1`)
   - `DIRECT_DATABASE_URL` — Supabase direct URL
   - `AUTH_SECRET` — long random string (`openssl rand -base64 32`)
   - `AUTH_URL` — `https://luckysucker.duckdns.org` (or your domain)
   - `EMAIL_FROM` — `LS Tracker <onboarding@resend.dev>`
   - `AUTH_RESEND_KEY` — Resend API key
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. **Deploy.** Vercel will build, run `prisma generate` via postinstall, and host the app at a `*.vercel.app` URL.
5. **Push the schema to Supabase.** Locally with the Supabase env vars in `.env`:
   ```bash
   npm run db:push
   npm run db:seed   # creates the admin user
   ```

### Custom domain via DuckDNS

1. In Vercel → Project → Settings → Domains → add `luckysucker.duckdns.org`.
2. Vercel will ask you to point an A record to `76.76.21.21` (Vercel's anycast IP).
3. Go to <https://www.duckdns.org/> and update the IP for `luckysucker` to `76.76.21.21`.
4. Wait a few minutes for DNS propagation, then Vercel auto-provisions an HTTPS cert.
5. Update `AUTH_URL` in Vercel env vars to `https://luckysucker.duckdns.org`.

**Email caveat:** Resend won't let you verify a sending domain on a DuckDNS subdomain (no DKIM/SPF DNS access). For the first beta, either (a) add trusted-friend emails as Resend test recipients, or (b) register a cheap real domain (~€12/year) so magic links can be sent to anyone.

### Hooking up real email (Resend)

For production (or just to receive real emails in dev):

1. Sign up at <https://resend.com> (free tier: 3,000 emails/month, 100/day)
2. Verify a sending domain (or use `onboarding@resend.dev` for testing)
3. Create an API key: <https://resend.com/api-keys>
4. Add to `.env`:
   ```
   AUTH_RESEND_KEY="re_xxxxxxxxxxxx"
   EMAIL_FROM="LS Tracker <noreply@yourdomain.com>"
   ```
5. Restart `npm run dev`. Magic links now arrive in real inboxes.

### Useful scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run db:push` — push schema changes to the local SQLite db
- `npm run db:seed` — insert seed data
- `npm run db:reset` — wipe and reseed the db
- `npm run db:studio` — open Prisma Studio to inspect/edit data in a GUI

### Environment variables

See `.env.example`. Required for auth:

- `AUTH_SECRET` — any 32-char random string (`openssl rand -base64 32`)
- `AUTH_URL` — base URL (e.g. `http://localhost:3000`)
- `EMAIL_FROM` — sender shown on magic-link emails

Optional:

- `AUTH_RESEND_KEY` — Resend API key. If blank, magic links print to console.

**Screenshot parsing** runs locally via [Tesseract.js](https://github.com/naptha/tesseract.js) — no API key required. The first upload triggers a one-time download of ~12 MB of Dutch + English language data into `node_modules/tesseract.js`. Subsequent parses use the cached data and finish in 1-3 seconds. Accuracy is best on clean, high-contrast text (FB posts, betslip apps with white backgrounds); messy or low-resolution images may need manual correction.

## How signup works

Members can't sign up freely — only via invite codes that you (the admin) generate:

1. Admin visits `/admin/invites`, clicks "+ Create code"
2. App generates a code like `LS-XYZ4-7K2P`
3. Admin shares it in the Facebook group: *"Wil je op de tracker? Gebruik code LS-XYZ4-7K2P op ls-tracker.app/join"*
4. Member visits `/join`, enters the code, then their email + chosen username + display name
5. App creates the user, marks the code as consumed, sends a magic link
6. Member clicks the link → signed in

This keeps the app gated to actual group members while still letting them self-serve.

## Project layout

```
prisma/
├── schema.prisma                # User, Account, Session, InviteCode, Bet, Selection
└── seed.ts                      # Seeds from mockData

src/
├── auth.ts                      # Auth.js v5 config (Resend provider, Prisma adapter)
├── middleware.ts                # Cookie-only auth gate for /submit and /admin
├── types/next-auth.d.ts         # Type augmentation for session.user.{id,username,role}
├── app/
│   ├── layout.tsx               # Root layout, loads session, passes to Header
│   ├── page.tsx                 # Leaderboard (server) → LeaderboardClient
│   ├── bets/page.tsx            # Open bets (server) → BetsClient
│   ├── submit/                  # Server-component-gated, Server Action submit
│   ├── profile/[username]/      # (server) → ProfileClient
│   ├── login/                   # Magic-link request flow
│   ├── join/                    # Invite-code signup flow
│   ├── admin/invites/           # Admin-only invite management
│   ├── api/auth/[...nextauth]/  # Auth.js route handlers
│   └── actions/auth.ts          # Sign-out server action
├── components/                  # Header, Footer, *Client.tsx, forms, BetCard, …
└── lib/
    ├── db.ts                    # Prisma singleton
    ├── queries.ts               # Typed query helpers
    ├── i18n.ts                  # Translations
    ├── I18nContext.tsx          # Locale context provider
    ├── types.ts                 # Bet, User, BetSelection, …
    ├── format.ts                # Percent / odds / date formatters
    ├── stats.ts                 # Win rate / streak / odds calculations
    └── mockData.ts              # Seed data source
```

## Disclaimer

LS Tracker is a community tool, not a bookmaker. Bet responsibly. 18+.
