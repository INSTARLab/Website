import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aggregateMetricObservations,
  comparableMetricSeries,
  latestMetricAggregate,
  latestMetricPeriod,
  observationSourceLabel,
} from '../../src/data/record-bi/selectors.mjs';

const definition = {
  id: 'funding-awarded',
  dimensions: ['category'],
  aggregation: 'sum',
};

const sourceA = { id: 'SRC-A', label: 'Awards register', locator: 'https://example.test/a', retrievedAt: '2026-09-01' };
const sourceB = { id: 'SRC-B', label: 'Awards correction', locator: 'https://example.test/b', retrievedAt: '2026-09-02' };

const observation = (overrides = {}) => ({
  metricId: 'funding-awarded',
  value: 10,
  unit: 'USD',
  period: { start: '2026-01-01', end: '2026-03-31' },
  asOf: null,
  dimensions: { category: 'federal' },
  source: sourceA,
  approval: { status: 'approved', reference: 'APP-1', approvedBy: 'owner', approvedAt: '2026-09-01' },
  reviewOwner: 'owner',
  nextReviewDate: '2027-01-01',
  ...overrides,
});

test('latest selectors use period dates and preserve distinct sources', () => {
  const observations = [
    observation({ value: 10, source: sourceA }),
    observation({ value: 20, source: sourceB }),
    observation({ value: 30, period: { start: '2026-04-01', end: '2026-06-30' }, dimensions: { category: 'federal' } }),
  ];
  const latestPeriod = latestMetricPeriod(definition, observations);
  assert.equal(latestPeriod.length, 1);
  assert.equal(latestPeriod[0].value, 30);
  const aggregate = latestMetricAggregate(definition, observations);
  assert.equal(aggregate.value, 30);
  assert.equal(aggregate.sources.length, 1);
  assert.equal(observationSourceLabel(latestPeriod[0].observations), 'Awards register · retrieved 2026-09-01 · https://example.test/a');
});

test('latest selectors do not combine periods that share an end date', () => {
  const ambiguous = [
    observation({ period: { start: '2026-01-01', end: '2026-06-30' } }),
    observation({ period: { start: '2026-04-01', end: '2026-06-30' } }),
  ];
  assert.deepEqual(latestMetricPeriod(definition, ambiguous), []);
  assert.equal(latestMetricAggregate(definition, ambiguous), null);
});

test('same period and dimension aggregates sum values without changing unavailable to zero', () => {
  const duplicate = aggregateMetricObservations(definition, [
    observation({ value: 10 }),
    observation({ value: 5, source: sourceB }),
  ]);
  assert.equal(duplicate.length, 1);
  assert.equal(duplicate[0].value, 15);
  assert.equal(duplicate[0].sources.length, 2);

  const unavailable = aggregateMetricObservations(definition, [
    observation({ value: null, unavailableReason: 'Pending release' }),
    observation({ value: 5 }),
  ]);
  assert.equal(unavailable[0].value, null);
  assert.match(unavailable[0].unavailableReason, /Pending release/);
});

test('comparable history stays within one dimension and equal non-overlapping periods', () => {
  const history = [
    observation({ value: 10, period: { start: '2025-01-01', end: '2025-03-31' } }),
    observation({ value: null, unavailableReason: 'Pending release', period: { start: '2025-04-01', end: '2025-06-30' } }),
    observation({ value: 12, period: { start: '2025-07-01', end: '2025-09-30' } }),
    observation({ value: 8, dimensions: { category: 'state' }, period: { start: '2025-01-01', end: '2025-06-30' } }),
  ];
  const series = comparableMetricSeries(definition, history);
  assert.equal(series.length, 3);
  assert.deepEqual(series.map((entry) => entry.value), [10, null, 12]);
});

test('comparable history does not equate partial intervals with calendar spans', () => {
  const history = [
    observation({ value: 10, period: { start: '2025-01-01', end: '2025-01-02' } }),
    observation({ value: 12, period: { start: '2025-02-01', end: '2025-02-28' } }),
  ];
  assert.deepEqual(comparableMetricSeries(definition, history), []);
});
