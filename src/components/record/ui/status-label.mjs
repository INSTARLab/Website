/**
 * The closed vocabulary of status labels shared by StatusPill and every table
 * or matrix that names a review state. Keys match the `RecordSource` status
 * union in `src/data/record.ts` plus the two room-wide publication states.
 * Badge classes are Bootstrap `text-bg-*` utilities; the text label is always
 * rendered alongside the color so no state is color-only.
 *
 * @typedef {'verified-in-repository' | 'review-required' | 'not-public' | 'stale' | 'not-reported'} RecordStatusKey
 * @typedef {{ readonly label: string; readonly badge: string; readonly description: string }} RecordStatusDef
 */

/** @type {Readonly<Record<RecordStatusKey, RecordStatusDef>>} */
export const RECORD_STATUSES = {
  'verified-in-repository': {
    label: 'Verified in repository',
    badge: 'text-bg-success',
    description: 'The source is present in the repository and was read there.',
  },
  'review-required': {
    label: 'Review required',
    badge: 'text-bg-warning',
    description: 'The source is present but a stated limit needs human review before reuse.',
  },
  'not-public': {
    label: 'Not public',
    badge: 'text-bg-secondary',
    description: 'The source exists but is intentionally not published on this site.',
  },
  stale: {
    label: 'Stale',
    badge: 'text-bg-warning',
    description: 'The observation keeps its date; a newer review is due.',
  },
  'not-reported': {
    label: 'Not reported',
    badge: 'text-bg-secondary',
    description: 'No approved publishable value exists; missing is not zero.',
  },
};

/**
 * @param {string} key
 * @returns {RecordStatusDef}
 */
export function statusDefinition(key) {
  const definition = RECORD_STATUSES[/** @type {RecordStatusKey} */ (key)];
  if (!definition) {
    throw new Error(`Unknown record status: ${JSON.stringify(key)}. Expected one of: ${Object.keys(RECORD_STATUSES).join(', ')}`);
  }
  return definition;
}
