"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/I18nContext";
import type { TranslationKey } from "@/lib/i18n";
import type { BetType } from "@/lib/types";
import { submitBet } from "@/app/submit/actions";
import { parseScreenshotAction } from "@/app/submit/parseAction";
import { formatOdds } from "@/lib/format";
import { ScreenshotHelpModal } from "@/components/ScreenshotHelpModal";

const BET_TYPES: BetType[] = [
  "btts",
  "1x2",
  "overUnder",
  "handicap",
  "correctScore",
  "accumulator",
  "other",
];

type CurrentUser = { username: string; displayName: string };

type ParseStatus =
  | { kind: "idle" }
  | { kind: "parsing"; previewUrl: string; filename: string }
  | {
      kind: "success";
      previewUrl: string;
      filename: string;
      confidence: "high" | "medium" | "low";
      legCount: number;
      rawText?: string;
      bookie?: string;
    }
  | { kind: "error"; previewUrl?: string; messageKey: TranslationKey; rawText?: string };

const SUPPORTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

type SelectionState = {
  match: string;
  competition: string;
  selection: string;
  odds: string;
};

const emptySelection = (): SelectionState => ({
  match: "",
  competition: "",
  selection: "",
  odds: "",
});

export function SubmitForm({ currentUser }: { currentUser: CurrentUser }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const [selections, setSelections] = useState<SelectionState[]>([emptySelection()]);
  const [betType, setBetType] = useState<BetType>("btts");
  const [kickoff, setKickoff] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseStatus, setParseStatus] = useState<ParseStatus>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const isAcca = selections.length > 1;
  const combinedOdds = selections.reduce(
    (acc, s) => acc * (Number(s.odds) || 0),
    1,
  );
  const allOddsValid = selections.every((s) => Number(s.odds) > 1);

  function updateSelection(i: number, patch: Partial<SelectionState>) {
    setSelections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addLeg() {
    setSelections((prev) => [...prev, emptySelection()]);
  }
  function removeLeg(i: number) {
    setSelections((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await submitBet({
        selections: selections.map((s) => ({
          match: s.match,
          competition: s.competition || undefined,
          selection: s.selection,
          odds: Number(s.odds),
        })),
        betType,
        kickoff,
        notes: notes || undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSubmitted(true);
      router.refresh();
    });
  }

  function resetForm() {
    setSelections([emptySelection()]);
    setBetType("btts");
    setKickoff("");
    setNotes("");
    setSubmitted(false);
    setError(null);
    setParseStatus({ kind: "idle" });
  }

  // ---- Screenshot parsing flow ----

  async function handleFile(file: File) {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      setParseStatus({ kind: "error", messageKey: "submit.uploadError.unsupportedType" });
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setParseStatus({ kind: "error", messageKey: "submit.uploadError.tooLarge" });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setParseStatus({ kind: "parsing", previewUrl, filename: file.name });

    const base64 = await fileToBase64(file);

    startTransition(async () => {
      const result = await parseScreenshotAction({ base64, mediaType: file.type });

      if (!result.ok) {
        const messageKey: TranslationKey = (
          {
            no_bet_found: "submit.uploadError.noBetFound",
            parse_failed: "submit.uploadError.parseFailed",
            ocr_failed: "submit.uploadError.ocrFailed",
            too_large: "submit.uploadError.tooLarge",
            unsupported_type: "submit.uploadError.unsupportedType",
            not_authenticated: "submit.uploadError.parseFailed",
          } as const
        )[result.error];
        setParseStatus({ kind: "error", previewUrl, messageKey });
        return;
      }

      const parsed = result.data;
      if (parsed.selections.length === 0) {
        setParseStatus({
          kind: "error",
          previewUrl,
          messageKey: "submit.uploadError.noBetFound",
        });
        return;
      }

      // Populate ALL legs (acca-aware). Format odds to show at least 2 decimals
      // (so "2.00" doesn't get truncated to "2" in the form input).
      setSelections(
        parsed.selections.map((s) => ({
          match: s.match,
          competition: s.competition ?? "",
          selection: s.selection,
          odds: formatOddsForInput(s.odds),
        })),
      );

      // Bet type: accumulator if multi-leg; else guess from first selection.
      const first = parsed.selections[0];
      setBetType(
        parsed.isAccumulator || parsed.selections.length > 1
          ? "accumulator"
          : guessBetType(first.selection),
      );

      if (parsed.kickoff) {
        try {
          const d = new Date(parsed.kickoff);
          if (!Number.isNaN(d.getTime())) {
            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
            setKickoff(local);
          }
        } catch {
          /* ignore */
        }
      }

      if (parsed.notes) setNotes(parsed.notes);

      setParseStatus({
        kind: "success",
        previewUrl,
        filename: file.name,
        confidence: parsed.confidence,
        legCount: parsed.selections.length,
        rawText: parsed.rawText,
        bookie: parsed.bookie,
      });
    });
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="text-6xl">🎯</div>
        <h1 className="mt-4 text-2xl font-black">
          {locale === "nl" ? "Bet geplaatst!" : "Bet placed!"}
        </h1>
        <p className="mt-2 text-ink-600">
          {locale === "nl"
            ? "Veel succes — je staat nu in de open bets feed."
            : "Good luck — you're now in the open bets feed."}
        </p>
        <div className="mt-6 inline-flex flex-wrap justify-center gap-2">
          <button
            onClick={resetForm}
            className="rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
          >
            {locale === "nl" ? "Nog een bet" : "Place another"}
          </button>
          <a
            href="/bets"
            className="rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-ink-100"
          >
            {t("nav.openBets")}
          </a>
          <a
            href={`/profile/${currentUser.username}`}
            className="rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-ink-100"
          >
            {t("nav.profile")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">{t("submit.title")}</h1>
        <p className="mt-1 text-ink-600">{t("submit.subtitle")}</p>
        <p className="mt-2 text-xs text-ink-400">
          {locale === "nl" ? "Geplaatst als" : "Posting as"}{" "}
          <span className="font-semibold text-ink-700">{currentUser.displayName}</span>
        </p>
      </div>

      {/* Screenshot dropzone */}
      <ScreenshotDropzone
        status={parseStatus}
        dragOver={dragOver}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onReset={() => setParseStatus({ kind: "idle" })}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={onFileInputChange}
        className="hidden"
      />

      {/* Help link */}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-600 hover:text-ink-900"
        >
          💡 {locale === "nl" ? "Hoe maak ik een goede screenshot per bookie?" : "How to screenshot per bookie?"}
        </button>
      </div>

      <ScreenshotHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm"
      >
        {/* Selections */}
        {selections.map((sel, i) => (
          <div
            key={i}
            className={
              isAcca
                ? "relative rounded-xl border border-ink-100 bg-ink-50/40 p-4"
                : "space-y-4"
            }
          >
            {isAcca && (
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  {t("submit.legNumber").replace("{n}", String(i + 1))}
                </div>
                {selections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLeg(i)}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-800"
                  >
                    {t("submit.removeLeg")}
                  </button>
                )}
              </div>
            )}

            <Field label={t("submit.match")} required>
              <input
                type="text"
                required
                value={sel.match}
                onChange={(e) => updateSelection(i, { match: e.target.value })}
                placeholder={t("submit.matchPlaceholder")}
                className="input"
              />
            </Field>

            <Field label={t("submit.competition")}>
              <input
                type="text"
                value={sel.competition}
                onChange={(e) => updateSelection(i, { competition: e.target.value })}
                placeholder={t("submit.competitionPlaceholder")}
                className="input"
              />
            </Field>

            <Field label={t("submit.selection")} required>
              <input
                type="text"
                required
                value={sel.selection}
                onChange={(e) => updateSelection(i, { selection: e.target.value })}
                placeholder={t("submit.selectionPlaceholder")}
                className="input"
              />
            </Field>

            <Field label={t("submit.odds")} required>
              <input
                type="number"
                required
                step="0.01"
                min="1.01"
                value={sel.odds}
                onChange={(e) => updateSelection(i, { odds: e.target.value })}
                placeholder="1.83"
                className="input"
              />
            </Field>
          </div>
        ))}

        {/* + Add leg */}
        <button
          type="button"
          onClick={addLeg}
          className="w-full rounded-xl border-2 border-dashed border-ink-200 px-4 py-2.5 text-xs font-semibold text-ink-600 hover:border-ink-400 hover:bg-ink-50"
        >
          {t("submit.addLeg")}
        </button>

        {/* Combined odds preview */}
        {isAcca && allOddsValid && (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
            <div className="flex items-baseline justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                {t("submit.combinedOdds")}
              </div>
              <div className="text-2xl font-black tracking-tight text-emerald-900">
                {formatOdds(combinedOdds)}
              </div>
            </div>
            <div className="mt-1 text-[11px] text-emerald-700">
              {t("submit.combiPotentialNote").replace("{n}", String(selections.length))}
            </div>
          </div>
        )}

        {/* Bet type — single bets only */}
        {!isAcca && (
          <Field label={t("submit.betType")} required>
            <select
              value={betType}
              onChange={(e) => setBetType(e.target.value as BetType)}
              className="input"
            >
              {BET_TYPES.filter((bt) => bt !== "accumulator").map((bt) => (
                <option key={bt} value={bt}>
                  {t(`betType.${bt}` as TranslationKey)}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label={t("submit.kickoff")} required>
          <input
            type="datetime-local"
            required
            value={kickoff}
            onChange={(e) => setKickoff(e.target.value)}
            className="input"
          />
        </Field>

        <Field label={t("submit.notes")}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t("submit.notesPlaceholder")}
            className="input resize-none"
          />
        </Field>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-ink-900 px-5 py-3 text-sm font-bold text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-400"
        >
          {pending
            ? locale === "nl"
              ? "Bezig…"
              : "Submitting…"
            : `${t("submit.submitButton")} →`}
        </button>
      </form>
    </div>
  );
}

// ---- Dropzone subcomponent ----

function ScreenshotDropzone({
  status,
  dragOver,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
  onReset,
}: {
  status: ParseStatus;
  dragOver: boolean;
  onClick: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onReset: () => void;
}) {
  const { t, locale } = useI18n();

  if (status.kind === "idle") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`cursor-pointer rounded-2xl border-2 border-dashed bg-white p-6 text-center transition ${
          dragOver
            ? "border-ink-900 bg-ink-50"
            : "border-ink-200 hover:border-ink-400 hover:bg-ink-50"
        }`}
      >
        <div className="text-3xl">📸</div>
        <div className="mt-2 font-semibold text-ink-900">{t("submit.uploadScreenshot")}</div>
        <div className="mt-1 text-xs text-ink-400">{t("submit.uploadDragHere")}</div>
        <div className="mt-1 text-[10px] text-ink-400">{t("submit.uploadHint")}</div>
      </div>
    );
  }

  if (status.kind === "parsing") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-5">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={status.previewUrl}
            alt={status.filename}
            className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-ink-200"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
              {t("submit.uploadParsing")}
            </div>
            <div className="mt-1 truncate text-xs text-amber-700">{status.filename}</div>
          </div>
        </div>
      </div>
    );
  }

  if (status.kind === "error") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50 p-5">
        <div className="flex items-start gap-4">
          {status.previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={status.previewUrl}
              alt="failed"
              className="h-16 w-16 shrink-0 rounded-lg object-cover opacity-60 ring-1 ring-ink-200"
            />
          )}
          <div className="flex-1">
            <div className="text-sm font-semibold text-rose-800">{t(status.messageKey)}</div>
            <button
              onClick={onReset}
              className="mt-2 rounded-full bg-rose-700 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-800"
            >
              {t("submit.uploadAnother")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // success
  const confidenceColor = {
    high: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    medium: "bg-amber-100 text-amber-800 ring-amber-200",
    low: "bg-rose-100 text-rose-700 ring-rose-200",
  }[status.confidence];

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-5">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={status.previewUrl}
            alt={status.filename}
            className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-ink-200"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-emerald-900">
                ✓ {t("submit.uploadSuccess")}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${confidenceColor}`}
              >
                {status.confidence === "high"
                  ? locale === "nl"
                    ? "Hoge zekerheid"
                    : "High confidence"
                  : status.confidence === "medium"
                    ? locale === "nl"
                      ? "Middel"
                      : "Medium"
                    : locale === "nl"
                      ? "Laag"
                      : "Low"}
              </span>
              {status.legCount > 1 && (
                <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {locale === "nl"
                    ? `Combi · ${status.legCount} wedstrijden`
                    : `Accumulator · ${status.legCount} legs`}
                </span>
              )}
              {status.bookie && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800 ring-1 ring-blue-200">
                  {status.bookie}
                </span>
              )}
            </div>
            <div className="mt-1 truncate text-xs text-emerald-700">{status.filename}</div>
            <button
              onClick={onReset}
              className="mt-2 text-xs font-semibold text-emerald-700 underline hover:text-emerald-900"
            >
              {t("submit.uploadAnother")}
            </button>
          </div>
        </div>
      </div>

      {status.confidence === "low" && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700 ring-1 ring-rose-200">
          {t("submit.uploadLowConfidence")}
        </div>
      )}

      {status.rawText && (
        <details className="rounded-xl border border-ink-200 bg-white px-4 py-2 text-xs text-ink-600">
          <summary className="cursor-pointer font-semibold text-ink-600 hover:text-ink-900">
            {locale === "nl" ? "Toon ruwe OCR-tekst" : "Show raw OCR text"}
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-ink-50 p-3 text-[11px] leading-relaxed text-ink-700">
            {status.rawText.trim()}
          </pre>
        </details>
      )}
    </div>
  );
}

// ---- Helpers ----

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

function formatOddsForInput(value: number): string {
  // Always at least 2 decimals; preserve more if the original had them (e.g. 1.909).
  const str = value.toString();
  const decimals = str.includes(".") ? str.split(".")[1].length : 0;
  return decimals >= 2 ? str : value.toFixed(2);
}

function guessBetType(selectionText: string): BetType {
  const s = selectionText.toLowerCase();
  if (s.includes("both teams") || s.includes("beide teams") || s.includes("btts")) return "btts";
  if (s.includes("over ") || s.includes("under ")) return "overUnder";
  if (s.includes("handicap") || /[+-]\d/.test(s)) return "handicap";
  if (/\d-\d/.test(s)) return "correctScore";
  if (s.includes("wint") || s.includes("win") || s === "draw" || s.includes("gelijk")) return "1x2";
  return "other";
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-600">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
