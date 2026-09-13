import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCsv } from '../../scripts/record/bi-schema.mjs';
import { csvCell, csvDataHref, csvDocument } from '../../src/components/record/viz/csv.mjs';
import { lineSegments } from '../../src/components/record/viz/line-segments.mjs';

test('CSV cells guard formula tokens after whitespace and control characters', () => {
  for (const value of ['=SUM(A1:A2)', ' +SUM(A1:A2)', '\t=SUM(A1:A2)', '\r@cmd', '-1']) {
    assert.ok(csvCell(value).startsWith('"\''), `expected formula guard for ${JSON.stringify(value)}`);
  }

  assert.equal(csvCell('plain'), '"plain"');
  assert.equal(csvCell('say "hello"'), '"say ""hello"""');
  assert.match(csvDataHref(csvDocument([['Label', 'Value']])), /^data:text\/csv;charset=utf-8,/);
});

test('CSV export round-trips delimiters, quotes, and line breaks through an RFC 4180 parser', () => {
  const values = ['plain', 'a,b', 'say "hello"', 'line1\nline2', 'crlf\r\nnext', 'cr\ronly', '"', '""', 'a"b,c\nd', '^"|,"'];
  const document = csvDocument([['Label', 'Value'], ...values.map((value) => [value, 'x'])]);

  assert.deepEqual(parseCsv(document).map((row) => row.Label), values);
  assert.equal(csvDocument([['a,b', 'c"d']]), '"a,b","c""d"');
  assert.equal(csvDocument([['line1\nline2']]), '"line1\nline2"');
});

test('lineSegments leaves explicit unavailable periods as gaps', () => {
  const segments = lineSegments([
    { period: '2024', value: 2 },
    { period: '2025', value: null },
    { period: '2026', value: 7 },
    { period: '2027', value: 8 },
  ]);

  assert.deepEqual(segments.map((segment) => segment.map(({ period, value }) => ({ period, value }))), [
    [{ period: '2024', value: 2 }],
    [{ period: '2026', value: 7 }, { period: '2027', value: 8 }],
  ]);
});

test('lineSegments rejects NaN and infinities instead of treating them as missing', () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(
      () => lineSegments([{ period: 'invalid', value }]),
      /must be finite or null/,
    );
  }
});
