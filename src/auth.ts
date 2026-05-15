// Auth.js v5 configuration for LS Tracker.
//
// - Email magic-link auth via the Resend provider.
// - Falls back to logging the magic link to the server console when
//   AUTH_RESEND_KEY isn't set (great for local dev — no email setup required).
// - Database session strategy via the Prisma adapter.
// - signIn callback rejects unknown emails so /login can only be used by
//   accounts that were pre-created via /join (invite code flow).

import NextAuth from "next-auth";
import { cache } from "react";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

const EMAIL_FROM = process.env.EMAIL_FROM || "LS Tracker <onboarding@resend.dev>";

const nextAuthExports = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
  providers: [
    Resend({
      from: EMAIL_FROM,
      apiKey: process.env.AUTH_RESEND_KEY || "dev-noop",
      async sendVerificationRequest({ identifier, url, provider }) {
        // Dev fallback: no Resend key configured — print the link to console
        if (!process.env.AUTH_RESEND_KEY) {
          console.log("\n────────────────────────────────────────────────────");
          console.log(`🔐  LS Tracker magic link for ${identifier}`);
          console.log(`    ${url}`);
          console.log("────────────────────────────────────────────────────\n");
          return;
        }

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: provider.from,
            to: identifier,
            subject: "Inloggen bij LS Tracker",
            html: renderMagicLinkEmail(url),
            text: `Klik hier om in te loggen bij LS Tracker:\n\n${url}\n\nLink is 24 uur geldig.\n\nGeen account aangevraagd? Negeer deze mail.`,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Resend send failed (${res.status}): ${text}`);
        }
      },
    }),
  ],
  callbacks: {
    /**
     * Defence in depth: only allow sign-in for users that already exist.
     * New users sign up via /join (invite code flow), which pre-creates the
     * User row before issuing the magic link.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "resend") return true;
      if (!user.email) return false;
      const existing = await prisma.user.findUnique({ where: { email: user.email } });
      return Boolean(existing);
    },

    /** Expose username + role on the session so client code can use them. */
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // The Prisma adapter loads the full User row, so these are populated.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any;
        session.user.username = u.username;
        session.user.role = u.role ?? "member";
        // Whether the user still needs to choose a password (legacy accounts
        // from before the password switch). Read from the User row that
        // PrismaAdapter already loaded — saves the layout an extra query.
        session.user.needsPasswordSetup = !u.passwordHash;
        // Our User model uses `displayName` rather than the default `name`,
        // so populate `session.user.name` from displayName for consistency.
        if (u.displayName) {
          session.user.name = u.displayName;
        }
      }
      return session;
    },
  },
});

function renderMagicLinkEmail(url: string): string {
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; padding: 32px;">
    <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="display: inline-block; background: #0f172a; color: white; padding: 8px 14px; border-radius: 8px; font-weight: 900; letter-spacing: -0.04em;">LS</div>
      <h1 style="margin: 24px 0 8px; font-size: 22px; color: #0f172a;">Inloggen bij LS Tracker</h1>
      <p style="margin: 0 0 24px; color: #475569; font-size: 14px;">
        Klik op de knop hieronder om in te loggen. De link is 24 uur geldig.
      </p>
      <a href="${url}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Inloggen →
      </a>
      <p style="margin: 32px 0 0; color: #94a3b8; font-size: 12px;">
        Werkt de knop niet? Plak deze link in je browser:<br>
        <span style="word-break: break-all; color: #475569;">${url}</span>
      </p>
      <p style="margin: 24px 0 0; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        Geen account aangevraagd? Negeer deze mail. Speel bewust. 18+.
      </p>
    </div>
  </body>
</html>
  `.trim();
}


// React cache() dedupes auth() within a single request — so the root layout
// and the page component share a single session lookup instead of two.
export const { handlers, signIn, signOut } = nextAuthExports;
export const auth = cache(nextAuthExports.auth);
