"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword, isStrongEnough, verifyPassword } from "@/lib/password";
import { rateLimit, sweepExpiredBuckets } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type UpdateProfileResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "invalid_displayname"
        | "invalid_email"
        | "email_taken"
        | "rate_limited"
        | "server_error";
    };

export async function updateProfile(input: {
  displayName: string;
  email: string;
}): Promise<UpdateProfileResult> {
  sweepExpiredBuckets();

  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };

  const rl = rateLimit(`profile:${session.user.id}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  const displayName = input.displayName.trim();
  if (displayName.length < 2 || displayName.length > 40) {
    return { ok: false, error: "invalid_displayname" };
  }

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "invalid_email" };

  // Check email uniqueness (allow keeping your own)
  const conflict = await prisma.user.findFirst({
    where: { email, NOT: { id: session.user.id } },
    select: { id: true },
  });
  if (conflict) return { ok: false, error: "email_taken" };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { displayName, email },
    });
  } catch (err) {
    console.error("updateProfile failed", err);
    return { ok: false, error: "server_error" };
  }

  revalidatePath("/");
  revalidatePath("/bets");
  if (session.user.username) revalidatePath(`/profile/${session.user.username}`);
  revalidatePath("/settings");
  return { ok: true };
}

export type ChangePasswordResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "wrong_current"
        | "weak_new"
        | "rate_limited"
        | "no_password_set"
        | "server_error";
    };

export async function changePassword(input: {
  current: string;
  next: string;
}): Promise<ChangePasswordResult> {
  sweepExpiredBuckets();

  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };

  const rl = rateLimit(`pwchange:${session.user.id}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  if (!isStrongEnough(input.next)) return { ok: false, error: "weak_new" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "not_authenticated" };
  if (!user.passwordHash) return { ok: false, error: "no_password_set" };

  const ok = await verifyPassword(input.current, user.passwordHash);
  if (!ok) return { ok: false, error: "wrong_current" };

  try {
    const newHash = await hashPassword(input.next);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash },
    });
    return { ok: true };
  } catch (err) {
    console.error("changePassword failed", err);
    return { ok: false, error: "server_error" };
  }
}
