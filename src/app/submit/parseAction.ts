// Deprecated: screenshot parsing now happens client-side in SubmitForm via
// parseScreenshotClient. Kept as a no-op stub so any leftover client-bundle
// references resolve cleanly. New code should not import here.

"use server";

export type ParseScreenshotAction =
  | { ok: true; data: { selections: never[]; isAccumulator: false; confidence: "low" } }
  | { ok: false; error: "deprecated" };

export async function parseScreenshotAction(): Promise<ParseScreenshotAction> {
  return { ok: false, error: "deprecated" };
}
