"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword, isStrongEnough } from "@/lib/password";

export type SetMyPasswordResult =
  | { ok: true }
  | {
      ok: false;
      error: "not_authenticated" | "weak_password" | "already_set" | "server_error";
    };

/**
 * Sets the current user's password. Only allowed when they don't have one yet
 * (i.e. accounts that pre-date the password switch). After setting, the user
 * stays logged in via their existing session.
 */
export async function setMyPassword(input: {
  password: string;
}): Promise<SetMyPasswordResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };

  if (!isStrongEnough(input.password)) {
    return { ok: false, error: "weak_password" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "not_authenticated" };
  if (user.passwordHash) return { ok: false, error: "already_set" };

  try {
    const hash = await hashPassword(input.password);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: hash },
    });
    return { ok: true };
  } catch (err) {
    console.error("setMyPassword failed", err);
    return { ok: false, error: "server_error" };
  }
}

