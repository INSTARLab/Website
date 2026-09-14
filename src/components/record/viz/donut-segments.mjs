/**
 * Share-of-whole math for `DonutChart.astro`, kept in a plain module so the
 * record quality suite can pin the honesty guards without rendering Astro.
 *
 * The rules mirror `BarChart.astro` exactly, because a donut that silently
 * drops an unavailable slice is a donut that reads as complete:
 *
 *   - A `null` value is an unavailable observation, never a zero. It keeps a
 *     segment entry with a `null` share so the legend and the data table can
 *     print it as "Not reported" instead of omitting it.
 *   - A measured zero stays a measured zero (`share` 0, `state` measured). It
 *     is the institution's own attested figure, not a missing one.
 *   - Non-finite values and negative shares throw at build time. A donut
 *     cannot draw either honestly, so neither may reach the page.
 *   - When no slice carries a measured value the caller renders its empty
 *     state and no ring (`measuredCount === 0`).
 */

/**
 * @typedef {object} DonutInputSlice
 * @property {string} label
 * @property {number | null} value
 */

/**
 * @typedef {object} DonutSegment
 * @property {string} label
 * @property {number | null} value
 * @property {number | null} share A 0–1 fraction of the measured total, or null when unavailable.
 * @property {'measured' | 'unavailable'} state
 */

/**
 * @param {readonly DonutInputSlice[]} slices
 * @returns {{ total: number, measuredCount: number, segments: DonutSegment[] }}
 */
export function donutSegments(slices) {
  const list = slices ?? [];
  for (const slice of list) {
    if (slice.value !== null && (typeof slice.value !== 'number' || !Number.isFinite(slice.value))) {
      throw new Error(`DonutChart data for "${slice.label}" must be finite or null.`);
    }
    if (typeof slice.value === 'number' && slice.value < 0) {
      throw new Error(`DonutChart data for "${slice.label}" must not be negative.`);
    }
  }
  const measured = list.filter((slice) => slice.value !== null);
  const total = measured.reduce((sum, slice) => sum + (slice.value ?? 0), 0);
  return {
    total,
    measuredCount: measured.length,
    segments: list.map((slice) =>
      slice.value === null
        ? { label: slice.label, value: null, share: null, state: 'unavailable' }
        : { label: slice.label, value: slice.value, share: total > 0 ? slice.value / total : 0, state: 'measured' },
    ),
  };
}

/**
 * The CSV cell value, using the room's explicit "Not reported" wording for an
 * unavailable observation rather than an empty cell — the same contract
 * `BarChart.astro` documents, so the two exports stay interchangeable.
 *
 * @param {number | null} value
 */
export function donutCsvValue(value) {
  return value === null || !Number.isFinite(value) ? 'Not reported' : value;
}

/**
 * The CSV State column, keeping the three publication states apart in a file
 * someone keeps after leaving the page: a measured zero exports as the number
 * 0 with `measured`, an approved-but-unpublished value exports as
 * "Not reported" with `unavailable`.
 *
 * @param {number | null} value
 */
export function donutCsvState(value) {
  return value === null || !Number.isFinite(value) ? 'unavailable' : 'measured';
}

/**
 * A human share label for the legend. Whole percentages print without
 * decimals (`20%`, not `20.0%`); anything else prints one decimal.
 *
 * @param {number | null} share
 */
export function donutShareLabel(share) {
  if (share === null) return 'Not reported';
  const rounded = Math.round(share * 1000) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : String(rounded)}%`;
}
