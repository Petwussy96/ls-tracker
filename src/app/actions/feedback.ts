"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import { rateLimit, sweepExpiredBuckets } from "@/lib/rateLimit";

const CATEGORIES = ["bug", "parser", "feature", "design", "other"] as const;
export type FeedbackCategory = (typeof CATEGORIES)[number];

const MAX_MESSAGE_LEN = 2000;
const MAX_SCREENSHOT_BYTES = 6 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// Cap submissions: 10/hour per user. Sufficient for legit use, blocks spam.
const FEEDBACK_LIMIT = 10;
const FEEDBACK_WINDOW_MS = 60 * 60 * 1000;

export type SubmitFeedbackInput = {
  category: FeedbackCategory;
  message: string;
  // base64 PNG/JPEG payload (no data: prefix), optional
  screenshotBase64?: string;
  screenshotMimeType?: string;
};

export type SubmitFeedbackResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "invalid_category"
        | "invalid_message"
        | "message_too_long"
        | "screenshot_too_large"
        | "unsupported_image_type"
        | "upload_failed"
        | "rate_limited"
        | "server_error";
    };

export async function submitFeedback(
  input: SubmitFeedbackInput,
): Promise<SubmitFeedbackResult> {
  sweepExpiredBuckets();

  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };

  const userId = session.user.id;
  const rl = rateLimit(`feedback:${userId}`, FEEDBACK_LIMIT, FEEDBACK_WINDOW_MS);
  if (!rl.allowed) return { ok: false, error: "rate_limited" };

  if (!(CATEGORIES as readonly string[]).includes(input.category)) {
    return { ok: false, error: "invalid_category" };
  }

  const message = input.message.trim();
  if (message.length < 3) return { ok: false, error: "invalid_message" };
  if (message.length > MAX_MESSAGE_LEN) return { ok: false, error: "message_too_long" };

  let screenshotUrl: string | null = null;

  if (input.screenshotBase64 && input.screenshotMimeType) {
    if (!SUPPORTED_TYPES.has(input.screenshotMimeType)) {
      return { ok: false, error: "unsupported_image_type" };
    }
    const approxBytes = (input.screenshotBase64.length * 3) / 4;
    if (approxBytes > MAX_SCREENSHOT_BYTES) {
      return { ok: false, error: "screenshot_too_large" };
    }

    if (!isCloudinaryConfigured()) {
      // Fail soft — accept feedback even if Cloudinary isn't configured,
      // just without the screenshot.
      console.warn("Cloudinary not configured; saving feedback without screenshot");
    } else {
      try {
        const cloudinary = getCloudinary();
        const dataUrl = `data:${input.screenshotMimeType};base64,${input.screenshotBase64}`;
        const uploaded = await cloudinary.uploader.upload(dataUrl, {
          folder: "ls-tracker/feedback",
          resource_type: "image",
          transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto" }],
        });
        screenshotUrl = uploaded.secure_url;
      } catch (err) {
        console.error("Feedback screenshot upload failed", err);
        return { ok: false, error: "upload_failed" };
      }
    }
  }

  try {
    const created = await prisma.feedback.create({
      data: {
        userId,
        category: input.category,
        message,
        screenshot: screenshotUrl,
        status: "open",
      },
      select: { id: true },
    });
    revalidatePath("/admin");
    revalidatePath("/admin/feedback");
    return { ok: true, id: created.id };
  } catch (err) {
    console.error("Feedback insert failed", err);
    return { ok: false, error: "server_error" };
  }
}

// Admin marks feedback as addressed or wontfix.
export async function updateFeedbackStatus(input: {
  id: string;
  status: "open" | "addressed" | "wontfix";
}): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };
  const role = session.user.role;
  if (role !== "admin" && role !== "moderator") return { ok: false };

  try {
    await prisma.feedback.update({
      where: { id: input.id },
      data: {
        status: input.status,
        resolvedAt: input.status === "open" ? null : new Date(),
        resolvedById: input.status === "open" ? null : session.user.id,
      },
    });
    revalidatePath("/admin/feedback");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    console.error("updateFeedbackStatus failed", err);
    return { ok: false };
  }
}
