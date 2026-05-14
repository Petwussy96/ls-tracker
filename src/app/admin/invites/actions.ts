"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

async function requireAdmin(): Promise<{ id: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "not_authenticated" };
  if (session.user.role !== "admin") return { error: "not_admin" };
  return { id: session.user.id };
}

/** Code format: LS-XXXX-YYYY (12 chars including dashes). Easy to read aloud. */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/l
  const pick = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `LS-${pick(4)}-${pick(4)}`;
}

export async function createInvite(opts: {
  note?: string;
  expiresInDays?: number;
}): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  if ("error" in admin) return { ok: false, error: admin.error };

  // Retry up to 5 times in the (astronomically rare) case of a collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const expiresAt =
      opts.expiresInDays && opts.expiresInDays > 0
        ? new Date(Date.now() + opts.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    try {
      await prisma.inviteCode.create({
        data: {
          code,
          createdById: admin.id,
          expiresAt,
          note: opts.note?.trim() || null,
        },
      });
      revalidatePath("/admin/invites");
      return { ok: true, code };
    } catch (err) {
      // Unique violation? Try again with new code.
      // We can detect via the prisma error code, but a simple retry is fine.
      if (attempt === 4) {
        console.error("createInvite failed", err);
        return { ok: false, error: "create_failed" };
      }
    }
  }
  return { ok: false, error: "create_failed" };
}

export async function revokeInvite(
  inviteId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if ("error" in admin) return { ok: false, error: admin.error };

  const invite = await prisma.inviteCode.findUnique({ where: { id: inviteId } });
  if (!invite) return { ok: false, error: "not_found" };
  if (invite.consumedAt) return { ok: false, error: "already_consumed" };

  await prisma.inviteCode.delete({ where: { id: inviteId } });
  revalidatePath("/admin/invites");
  return { ok: true };
}
