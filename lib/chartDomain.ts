// lib/chartDomain.ts
//
// Utility to compute a tight Y-axis domain in dollars, snapped to the nearest
// 0.1 million around the given data keys. Used by line charts that display
// large dollar values in $XM format.

export function getMillionDomain<T extends Record<string, unknown>>(
  data: T[] | null | undefined,
  keys: string[],
  minBandM = 0.2 // minimum band size in millions (0.2M = 200k)
): [number, number] | undefined {
  if (!data || data.length === 0) return undefined;

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const row of data) {
    for (const key of keys) {
      const raw = row[key];
      const val = typeof raw === "number" ? raw : Number(raw);
      if (Number.isFinite(val)) {
        min = Math.min(min, val);
        max = Math.max(max, val);
      }
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return undefined;
  }

  // Convert to millions
  const minM = min / 1_000_000;
  const maxM = max / 1_000_000;

  // If everything is the same, force a small band around it
  if (minM === maxM) {
    const base = minM === 0 ? 1 : minM;
    const lowerM = Math.floor((base - 0.1) * 10) / 10;
    const upperM = Math.ceil((base + 0.1) * 10) / 10;
    return [lowerM * 1_000_000, upperM * 1_000_000];
  }

  // Snap bounds to nearest 0.1M
  let lowerM = Math.floor(minM * 10) / 10;
  let upperM = Math.ceil(maxM * 10) / 10;

  // Ensure the band is not too tiny (at least minBandM wide)
  if (upperM - lowerM < minBandM) {
    const center = (minM + maxM) / 2;
    const halfBand = minBandM / 2;
    lowerM = Math.floor((center - halfBand) * 10) / 10;
    upperM = Math.ceil((center + halfBand) * 10) / 10;
  }

  return [lowerM * 1_000_000, upperM * 1_000_000];
}

