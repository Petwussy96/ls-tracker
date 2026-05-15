"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { rateLimit, sweepExpiredBuckets } from "@/lib/rateLimit";
import { createUserSession, hashPassword, isStrongEnough } from "@/lib/password";

// We don't have request bodies in server actions, but we can read headers.
// Vercel sets x-forwarded-for; fall back to a UA hash for local/dev.
function clientKey(): string {
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return ip;
}

// Code validation is cheap, but brute-forcing invite codes is the main
// attack we care about — cap at 20 attempts per IP per 10 minutes.
const VALIDATE_LIMIT = 20;
const VALIDATE_WINDOW_MS = 10 * 60 * 1000;

// Actual signups are rarer — cap at 5 per IP per hour. Stops bots from
// burning through a stack of leaked invite codes.
const SIGNUP_LIMIT = 5;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;

export type ValidateCodeResult =
  | { ok: true }
  | { ok: false; error: "unknown" | "consumed" | "expired" | "rate_limited" };

export async function validateInviteCode(code: string): Promise<ValidateCodeResult> {
  sweepExpiredBuckets();

  const rl = rateLimit(`invite-validate:${clientKey()}`, VALIDATE_LIMIT, VALIDATE_WINDOW_MS);
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "unknown" };

  const invite = await prisma.inviteCode.findUnique({ where: { code: normalized } });
  if (!invite) return { ok: false, error: "unknown" };
  if (invite.consumedAt) return { ok: false, error: "consumed" };
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { ok: false, error: "expired" };
  }
  return { ok: true };
}

export type SignupInput = {
  code: string;
  email: string;
  username: string;
  displayName: string;
  password: string;
};

export type SignupResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "invalid_code"
        | "code_consumed"
        | "code_expired"
        | "invalid_email"
        | "email_taken"
        | "invalid_username"
        | "username_taken"
        | "invalid_displayname"
        | "weak_password"
        | "send_failed"
        | "rate_limited";
    };

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export async function signupWithInvite(input: SignupInput): Promise<SignupResult> {
  sweepExpiredBuckets();

  const rl = rateLimit(`signup:${clientKey()}`, SIGNUP_LIMIT, SIGNUP_WINDOW_MS);
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  const code = input.code.trim().toUpperCase();
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim();
  const displayName = input.displayName.trim();

  // ---- Validation ----
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "invalid_email" };
  }
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: "invalid_username" };
  }
  if (displayName.length < 2 || displayName.length > 40) {
    return { ok: false, error: "invalid_displayname" };
  }
  if (!isStrongEnough(input.password)) {
    return { ok: false, error: "weak_password" };
  }

  let newUserId: string | null = null;
  try {
    const passwordHash = await hashPassword(input.password);
    await prisma.$transaction(async (tx) => {
      const invite = await tx.inviteCode.findUnique({ where: { code } });
      if (!invite) throw new Error("invalid_code");
      if (invite.consumedAt) throw new Error("code_consumed");
      if (invite.expiresAt && invite.expiresAt < new Date()) throw new Error("code_expired");

      const emailTaken = await tx.user.findUnique({ where: { email } });
      if (emailTaken) throw new Error("email_taken");

      const usernameTaken = await tx.user.findUnique({ where: { username } });
      if (usernameTaken) throw new Error("username_taken");

      const user = await tx.user.create({
        data: {
          email,
          username,
          displayName,
          passwordHash,
          role: "member",
        },
      });
      newUserId = user.id;

      await tx.inviteCode.update({
        where: { code },
        data: { consumedAt: new Date(), consumedById: user.id },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const known = [
      "invalid_code",
      "code_consumed",
      "code_expired",
      "email_taken",
      "username_taken",
    ] as const;
    if ((known as readonly string[]).includes(msg)) {
      return { ok: false, error: msg as Extract<SignupResult, { ok: false }>["error"] };
    }
    console.error("signup tx failed", err);
    return { ok: false, error: "send_failed" };
  }

  // Auto-login the brand-new user
  if (!newUserId) return { ok: false, error: "send_failed" };
  try {
    await createUserSession(newUserId);
  } catch (err) {
    console.error("createUserSession failed", err);
    return { ok: false, error: "send_failed" };
  }

  return { ok: true };
}
