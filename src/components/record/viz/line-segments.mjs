/**
 * Split a time series into contiguous runs. A null value is an explicit gap;
 * every other non-finite value is invalid source data and must stop the build.
 *
 * @param {readonly {period: string, value: number | null}[]} data
 * @returns {readonly (readonly {index: number, period: string, value: number})[]}
 */
export function lineSegments(data) {
  /** @type {{index: number, period: string, value: number}[]} */
  let current = [];
  /** @type {{index: number, period: string, value: number}[][]} */
  const segments = [];

  for (const [index, item] of data.entries()) {
    if (item.value === null) {
      if (current.length > 0) segments.push(current);
      current = [];
      continue;
    }

    if (!Number.isFinite(item.value)) {
      throw new Error(`LineChart data for “${item.period}” must be finite or null.`);
    }

    current.push({ index, period: item.period, value: item.value });
  }

  if (current.length > 0) segments.push(current);
  return segments;
}
