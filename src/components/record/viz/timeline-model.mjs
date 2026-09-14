/**
 * Date display rules for `Timeline.astro`, kept in a plain module so the
 * record quality suite can pin the one rule that matters without rendering
 * Astro: a date the repository does not establish is printed as absent,
 * never guessed.
 *
 * An event carries either a single `date` or a `from`/`to` span. Passing
 * `from`/`to` (even as explicit `null`, the way the corrections register
 * carries `publishedAt: null` for COR-006) selects the span shape; otherwise
 * the event is a single pin. A span whose start is unknown prints the unknown
 * half in words — `Date not established in the repository → 2026-06-15` —
 * rather than collapsing to the known end.
 */

/** The words an unknown date prints as, wherever it appears in the timeline. */
export const TIMELINE_UNKNOWN_DATE_LABEL = 'Date not established in the repository';

/**
 * @typedef {object} TimelineDateInput
 * @property {string | null} [date]
 * @property {string | null} [from]
 * @property {string | null} [to]
 */

/**
 * @param {TimelineDateInput} event
 * @returns {'span' | 'single'}
 */
export function timelineDateKind(event) {
  if (event.from !== undefined || event.to !== undefined) return 'span';
  return 'single';
}

/**
 * The rendered date line for one event. Returns only repository-stated dates
 * or the unknown-date wording above — never a placeholder.
 *
 * @param {TimelineDateInput} event
 */
export function timelineDateLabel(event) {
  if (timelineDateKind(event) === 'span') {
    const from = event.from ?? null;
    const to = event.to ?? null;
    if (from && to) return from === to ? from : `${from} → ${to}`;
    if (from || to) {
      return from ? `${from} → ${TIMELINE_UNKNOWN_DATE_LABEL}` : `${TIMELINE_UNKNOWN_DATE_LABEL} → ${to}`;
    }
    return TIMELINE_UNKNOWN_DATE_LABEL;
  }
  return event.date ?? TIMELINE_UNKNOWN_DATE_LABEL;
}

/**
 * Whether the event's date is unknown on the stated side(s). The component
 * uses this to mark the date line rather than to fill anything in.
 *
 * @param {TimelineDateInput} event
 */
export function timelineDateIsUnknown(event) {
  if (timelineDateKind(event) === 'span') {
    return (event.from ?? null) === null || (event.to ?? null) === null;
  }
  return (event.date ?? null) === null;
}

/**
 * A machine-readable `dateTime` for a single year or ISO date, or null when
 * the event is a span or the date is anything else. Spans have no single
 * `dateTime`, so they render as text only.
 *
 * @param {TimelineDateInput} event
 */
export function timelineMachineDate(event) {
  if (timelineDateKind(event) !== 'single') return null;
  const date = event.date ?? null;
  return date && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(date) ? date : null;
}
