"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { rateLimit, sweepExpiredBuckets } from "@/lib/rateLimit";

export type UpdateRoleResult =
  | { ok: true }
  | {
      ok: false;
      error: "not_admin" | "user_not_found" | "invalid_role" | "cannot_demote_self";
    };

const VALID_ROLES = ["member", "moderator", "admin"] as const;
type Role = (typeof VALID_ROLES)[number];

export async function updateUserRole(input: {
  userId: string;
  role: Role;
}): Promise<UpdateRoleResult> {
  sweepExpiredBuckets();
  const session = await auth();
  if (session?.user?.role !== "admin") return { ok: false, error: "not_admin" };
  // Prevent mass-role-change abuse — 30 ops/hr per admin
  const rl = rateLimit(`role:${session.user.id}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) return { ok: false, error: "not_admin" };

  if (!(VALID_ROLES as readonly string[]).includes(input.role)) {
    return { ok: false, error: "invalid_role" };
  }

  // Prevent footgun: don't let the only admin demote themselves.
  if (input.userId === session.user.id && input.role !== "admin") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      return { ok: false, error: "cannot_demote_self" };
    }
  }

  const exists = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!exists) return { ok: false, error: "user_not_found" };

  await prisma.user.update({
    where: { id: input.userId },
    data: { role: input.role },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true };
}
