// Client-side betslip OCR + parsing.
//
// Runs entirely in the user's browser:
//   1. Tesseract.js worker (Dutch + English) — language data + WASM are
//      fetched from a CDN by Tesseract automatically.
//   2. parseBetText turns the recognized text into structured selections.
//
// Why client-side: Vercel's serverless functions don't bundle the Tesseract
// WASM (it lives in node_modules/tesseract.js-core/*.wasm and isn't picked
// up by Next.js automatic file tracing). Running OCR in the browser sidesteps
// that entirely — and saves serverless compute.

"use client";

import { createWorker, type Worker } from "tesseract.js";
import { parseBetText } from "./parseBetText";

// Pre-process the image client-side before handing to Tesseract:
//   1. Scale up so small text (selection names, odds) has more pixels
//   2. Convert to grayscale
//   3. Boost contrast — push light grays to white, dark grays to black
// This dramatically improves OCR accuracy on bookie-app screenshots where
// selection names are rendered in colored / low-contrast text.
async function preprocessImage(file: File): Promise<Blob> {
  if (typeof createImageBitmap === "undefined") return file;
  try {
    const img = await createImageBitmap(file);
    // Target ~1800px on the long side — sweet spot for Tesseract speed/accuracy
    const target = 1800;
    const scale = Math.min(2.5, Math.max(1, target / Math.max(img.width, img.height)));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : (() => {
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          return c;
        })();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (canvas as any).getContext("2d") as CanvasRenderingContext2D | null;
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    const data = ctx.getImageData(0, 0, w, h);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      // Luminance
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      // Stretch midtones: push <90 to 0 and >180 to 255, linear interpolation between.
      let v: number;
      if (gray < 90) v = 0;
      else if (gray > 180) v = 255;
      else v = Math.round(((gray - 90) / 90) * 255);
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(data, 0, 0);

    if ("convertToBlob" in canvas) {
      return await (canvas as OffscreenCanvas).convertToBlob({ type: "image/png" });
    }
    return await new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/png",
      );
    });
  } catch {
    // If anything goes wrong, fall back to the original file
    return file;
  }
}

export type { ParsedSelection } from "./parseBetText";

export type ParsedScreenshot = {
  selections: { match: string; competition?: string; selection: string; odds: number }[];
  isAccumulator: boolean;
  combinedOdds?: number;
  kickoff?: string;
  bookie?: string;
  notes?: string;
  confidence: "high" | "medium" | "low";
  /** The raw OCR text — useful for debugging and fallback display. */
  rawText?: string;
};

export type ParseResult =
  | { ok: true; data: ParsedScreenshot }
  | { ok: false; error: "no_bet_found" | "ocr_failed" | "parse_failed"; detail?: string };

type SupportedImageType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

/**
 * Worker is heavy to spin up (~1–3 s + language pack download on first run),
 * so we cache one per page-load. Subsequent OCRs in the same tab reuse it.
 */
let cachedWorker: Promise<Worker> | null = null;

async function getWorker(
  onProgress?: (status: string, progress: number) => void,
): Promise<Worker> {
  if (!cachedWorker) {
    cachedWorker = createWorker(["nld", "eng"], 1, {
      logger: (m: { status: string; progress: number }) => {
        if (onProgress) onProgress(m.status, m.progress);
      },
      errorHandler: (err: unknown) => {
        // eslint-disable-next-line no-console
        console.error("Tesseract error:", err);
      },
    });
  }
  return cachedWorker;
}

/**
 * Run OCR on a File (from <input type="file"> or drag-drop) and parse the
 * extracted text into structured bet selections.
 */
export async function parseBetscreenshotClient(
  file: File,
  onProgress?: (status: string, progress: number) => void,
): Promise<ParseResult> {
  if (!isSupportedType(file.type)) {
    return { ok: false, error: "ocr_failed", detail: "unsupported_type" };
  }

  let rawText = "";
  try {
    const worker = await getWorker(onProgress);
    // 90s hard timeout — if the OCR or language-pack download silently hangs
    // (e.g. CSP-blocked CDN, network blip), we'd rather surface an error
    // than leave the user staring at a spinner.
    const preprocessed = await preprocessImage(file);
    const recognized = await Promise.race([
      worker.recognize(preprocessed),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ocr_timeout_90s")), 90_000),
      ),
    ]);
    rawText = recognized.data.text ?? "";
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("Tesseract OCR failed", err);
    // Reset worker so the next call gets a fresh one (a hung worker is dead)
    cachedWorker = null;
    return { ok: false, error: "ocr_failed", detail };
  }

  if (!rawText.trim()) {
    return { ok: false, error: "no_bet_found" };
  }

  let parsed;
  try {
    parsed = parseBetText(rawText);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("Bet-text parse failed", err);
    return { ok: false, error: "parse_failed", detail };
  }

  if (parsed.selections.length === 0) {
    return { ok: false, error: "no_bet_found" };
  }

  return {
    ok: true,
    data: {
      selections: parsed.selections,
      isAccumulator: parsed.isAccumulator,
      combinedOdds: parsed.combinedOdds,
      kickoff: parsed.kickoff,
      bookie: parsed.bookie,
      notes: parsed.notes,
      confidence: parsed.confidence,
      rawText,
    },
  };
}

function isSupportedType(t: string): t is SupportedImageType {
  return t === "image/png" || t === "image/jpeg" || t === "image/gif" || t === "image/webp";
}
