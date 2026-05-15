"use server";

// Admin-only tool: generate a magic-link URL for a given email without
// actually sending an email. The admin then copies the URL and shares it
// manually (WhatsApp / FB Messenger / etc).
//
// This is a workaround for the email-domain blocker: until we have a
// verified sending domain at Resend, real emails only reach the admin's
// own address. With this tool the admin can still onboard testers.
//
// We replicate Auth.js v5's verification-token flow exactly so the URL is
// indistinguishable from a real magic link:
//   1. random 32-byte hex token
//   2. store SHA-256(token + AUTH_SECRET) in VerificationToken
//   3. URL: /api/auth/callback/resend?callbackUrl=...&token=...&email=...

import { createHash, randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const TOKEN_LIFETIME_HOURS = 24;

export type GenerateMagicLinkResult =
  | { ok: true; url: string; expiresAt: string; displayName: string }
  | {
      ok: false;
      error:
        | "not_admin"
        | "invalid_email"
        | "unknown_email"
        | "missing_secret"
        | "missing_base_url"
        | "server_error";
    };

export async function generateAdminMagicLink(input: {
  email: string;
}): Promise<GenerateMagicLinkResult> {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return { ok: false, error: "not_admin" };
  }

  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { displayName: true },
  });
  if (!user) {
    return { ok: false, error: "unknown_email" };
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) return { ok: false, error: "missing_secret" };

  const baseUrl =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL ||
    null;
  if (!baseUrl) return { ok: false, error: "missing_base_url" };

  // Auth.js stores SHA-256(rawToken + secret) as hex; URL contains rawToken
  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = createHash("sha256")
    .update(`${rawToken}${secret}`)
    .digest("hex");
  const expires = new Date(Date.now() + TOKEN_LIFETIME_HOURS * 60 * 60 * 1000);

  try {
    await prisma.verificationToken.create({
      data: { identifier: email, token: hashedToken, expires },
    });
  } catch (err) {
    console.error("Failed to store verification token", err);
    return { ok: false, error: "server_error" };
  }

  const origin = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
  const url = new URL("/api/auth/callback/resend", origin);
  url.searchParams.set("callbackUrl", "/");
  url.searchParams.set("token", rawToken);
  url.searchParams.set("email", email);

  return {
    ok: true,
    url: url.toString(),
    expiresAt: expires.toISOString(),
    displayName: user.displayName,
  };
}
