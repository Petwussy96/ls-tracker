"use server";

import { prisma } from "@/lib/db";
import { signIn } from "@/auth";
import { rateLimit, sweepExpiredBuckets } from "@/lib/rateLimit";

export type LoginResult =
  | { ok: true }
  | { ok: false; error: "unknown_email" | "invalid_email" | "send_failed" | "rate_limited" };

// At most 5 magic-link requests per email per 15 minutes. Prevents accidental
// double-clicks and spamming someone's inbox.
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function requestMagicLink(email: string): Promise<LoginResult> {
  sweepExpiredBuckets();

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, error: "invalid_email" };
  }

  const rl = rateLimit(`login:${trimmed}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!rl.allowed) {
    return { ok: false, error: "rate_limited" };
  }

  const user = await prisma.user.findUnique({ where: { email: trimmed } });
  if (!user) {
    return { ok: false, error: "unknown_email" };
  }

  try {
    await signIn("resend", { email: trimmed, redirect: false });
    return { ok: true };
  } catch (err) {
    console.error("signIn failed", err);
    return { ok: false, error: "send_failed" };
  }
}
