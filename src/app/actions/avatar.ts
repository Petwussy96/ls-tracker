"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import { AVATAR_PRESETS } from "@/lib/avatarPresets";

export type AvatarResult =
  | { ok: true; url: string }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "invalid_format"
        | "too_large"
        | "invalid_preset"
        | "save_failed"
        | "storage_not_configured";
    };

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB on the base64 payload

// Whitelist prevents path traversal via user input.
const PRESETS = new Set(AVATAR_PRESETS);

/**
 * Upload a base64-encoded image and use it as the user's avatar.
 * The client is responsible for resizing/cropping to a square (~256x256)
 * before sending. We additionally pipe it through Cloudinary's `fill`
 * transformation as belt-and-braces.
 */
export async function uploadAvatar(dataUrl: string): Promise<AvatarResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };

  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(dataUrl)) {
    return { ok: false, error: "invalid_format" };
  }
  // Rough size check on the payload (base64 ≈ 4/3 of the raw bytes).
  if (dataUrl.length > MAX_BYTES * 1.4) {
    return { ok: false, error: "too_large" };
  }

  if (!isCloudinaryConfigured()) {
    console.error("Cloudinary env vars missing — cannot upload avatar.");
    return { ok: false, error: "storage_not_configured" };
  }

  let url: string;
  try {
    const result = await getCloudinary().uploader.upload(dataUrl, {
      folder: "ls-tracker/avatars",
      public_id: session.user.id, // deterministic — overwrites previous upload
      overwrite: true,
      invalidate: true,
      resource_type: "image",
      transformation: [
        { width: 256, height: 256, crop: "fill", gravity: "auto" },
      ],
    });
    url = result.secure_url;
  } catch (err) {
    console.error("avatar upload failed", err);
    return { ok: false, error: "save_failed" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: url },
  });

  revalidatePath(`/profile/${session.user.username}`);
  revalidatePath("/");
  revalidatePath("/bets");
  return { ok: true, url };
}

/**
 * Use one of the bundled preset avatars — no upload, just sets the URL to
 * the static SVG that ships with the deployment.
 */
export async function setPresetAvatar(presetName: string): Promise<AvatarResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };
  if (!PRESETS.has(presetName)) return { ok: false, error: "invalid_preset" };

  const url = `/avatars/presets/${presetName}`;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: url },
  });

  revalidatePath(`/profile/${session.user.username}`);
  revalidatePath("/");
  revalidatePath("/bets");
  return { ok: true, url };
}
