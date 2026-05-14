"use server";

import { auth } from "@/auth";
import { parseBetscreenshot, type ParseResult } from "@/lib/parseScreenshot";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export type ParseScreenshotAction =
  | ParseResult
  | { ok: false; error: "not_authenticated" | "too_large" | "unsupported_type" };

export async function parseScreenshotAction(input: {
  base64: string;
  mediaType: string;
}): Promise<ParseScreenshotAction> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };

  if (!SUPPORTED_TYPES.has(input.mediaType)) {
    return { ok: false, error: "unsupported_type" };
  }

  const approxBytes = (input.base64.length * 3) / 4;
  if (approxBytes > MAX_IMAGE_BYTES) {
    return { ok: false, error: "too_large" };
  }

  return parseBetscreenshot(
    input.base64,
    input.mediaType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
  );
}
