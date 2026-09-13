/**
 * Serialize one CSV cell while protecting spreadsheet applications from
 * formula evaluation when a public label or note begins with a formula token.
 * Whitespace/control characters before the token are included in the guard.
 *
 * @param {unknown} value
 */
export function csvCell(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  const guarded = /^[\s\0-\x1f]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replaceAll('"', '""')}"`;
}

/** @param {readonly (readonly unknown[])[]} rows */
export function csvDocument(rows) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

/** @param {string} csv */
export function csvDataHref(csv) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}
