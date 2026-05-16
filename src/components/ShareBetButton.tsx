"use client";

import { useState } from "react";
import { useI18n } from "@/lib/I18nContext";

// Share button voor een bet. Op mobile gebruiken we Web Share API (native
// share sheet). Op desktop tonen we een inline-menu met Facebook, WhatsApp,
// Messenger en "Copy link" als fallback.

export function ShareBetButton({ betId }: { betId: string }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined" ? `${window.location.origin}/bet/${betId}` : "";

  const shareTitle =
    locale === "nl" ? "Mijn bet op LS Tracker" : "My bet on LS Tracker";
  const shareText =
    locale === "nl"
      ? "Bekijk mijn bet op LS Tracker:"
      : "Check out my bet on LS Tracker:";

  async function nativeShare() {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url });
        return true;
      }
    } catch {
      // user cancelled or browser blocked — fall through to menu
    }
    return false;
  }

  async function handleClick() {
    const native = await nativeShare();
    if (!native) setOpen((v) => !v);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative mt-3 inline-block">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
      >
        🔗 {locale === "nl" ? "Delen" : "Share"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-40 mt-1 w-56 overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-lg dark:border-ink-700 dark:bg-ink-800">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-700"
              onClick={() => setOpen(false)}
            >
              📘 Facebook
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-700"
              onClick={() => setOpen(false)}
            >
              💬 WhatsApp
            </a>
            <a
              href={`https://www.facebook.com/dialog/send?app_id=140586622674265&link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-700"
              onClick={() => setOpen(false)}
            >
              📨 Messenger
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-700"
              onClick={() => setOpen(false)}
            >
              𝕏 X / Twitter
            </a>
            <div className="my-1 h-px bg-ink-100 dark:bg-ink-700" />
            <button
              type="button"
              onClick={copyLink}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-700"
            >
              {copied ? "✓ " : "📋 "}
              {locale === "nl" ? "Kopieer link" : "Copy link"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
