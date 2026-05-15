"use server";

import { prisma } from "@/lib/db";
import {
  createUserSession,
  hashPassword,
  isStrongEnough,
  verifyPassword,
  MIN_PASSWORD_LEN,
} from "@/lib/password";
import { rateLimit, sweepExpiredBuckets } from "@/lib/rateLimit";

const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export type CheckEmailResult =
  | { ok: true; status: "needs_password" | "needs_setup" }
  | { ok: false; error: "invalid_email" | "unknown_email" | "rate_limited" };

/**
 * First step of login: tell the form whether this email exists, and whether
 * the user needs to set an initial password vs. just type their existing one.
 */
export async function checkEmail(email: string): Promise<CheckEmailResult> {
  sweepExpiredBuckets();

  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    return { ok: false, error: "invalid_email" };
  }

  const rl = rateLimit(`login-check:${e}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  const user = await prisma.user.findUnique({
    where: { email: e },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "unknown_email" };

  return {
    ok: true,
    status: user.passwordHash ? "needs_password" : "needs_setup",
  };
}

export type LoginResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "invalid_email"
        | "unknown_email"
        | "wrong_password"
        | "needs_setup"
        | "rate_limited"
        | "server_error";
    };

export async function loginWithPassword(input: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  sweepExpiredBuckets();

  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  const rl = rateLimit(`login:${email}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
  if (!user) return { ok: false, error: "unknown_email" };
  if (!user.passwordHash) return { ok: false, error: "needs_setup" };

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) return { ok: false, error: "wrong_password" };

  try {
    await createUserSession(user.id);
    return { ok: true };
  } catch (err) {
    console.error("createUserSession failed", err);
    return { ok: false, error: "server_error" };
  }
}

export type SetupResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "invalid_email"
        | "unknown_email"
        | "already_set"
        | "weak_password"
        | "rate_limited"
        | "server_error";
    };

/**
 * Existing account claims itself by setting an initial password.
 * Only works when `passwordHash` is still NULL — so it's not a back-door
 * to reset another user's password.
 */
export async function setInitialPassword(input: {
  email: string;
  password: string;
}): Promise<SetupResult> {
  sweepExpiredBuckets();

  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  const rl = rateLimit(`setup:${email}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  if (!isStrongEnough(input.password)) {
    return { ok: false, error: "weak_password" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
  if (!user) return { ok: false, error: "unknown_email" };
  if (user.passwordHash) return { ok: false, error: "already_set" };

  try {
    const hash = await hashPassword(input.password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash },
    });
    await createUserSession(user.id);
    return { ok: true };
  } catch (err) {
    console.error("setInitialPassword failed", err);
    return { ok: false, error: "server_error" };
  }
}

export { MIN_PASSWORD_LEN };
