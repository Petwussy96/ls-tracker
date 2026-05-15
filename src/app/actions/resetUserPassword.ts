"use server";

// Admin-only password reset — clears the user's passwordHash AND generates
// a one-time magic-link the admin can share. When the user clicks the link,
// they're logged in but immediately face the password-setup modal
// (because passwordHash is now null) and pick a new one.
//
// This is the temporary workaround until we have a verified email-sending
// domain. Then we'll switch to a real "forgot password" email flow.

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { rateLimit, sweepExpiredBuckets } from "@/lib/rateLimit";

const TOKEN_LIFETIME_HOURS = 24;

export type ResetPasswordResult =
  | { ok: true; url: string; expiresAt: string; displayName: string }
  | {
      ok: false;
      error:
        | "not_admin"
        | "user_not_found"
        | "missing_secret"
        | "missing_base_url"
        | "rate_limited"
        | "server_error";
    };

export async function resetUserPassword(input: {
  userId: string;
}): Promise<ResetPasswordResult> {
  sweepExpiredBuckets();

  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false, error: "not_admin" };

  // Limit how many password resets a single admin can fire — 20/hr
  const rl = rateLimit(`reset:${session.user.id}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, displayName: true },
  });
  if (!user || !user.email) return { ok: false, error: "user_not_found" };

  const secret = process.env.AUTH_SECRET;
  if (!secret) return { ok: false, error: "missing_secret" };

  const baseUrl =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL ||
    null;
  if (!baseUrl) return { ok: false, error: "missing_base_url" };

  // 1. Clear passwordHash → forces user through password-setup modal on
  //    next page load after the magic-link signs them in.
  // 2. Invalidate ALL existing sessions for safety.
  // 3. Create a fresh verification token + URL.
  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = createHash("sha256")
    .update(`${rawToken}${secret}`)
    .digest("hex");
  const expires = new Date(Date.now() + TOKEN_LIFETIME_HOURS * 60 * 60 * 1000);

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: null },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.verificationToken.create({
        data: { identifier: user.email, token: hashedToken, expires },
      }),
    ]);
  } catch (err) {
    console.error("resetUserPassword tx failed", err);
    return { ok: false, error: "server_error" };
  }

  const origin = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
  const url = new URL("/api/auth/callback/resend", origin);
  url.searchParams.set("callbackUrl", "/");
  url.searchParams.set("token", rawToken);
  url.searchParams.set("email", user.email);

  revalidatePath("/admin/users");
  return {
    ok: true,
    url: url.toString(),
    expiresAt: expires.toISOString(),
    displayName: user.displayName,
  };
}
