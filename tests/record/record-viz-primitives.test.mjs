import assert from 'node:assert/strict';
import test from 'node:test';

import {
  donutCsvState,
  donutCsvValue,
  donutSegments,
  donutShareLabel,
} from '../../src/components/record/viz/donut-segments.mjs';
import {
  TIMELINE_UNKNOWN_DATE_LABEL,
  timelineDateIsUnknown,
  timelineDateKind,
  timelineDateLabel,
  timelineMachineDate,
} from '../../src/components/record/viz/timeline-model.mjs';

test('donutSegments derives shares from register counts, as the governance policy mix does', () => {
  const { total, measuredCount, segments } = donutSegments([
    { label: 'Reported on file with the state registration', value: 1 },
    { label: 'No published source on this site', value: 4 },
  ]);
  assert.equal(total, 5);
  assert.equal(measuredCount, 2);
  assert.deepEqual(segments.map((segment) => segment.state), ['measured', 'measured']);
  const shares = segments.map((segment) => segment.share ?? Number.NaN);
  assert.ok(Math.abs(shares[0] - 0.2) < 1e-12);
  assert.ok(Math.abs(shares[1] - 0.8) < 1e-12);
  assert.ok(Math.abs(shares[0] + shares[1] - 1) < 1e-12, 'shares sum to the whole');
  assert.equal(donutShareLabel(shares[0]), '20%');
  assert.equal(donutShareLabel(shares[1]), '80%');
});

test('donutSegments keeps an unavailable slice as Not reported instead of dropping or zeroing it', () => {
  const { total, measuredCount, segments } = donutSegments([
    { label: 'Program service share, as filed', value: 49000 },
    { label: 'Supporting share, as filed', value: 0 },
    { label: 'Withdrawn filing figure', value: null },
  ]);
  assert.equal(total, 49000);
  assert.equal(measuredCount, 2);
  // A measured zero is a measured figure, not a missing one.
  assert.equal(segments[1].state, 'measured');
  assert.equal(segments[1].share, 0);
  assert.equal(segments[2].state, 'unavailable');
  assert.equal(segments[2].share, null);
  assert.equal(donutShareLabel(segments[2].share), 'Not reported');
});

test('donutSegments reports an all-absent input so the component renders its empty state', () => {
  for (const input of [[], [{ label: 'Nothing published', value: null }]]) {
    const result = donutSegments(input);
    assert.equal(result.measuredCount, 0);
    assert.equal(result.total, 0);
  }
});

test('donutSegments rejects values a ring cannot draw honestly', () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(() => donutSegments([{ label: 'invalid', value }]), /must be finite or null/);
  }
  assert.throws(() => donutSegments([{ label: 'negative', value: -1 }]), /must not be negative/);
});

test('donut CSV cells keep the BarChart State contract: measured zero apart from unavailable', () => {
  assert.equal(donutCsvValue(0), 0);
  assert.equal(donutCsvState(0), 'measured');
  assert.equal(donutCsvValue(4), 4);
  assert.equal(donutCsvState(4), 'measured');
  assert.equal(donutCsvValue(null), 'Not reported');
  assert.equal(donutCsvState(null), 'unavailable');
});

test('timelineDateLabel spans a correction from publication to correction without guessing', () => {
  assert.equal(
    timelineDateLabel({ from: '2026-06-15', to: '2026-06-16' }),
    '2026-06-15 → 2026-06-16',
  );
  assert.equal(timelineDateKind({ from: '2026-06-15', to: '2026-06-16' }), 'span');
  assert.equal(timelineDateIsUnknown({ from: '2026-06-15', to: '2026-06-16' }), false);
});

test('timelineDateLabel prints an unknown span half in words, as COR-006 requires', () => {
  const label = timelineDateLabel({ from: null, to: '2026-06-15' });
  assert.ok(label.includes(TIMELINE_UNKNOWN_DATE_LABEL), `expected the unknown-date wording in ${JSON.stringify(label)}`);
  assert.ok(label.includes('2026-06-15'));
  assert.equal(timelineDateIsUnknown({ from: null, to: '2026-06-15' }), true);
});

test('timelineDateLabel carries a single filing-year pin and offers it as machine-readable', () => {
  assert.equal(timelineDateLabel({ date: '2025' }), '2025');
  assert.equal(timelineDateKind({ date: '2025' }), 'single');
  assert.equal(timelineMachineDate({ date: '2025' }), '2025');
  assert.equal(timelineMachineDate({ date: '2026-09-13' }), '2026-09-13');
  // Spans have no single dateTime, and prose dates stay text-only.
  assert.equal(timelineMachineDate({ from: '2026-06-15', to: '2026-06-16' }), null);
  assert.equal(timelineMachineDate({ date: 'mid-June 2026' }), null);
});

test('timelineDateLabel never emits an empty or guessed date', () => {
  assert.equal(timelineDateLabel({}), TIMELINE_UNKNOWN_DATE_LABEL);
  assert.equal(timelineDateLabel({ date: null }), TIMELINE_UNKNOWN_DATE_LABEL);
  assert.equal(timelineDateLabel({ from: null, to: null }), TIMELINE_UNKNOWN_DATE_LABEL);
  assert.equal(timelineDateIsUnknown({}), true);
});
