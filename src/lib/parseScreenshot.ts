// Local, free betslip screenshot parser.
//
// Pipeline:
//   1. Tesseract.js OCR (Dutch + English language packs)
//   2. Heuristic regex parser turns the extracted text into selections
//
// Runs entirely on the Node server — no API key, no per-request cost. First
// invocation downloads ~12 MB of Tesseract language data (cached after).

import "server-only";
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
 * Worker is heavy to spin up (~1-2 s + language download on first run), so
 * we cache one process-wide. Subsequent OCRs reuse it and finish in ~1-3 s.
 */
declare global {
  // eslint-disable-next-line no-var
  var __tesseractWorker: Promise<Worker> | undefined;
}

async function getWorker(): Promise<Worker> {
  if (!global.__tesseractWorker) {
    global.__tesseractWorker = createWorker(["nld", "eng"], 1, {
      // Suppress Tesseract's noisy stdout in dev
      logger: () => {},
      errorHandler: (err) => console.error("Tesseract error:", err),
    });
  }
  return global.__tesseractWorker;
}

export async function parseBetscreenshot(
  base64Image: string,
  mediaType: SupportedImageType = "image/png",
): Promise<ParseResult> {
  let rawText = "";
  try {
    const worker = await getWorker();
    const dataUrl = `data:${mediaType};base64,${base64Image}`;
    const { data } = await worker.recognize(dataUrl);
    rawText = data.text ?? "";
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Tesseract OCR failed", err);
    // Reset worker so the next call gets a fresh one
    global.__tesseractWorker = undefined;
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
