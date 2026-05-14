"use server";

import { prisma } from "@/lib/db";
import { signIn } from "@/auth";

export type ValidateCodeResult =
  | { ok: true }
  | { ok: false; error: "unknown" | "consumed" | "expired" };

export async function validateInviteCode(code: string): Promise<ValidateCodeResult> {
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
        | "send_failed";
    };

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export async function signupWithInvite(input: SignupInput): Promise<SignupResult> {
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

  // Re-validate code under a transaction to avoid TOCTOU races.
  try {
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
          role: "member",
        },
      });

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

  // Send the magic link (the user now exists, so signIn's callback will allow it)
  try {
    await signIn("resend", { email, redirect: false });
  } catch (err) {
    console.error("signIn failed", err);
    return { ok: false, error: "send_failed" };
  }

  return { ok: true };
}
