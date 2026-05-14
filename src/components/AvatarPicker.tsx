"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/I18nContext";
import { setPresetAvatar, uploadAvatar } from "@/app/actions/avatar";
import { AVATAR_PRESETS } from "@/lib/avatarPresets";
import { Avatar } from "@/components/Avatar";

type Tab = "upload" | "preset";

export function AvatarPicker({
  open,
  onClose,
  currentUser,
}: {
  open: boolean;
  onClose: () => void;
  currentUser: { displayName: string; image?: string | null };
}) {
  const { locale } = useI18n();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("preset");
  const [preview, setPreview] = useState<string | null>(null); // data URL of cropped image
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Reset preview/error when reopened
  useEffect(() => {
    if (open) {
      setPreview(null);
      setError(null);
      setTab("preset");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  async function handleFile(file: File) {
    setError(null);
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      setError(
        locale === "nl"
          ? "Alleen PNG, JPG of WEBP toegestaan."
          : "Only PNG, JPG or WEBP allowed.",
      );
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(locale === "nl" ? "Bestand is te groot (max 5 MB)." : "File too large (max 5 MB).");
      return;
    }
    try {
      const cropped = await fileToCenterCroppedDataUrl(file, 256);
      setPreview(cropped);
    } catch {
      setError(
        locale === "nl" ? "Kon de afbeelding niet inlezen." : "Could not read the image.",
      );
    }
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function submitUpload() {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      const res = await uploadAvatar(preview);
      if (!res.ok) {
        setError(errorMessage(res.error, locale));
        return;
      }
      router.refresh();
      onClose();
    });
  }

  function pickPreset(name: string) {
    setError(null);
    startTransition(async () => {
      const res = await setPresetAvatar(name);
      if (!res.ok) {
        setError(errorMessage(res.error, locale));
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl dark:bg-ink-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
          <h2 className="text-lg font-black tracking-tight text-ink-900 dark:text-white">
            {locale === "nl" ? "Avatar wijzigen" : "Change avatar"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-ink-100 px-3 py-2 dark:border-ink-800">
          <button
            onClick={() => setTab("preset")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              tab === "preset"
                ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            }`}
          >
            {locale === "nl" ? "Kies een chip" : "Choose a chip"}
          </button>
          <button
            onClick={() => setTab("upload")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              tab === "upload"
                ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            }`}
          >
            {locale === "nl" ? "Upload eigen" : "Upload your own"}
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-5">
          {tab === "preset" && (
            <div>
              <p className="mb-4 text-xs text-ink-500 dark:text-ink-400">
                {locale === "nl"
                  ? "Een Lucky Sucker chip in jouw kleur."
                  : "A Lucky Sucker chip in your color."}
              </p>
              <div className="grid grid-cols-4 gap-3">
                {AVATAR_PRESETS.map((name) => {
                  const url = `/avatars/presets/${name}`;
                  const isCurrent = currentUser.image === url;
                  return (
                    <button
                      key={name}
                      onClick={() => pickPreset(name)}
                      disabled={pending}
                      className={`group relative aspect-square overflow-hidden rounded-2xl transition ${
                        isCurrent
                          ? "ring-2 ring-ink-900 dark:ring-white"
                          : "ring-1 ring-ink-200 hover:ring-ink-400 dark:ring-ink-700 dark:hover:ring-ink-500"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                      aria-label={name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={name} className="h-full w-full" />
                      {isCurrent && (
                        <span className="absolute right-1 top-1 rounded-full bg-ink-900 px-1.5 py-0.5 text-[9px] font-bold text-white dark:bg-white dark:text-ink-900">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div className="space-y-4">
              <p className="text-xs text-ink-500 dark:text-ink-400">
                {locale === "nl"
                  ? "Kies een foto van je computer. We snijden 'm automatisch vierkant."
                  : "Pick a photo from your computer. We'll auto-crop it to a square."}
              </p>

              {!preview ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 p-8 text-center transition hover:border-ink-400 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:hover:border-ink-500 dark:hover:bg-ink-700"
                >
                  <div className="text-3xl">📷</div>
                  <div className="mt-2 text-sm font-semibold text-ink-900 dark:text-white">
                    {locale === "nl" ? "Kies een foto" : "Choose a photo"}
                  </div>
                  <div className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                    PNG, JPG, WEBP · max 5 MB
                  </div>
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="preview"
                    className="h-32 w-32 rounded-full object-cover ring-2 ring-ink-200 dark:ring-ink-700"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPreview(null)}
                      className="rounded-full border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
                    >
                      {locale === "nl" ? "Andere foto" : "Different photo"}
                    </button>
                    <button
                      type="button"
                      onClick={submitUpload}
                      disabled={pending}
                      className="rounded-full bg-ink-900 px-4 py-2 text-xs font-bold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-400 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
                    >
                      {pending
                        ? locale === "nl"
                          ? "Opslaan…"
                          : "Saving…"
                        : locale === "nl"
                          ? "Opslaan"
                          : "Save"}
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onFileInputChange}
                className="hidden"
              />
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              {error}
            </div>
          )}
        </div>

        {/* Current avatar preview footer */}
        <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-5 py-3 dark:border-ink-800">
          <div className="flex items-center gap-2">
            <Avatar user={currentUser} size={32} />
            <span className="text-xs text-ink-500 dark:text-ink-400">
              {locale === "nl" ? "Huidige avatar" : "Current avatar"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
          >
            {locale === "nl" ? "Sluiten" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Read a file, center-crop to square, resize to `size`x`size`, return a
 * PNG data URL. All in-browser via Canvas — no upload until the user
 * confirms.
 */
function fileToCenterCroppedDataUrl(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas unavailable"));
          return;
        }
        const minDim = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - minDim) / 2;
        const sy = (img.naturalHeight - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("image decode failed"));
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function errorMessage(error: string, locale: "nl" | "en"): string {
  const map: Record<string, { nl: string; en: string }> = {
    not_authenticated: { nl: "Log eerst in.", en: "Sign in first." },
    invalid_format: { nl: "Ongeldig bestandsformaat.", en: "Invalid file format." },
    too_large: { nl: "Bestand is te groot.", en: "File too large." },
    invalid_preset: { nl: "Onbekende preset.", en: "Unknown preset." },
    save_failed: {
      nl: "Opslaan mislukt. Probeer opnieuw.",
      en: "Saving failed. Try again.",
    },
  };
  return map[error]?.[locale] ?? (locale === "nl" ? "Er ging iets mis." : "Something went wrong.");
}
