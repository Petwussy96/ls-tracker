"use server";

import { prisma } from "@/lib/db";
import { signIn } from "@/auth";

export type LoginResult =
  | { ok: true }
  | { ok: false; error: "unknown_email" | "invalid_email" | "send_failed" };

export async function requestMagicLink(email: string): Promise<LoginResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, error: "invalid_email" };
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
