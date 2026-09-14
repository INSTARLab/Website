/**
 * Shared value-state semantics for the Record Room presentation components.
 *
 * Three publication states, never two: a measured value (including an explicit
 * measured zero), an approved-but-unpublished value (`Not reported`), and —
 * handled by the caller omitting the component — a measure with no approved
 * observation at all. The display label lives here so every component, table,
 * chart export, and test spells the absence the same way.
 */

export const NOT_REPORTED_LABEL = 'Not reported';

/**
 * @param {unknown} value
 * @returns {value is number | string | boolean}
 */
function isPublishable(value) {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' || typeof value === 'boolean';
}

/**
 * @param {unknown} value
 * @returns {'measured' | 'unavailable'}
 */
export function valueStateOf(value) {
  return isPublishable(value) ? 'measured' : 'unavailable';
}

/**
 * Render a publishable value for display. Non-finite numbers fail loudly: a
 * chart, table, or metric card must never print `NaN` or `Infinity` as if it
 * were a measurement.
 *
 * @param {string | number | boolean | null | undefined} value
 * @returns {string}
 */
export function formatDisplayValue(value) {
  if (value === null || value === undefined || value === '') return NOT_REPORTED_LABEL;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Record value must be finite or null, received: ${String(value)}`);
    return value.toLocaleString('en-US');
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value;
}

/**
 * Describe one published observation for the DataState component: what to
 * print, which state token to carry into the DOM, and the explanatory note
 * that keeps a measured zero distinct from missing data.
 *
 * @param {string | number | boolean | null | undefined} value
 * @param {{ stale?: boolean; asOf?: string }} [options]
 * @returns {{ display: string; state: 'measured' | 'measured-stale' | 'unavailable'; note: string | null }}
 */
export function describeValue(value, options = {}) {
  const { stale = false, asOf } = options;
  if (!isPublishable(value)) {
    return { display: NOT_REPORTED_LABEL, state: 'unavailable', note: null };
  }
  const display = formatDisplayValue(value);
  if (stale) {
    return {
      display,
      state: 'measured-stale',
      note: asOf ? `Last measured ${asOf}; a newer review is due.` : 'A newer review is due.',
    };
  }
  if (value === 0) {
    return { display, state: 'measured', note: 'Measured zero — a published result, not missing data.' };
  }
  return { display, state: 'measured', note: null };
}
