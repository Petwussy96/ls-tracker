// Compute a stable "fingerprint" for a bet so duplicates can be detected
// without storing an extra DB column. We fingerprint on the SET of legs
// (order-independent) using:
//   - normalized match name
//   - normalized selection text
//   - odds rounded to 2 decimals
//
// Same legs in a different order → same fingerprint (which is what we want;
// reordering a combi doesn't change the bet).

export type FingerprintLeg = {
  match: string;
  selection: string;
  odds: number;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // strip accents
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function fingerprintLeg(leg: FingerprintLeg): string {
  return `${normalize(leg.match)}|${normalize(leg.selection)}|${leg.odds.toFixed(2)}`;
}

/** Order-independent fingerprint for a set of bet legs. */
export function betFingerprint(legs: FingerprintLeg[]): string {
  return legs.map(fingerprintLeg).sort().join("~");
}
