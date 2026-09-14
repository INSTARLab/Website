import assert from 'node:assert/strict';
import test from 'node:test';

import { sortSnapshot } from '../../scripts/record/bi-schema.mjs';
import {
  aggregateMetricObservations,
  comparableMetricSeries,
  latestMetricAggregate,
  latestMetricPeriod,
  observationPeriodKey,
  periodLabel,
} from '../../src/data/record-bi/selectors.mjs';

/**
 * Gap coverage for the BI selectors. The committed
 * tests/unit/record-bi-selectors.test.mjs owns the core contract (summing at
 * the grain, null-poisoning, measured zero, shared-end-date ties, source
 * labels, partial intervals). These tests cover only what that file does not:
 * the latestOnly option, empty states, cross-metric isolation, series
 * rejection rules, period keys/labels, and deterministic serialization.
 */

const source = {
  id: 'SRC-TEST-AGG-001',
  label: 'Approved public aggregation fixture',
  locator: 'https://example.test/agg.csv',
  retrievedAt: '2026-09-13',
};
const approval = {
  status: 'approved',
  basis: 'management',
  reference: 'TEST-AGG-001',
  approvedBy: 'Test data owner',
  approvedAt: '2026-09-13',
};

const annualRevenue = { id: 'annual-revenue', dimensions: ['source'] };
const grantsAwarded = { id: 'grants-awarded', dimensions: ['funder-type'] };

function periodObservation(overrides = {}) {
  return {
    metricId: 'annual-revenue',
    value: 125000,
    unit: 'USD',
    period: { start: '2026-01-01', end: '2026-12-31' },
    asOf: null,
    dimensions: { source: 'contributions' },
    source,
    approval,
    reviewOwner: 'Test data owner',
    nextReviewDate: '2027-01-01',
    ...overrides,
  };
}

function asOfObservation(overrides = {}) {
  return {
    metricId: 'grants-awarded',
    value: 0,
    unit: 'USD',
    period: null,
    asOf: '2026-09-13',
    dimensions: { 'funder-type': 'federal' },
    source,
    approval,
    reviewOwner: 'Test data owner',
    nextReviewDate: '2027-01-01',
    ...overrides,
  };
}

test('no-data states are empty, never zero', () => {
  assert.deepEqual(aggregateMetricObservations(annualRevenue, []), []);
  assert.deepEqual(latestMetricPeriod(annualRevenue, []), []);
  assert.equal(latestMetricAggregate(annualRevenue, []), null);
  assert.deepEqual(comparableMetricSeries(annualRevenue, []), []);
  // Observations for another metric do not leak into this one.
  assert.deepEqual(latestMetricPeriod(annualRevenue, [asOfObservation()]), []);
  assert.equal(latestMetricAggregate(annualRevenue, [asOfObservation()]), null);
});

test('latestOnly drops older periods before grouping', () => {
  const observations = [
    periodObservation({ period: { start: '2025-01-01', end: '2025-12-31' }, value: 10 }),
    periodObservation({ period: { start: '2026-01-01', end: '2026-12-31' }, value: 20 }),
  ];
  const grouped = aggregateMetricObservations(annualRevenue, observations, { latestOnly: true });
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].value, 20);
});

test('comparable series reject single periods, mixed lengths, and overlaps', () => {
  const first = periodObservation({ period: { start: '2025-01-01', end: '2025-12-31' }, value: 10 });
  const second = periodObservation({ period: { start: '2026-01-01', end: '2026-12-31' }, value: 20 });

  // A single period is a point, not a trend.
  assert.deepEqual(comparableMetricSeries(annualRevenue, [first]), []);

  // Mixed period lengths cannot become one line.
  assert.deepEqual(comparableMetricSeries(annualRevenue, [
    first,
    periodObservation({ period: { start: '2026-01-01', end: '2026-06-30' }, value: 20 }),
  ]), []);

  // Overlapping windows at the same grain cannot become one line.
  assert.deepEqual(comparableMetricSeries(annualRevenue, [
    first,
    periodObservation({ period: { start: '2025-06-01', end: '2026-05-31' }, value: 20 }),
  ]), []);

  // Two equal, non-overlapping calendar years are a series.
  const series = comparableMetricSeries(annualRevenue, [first, second]);
  assert.equal(series.length, 2);

  // Cumulative as-of observations are not periods and never join a series.
  assert.deepEqual(comparableMetricSeries(grantsAwarded, [asOfObservation(), asOfObservation()]), []);
});

test('period keys and labels keep period and as-of observations distinct', () => {
  const period = periodObservation();
  const asOf = asOfObservation();
  assert.equal(observationPeriodKey(period), '2026-01-01/2026-12-31');
  assert.equal(observationPeriodKey(asOf), 'as-of/2026-09-13');
  assert.match(periodLabel(period), /2026-01-01 to 2026-12-31/);
  assert.match(periodLabel(asOf), /As of 2026-09-13/);
});

test('snapshot serialization is deterministic regardless of input order', () => {
  const metadata = {
    schemaVersion: 1,
    snapshotId: 'test-order-2026-09-13',
    status: 'published',
    asOf: '2026-09-13',
    refreshedAt: '2026-09-13',
    source,
    approval,
  };
  const first = periodObservation({ dimensions: { source: 'grants' }, value: 25 });
  const second = periodObservation({ dimensions: { source: 'contributions' }, value: 100 });
  const forward = sortSnapshot({ ...metadata, observations: [first, second] });
  const reversed = sortSnapshot({ ...metadata, observations: [second, first] });
  assert.equal(JSON.stringify(forward), JSON.stringify(reversed));
  assert.equal(JSON.stringify(forward.observations[0].dimensions), '{"source":"contributions"}');
});
