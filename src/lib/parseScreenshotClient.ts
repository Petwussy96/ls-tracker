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
    const { data } = await worker.recognize(file);
    rawText = data.text ?? "";
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("Tesseract OCR failed", err);
    // Reset worker so the next call gets a fresh one
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
