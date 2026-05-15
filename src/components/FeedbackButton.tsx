"use client";

import { useRef, useState, useTransition } from "react";
import { useI18n } from "@/lib/I18nContext";
import {
  submitFeedback,
  type FeedbackCategory,
  type SubmitFeedbackResult,
} from "@/app/actions/feedback";

type Variant = "footer" | "menu";

const CATEGORIES: { value: FeedbackCategory; nl: string; en: string; emoji: string }[] = [
  { value: "bug", nl: "Bug / fout", en: "Bug", emoji: "🐞" },
  { value: "parser", nl: "Bon werd verkeerd ingelezen", en: "Bet slip mis-parsed", emoji: "📸" },
  { value: "feature", nl: "Feature-verzoek", en: "Feature request", emoji: "✨" },
  { value: "design", nl: "Design / UI", en: "Design / UI", emoji: "🎨" },
  { value: "other", nl: "Anders", en: "Other", emoji: "💬" },
];

const SUPPORTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SCREENSHOT_BYTES = 6 * 1024 * 1024;

export function FeedbackButton({ variant = "footer" }: { variant?: Variant }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);

  if (variant === "menu") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full px-4 py-1.5 text-left text-sm text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-700"
        >
          💬 {locale === "nl" ? "Feedback geven" : "Send feedback"}
        </button>
        {open && <FeedbackModal onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-ink-200 px-3 py-1 font-semibold text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white"
      >
        💬 {locale === "nl" ? "Feedback geven" : "Send feedback"}
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { locale } = useI18n();
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitFeedbackResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickFile(file: File | null) {
    setFileError(null);
    if (!file) {
      setScreenshot(null);
      setPreviewUrl(null);
      return;
    }
    if (!SUPPORTED_TYPES.includes(file.type)) {
      setFileError(locale === "nl" ? "Alleen PNG / JPG / WebP / GIF." : "Only PNG / JPG / WebP / GIF.");
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setFileError(locale === "nl" ? "Te groot — max 6 MB." : "Too large — max 6 MB.");
      return;
    }
    setScreenshot(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      let screenshotBase64: string | undefined;
      let screenshotMimeType: string | undefined;
      if (screenshot) {
        screenshotBase64 = await fileToBase64(screenshot);
        screenshotMimeType = screenshot.type;
      }
      const r = await submitFeedback({
        category,
        message,
        screenshotBase64,
        screenshotMimeType,
      });
      setResult(r);
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-ink-200 bg-white shadow-2xl dark:border-ink-700 dark:bg-ink-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
          <h2 className="text-lg font-black text-ink-900 dark:text-white">
            💬 {locale === "nl" ? "Feedback" : "Feedback"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
          >
            ✕
          </button>
        </div>

        {result?.ok ? (
          <div className="p-8 text-center">
            <div className="text-5xl">🙏</div>
            <h3 className="mt-4 text-xl font-black text-ink-900 dark:text-white">
              {locale === "nl" ? "Bedankt!" : "Thanks!"}
            </h3>
            <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
              {locale === "nl"
                ? "Je feedback is binnen. Ik kijk er zo snel mogelijk naar."
                : "Got it. I'll review your feedback ASAP."}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
            >
              {locale === "nl" ? "Sluit" : "Close"}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 px-5 py-5">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
                {locale === "nl" ? "Categorie" : "Category"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => {
                  const active = category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                        active
                          ? "border-ink-900 bg-ink-900 text-white dark:border-white dark:bg-white dark:text-ink-900"
                          : "border-ink-200 bg-white text-ink-700 hover:border-ink-400 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:border-ink-500"
                      }`}
                    >
                      <span className="mr-1">{c.emoji}</span>
                      {locale === "nl" ? c.nl : c.en}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
                {locale === "nl" ? "Wat is er aan de hand?" : "What's up?"}
              </label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder={
                  locale === "nl"
                    ? "Zo specifiek mogelijk — wat probeerde je, wat ging er fout?"
                    : "Be specific — what were you trying, what went wrong?"
                }
                className="input"
              />
              <div className="mt-1 text-right text-[11px] text-ink-400">
                {message.length}/2000
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300">
                {locale === "nl" ? "Screenshot (optioneel)" : "Screenshot (optional)"}
              </label>
              {previewUrl ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="max-h-48 rounded-xl border border-ink-200 object-contain dark:border-ink-700"
                  />
                  <button
                    type="button"
                    onClick={() => pickFile(null)}
                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-900/80 text-xs text-white hover:bg-ink-900"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-white px-4 py-6 text-sm text-ink-500 hover:border-ink-500 hover:text-ink-700 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-400 dark:hover:border-ink-400 dark:hover:text-ink-200"
                >
                  📎 {locale === "nl" ? "Sleep of klik om een screenshot toe te voegen" : "Drop or click to add a screenshot"}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={SUPPORTED_TYPES.join(",")}
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              {fileError && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fileError}</p>
              )}
            </div>

            {result && !result.ok && (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                {errorMessage(result.error, locale)}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
              >
                {locale === "nl" ? "Annuleer" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={pending || message.trim().length < 3}
                className="rounded-full bg-ink-900 px-5 py-2 text-sm font-bold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-400 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100 dark:disabled:bg-ink-700"
              >
                {pending
                  ? locale === "nl"
                    ? "Versturen…"
                    : "Sending…"
                  : locale === "nl"
                    ? "Verstuur →"
                    : "Send →"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      if (!base64) reject(new Error("empty base64"));
      else resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

function errorMessage(
  err: Exclude<SubmitFeedbackResult, { ok: true }>["error"],
  locale: "nl" | "en",
): string {
  const nl: Record<typeof err, string> = {
    not_authenticated: "Log eerst in.",
    invalid_category: "Kies een categorie.",
    invalid_message: "Schrijf even iets meer (min. 3 tekens).",
    message_too_long: "Te lang — houd het onder 2000 tekens.",
    screenshot_too_large: "Screenshot te groot (max 6 MB).",
    unsupported_image_type: "Alleen PNG / JPG / WebP / GIF.",
    upload_failed: "Upload mislukt. Probeer zonder screenshot.",
    rate_limited: "Veel feedback van jou! Wacht even.",
    server_error: "Iets ging mis. Probeer opnieuw.",
  };
  const en: Record<typeof err, string> = {
    not_authenticated: "Sign in first.",
    invalid_category: "Pick a category.",
    invalid_message: "Write a bit more (3 chars min).",
    message_too_long: "Too long — keep it under 2000 chars.",
    screenshot_too_large: "Screenshot too large (6 MB max).",
    unsupported_image_type: "Only PNG / JPG / WebP / GIF.",
    upload_failed: "Upload failed. Try without screenshot.",
    rate_limited: "Lots of feedback from you! Wait a bit.",
    server_error: "Something went wrong. Try again.",
  };
  return (locale === "nl" ? nl : en)[err];
}
