/**
 * Runtime coverage for `src/data/record-bi/index.ts`.
 *
 * That module had none. It is TypeScript with two JSON imports, so Node cannot
 * import it directly (`--experimental-strip-types` is not compiled into every
 * Node build, and even where it is, a bare `./current.json` import needs an
 * import attribute in ESM). Its exported functions were therefore only ever
 * executed at Astro build time, with `tsc --noEmit` as the real gate — and
 * `tsc` cannot see a runtime `TypeError` on `observations: [null]`, which is
 * exactly how one survived until a review wave found it.
 *
 * This harness closes that gap without touching the source file: it reads
 * `index.ts`, points the two JSON imports at absolute file URLs with the import
 * attribute Node requires, transforms the TypeScript away with Vite's own Oxc
 * transform (the same transformer the site builds through), writes the result
 * to a scratch directory, and imports it. `recordBiStatusForMetric`,
 * `recordBiValueStateForMetric`, and `recordBiIsStale` read the module-level
 * snapshot, so the harness can substitute a snapshot to exercise the branches
 * the production snapshot does not reach.
 *
 * Every fixture in this file is obviously synthetic (`SRC-TEST-*`,
 * `example.test`). Nothing here describes INSTAR Lab.
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { transformWithOxc } from 'vite';

import { aggregateMetricObservations, latestMetricAggregate } from '../../src/data/record-bi/selectors.mjs';

const SOURCE = resolve('src/data/record-bi/index.ts');
const SCHEMA = resolve('src/data/record-bi/schema.json');
const CURRENT = resolve('src/data/record-bi/current.json');

/**
 * Compile `index.ts` into an importable ES module.
 *
 * @param {{ snapshot?: unknown }} [options] substitute the `./current.json`
 *   import with an in-memory snapshot; omit it to load the real one.
 * @returns {Promise<{ url: string, cleanup: () => Promise<void> }>}
 */
async function compileRecordBi({ snapshot } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'record-bi-runtime-'));
  const cleanup = () => rm(directory, { recursive: true, force: true });

  let snapshotUrl = pathToFileURL(CURRENT).href;
  if (snapshot !== undefined) {
    const file = join(directory, 'current.json');
    await writeFile(file, JSON.stringify(snapshot, null, 2));
    snapshotUrl = pathToFileURL(file).href;
  }

  const source = await readFile(SOURCE, 'utf8');
  const rewritten = source
    .replace("from './schema.json'", `from '${pathToFileURL(SCHEMA).href}' with { type: 'json' }`)
    .replace("from './current.json'", `from '${snapshotUrl}' with { type: 'json' }`);
  assert.notEqual(rewritten, source, 'the JSON import rewrite no longer matches src/data/record-bi/index.ts');
  assert.ok(rewritten.includes('with { type: \'json\' }'), 'the JSON import rewrite did not produce an import attribute');

  const { code } = await transformWithOxc(rewritten, 'record-bi.ts', { lang: 'ts' });
  assert.ok(!code.includes('interface '), 'the TypeScript transform left type syntax behind');

  const file = join(directory, 'record-bi.mjs');
  await writeFile(file, code);
  // A fresh scratch directory per call means a fresh specifier, so `import()`
  // never returns a cached module from an earlier substitution.
  return { url: pathToFileURL(file).href, cleanup };
}

// ---------------------------------------------------------------------------
// Synthetic fixtures. Same shape and same obviously-fake identifiers the
// existing scripts-level suite (tests/record/record-bi.test.mjs) already uses.
// ---------------------------------------------------------------------------

const source = {
  id: 'SRC-TEST-001',
  label: 'Approved public test aggregate',
  locator: 'https://example.test/record-bi.csv',
  retrievedAt: '2026-09-13',
};
const approval = {
  status: 'approved',
  basis: 'management',
  reference: 'TEST-APPROVAL-001',
  approvedBy: 'Test data owner',
  approvedAt: '2026-09-13',
};

const observation = (overrides = {}) => ({
  metricId: 'annual-revenue',
  value: 125000,
  unit: 'USD',
  period: { start: '2026-01-01', end: '2026-06-30' },
  asOf: null,
  dimensions: { source: 'contributions' },
  source,
  approval,
  reviewOwner: 'Test data owner',
  nextReviewDate: '2027-01-01',
  ...overrides,
});

/** A cumulative as-of observation, for the measures whose grain is a date. */
const asOfObservation = (overrides = {}) => observation({
  metricId: 'publications',
  value: 0,
  unit: 'publications',
  period: null,
  asOf: '2026-09-13',
  dimensions: { 'publication-type': 'journal-article' },
  ...overrides,
});

const snapshot = (overrides = {}) => ({
  schemaVersion: 1,
  snapshotId: 'test-2026-09-13',
  status: 'published',
  asOf: '2026-09-13',
  refreshedAt: '2026-09-13',
  source,
  approval,
  observations: [observation()],
  ...overrides,
});

test('the shipped snapshot satisfies the module\'s own publication gate', async (t) => {
  const { url, cleanup } = await compileRecordBi();
  t.after(cleanup);

  const module = await import(url);
  // The real snapshot publishes what the chief executive officer attested on
  // 2026-09-13 and nothing else: two measured zeros and explicit
  // unavailability. This is the module's import-time assertion, executed
  // rather than type-checked.
  assert.equal(module.recordBiSnapshot.status, 'published');
  assert.equal(module.recordBiSnapshot.approval.status, 'approved');
  assert.equal(module.recordBiSnapshot.approval.basis, 'management');
  assert.equal(module.recordBiSnapshot.approval.reference, 'CEO-ATTESTATION-2026-09-13');
  assert.deepEqual(module.validateRecordBiSnapshot(module.recordBiSnapshot), []);
  assert.equal(module.recordBiSnapshot.schemaVersion, 1);
  assert.equal(module.recordBiMetricDefinitions.length, 7);
  for (const entry of module.recordBiObservations) {
    assert.equal(entry.approval.basis, 'management');
    assert.equal(entry.approval.reference, 'CEO-ATTESTATION-2026-09-13');
  }
});

test('validateRecordBiSnapshot rejects a null observation with a message instead of throwing a TypeError', async (t) => {
  const { url, cleanup } = await compileRecordBi();
  t.after(cleanup);
  const { validateRecordBiSnapshot } = await import(url);

  // The defect this test exists for: the validator walked `observations`,
  // dereferenced each entry immediately, and a `null` entry produced
  // "Cannot read properties of null" out of a function whose contract is to
  // return a list of messages.
  let errors;
  assert.doesNotThrow(() => { errors = validateRecordBiSnapshot(snapshot({ observations: [null] })); });
  assert.ok(Array.isArray(errors));
  assert.deepEqual(errors, ['observations[0] must be an object']);

  // And the same for every other non-object entry the array can hold.
  for (const entry of [undefined, 0, 'observation', true]) {
    assert.doesNotThrow(() => { errors = validateRecordBiSnapshot(snapshot({ observations: [entry] })); });
    assert.deepEqual(errors, ['observations[0] must be an object']);
  }
});

test('validateRecordBiSnapshot accepts a well-formed snapshot and rejects each contract break', async (t) => {
  const { url, cleanup } = await compileRecordBi();
  t.after(cleanup);
  const { validateRecordBiSnapshot, recordBiMetricDefinitions } = await import(url);

  assert.deepEqual(validateRecordBiSnapshot(snapshot()), []);
  assert.deepEqual(validateRecordBiSnapshot(snapshot({ observations: [observation({ value: 0 })] })), []);
  assert.deepEqual(validateRecordBiSnapshot(snapshot({ observations: [asOfObservation()] })), []);

  const cases = [
    [snapshot({ observations: [observation({ metricId: 'private-donor-data' })] }), /metricId is unknown/],
    [snapshot({ observations: [observation(), observation()] }), /duplicates another observation/],
    [snapshot({ observations: [observation({ unit: 'EUR' })] }), /unit must match/],
    [snapshot({ privateField: 'must not be published' }), /unsupported properties/],
    [snapshot({ schemaVersion: 2 }), /schemaVersion must be 1/],
    [snapshot({ status: 'published', observations: [] }), /published snapshots require at least one observation/],
    [snapshot({ status: 'empty', observations: [observation()] }), /empty snapshots cannot contain observations/],
    [snapshot({ observations: [observation({ value: null })] }), /unavailableReason is required/],
    [snapshot({ observations: [asOfObservation({ value: 1.5 })] }), /must be an integer/],
    [snapshot({ observations: [observation(), observation({ period: { start: '2026-06-15', end: '2026-07-15' }, value: 25 })] }), /overlaps/],
    [snapshot({ refreshedAt: '2026-06-01' }), /later than snapshot/],
    // An approved observation with no approval basis cannot say whose
    // authority the number carries.
    [snapshot({ observations: [observation({ approval: { status: 'approved', reference: 'TEST-APPROVAL-001', approvedBy: 'Test data owner', approvedAt: '2026-09-13' } })] }), /approval basis/],
    [snapshot({ approval: { status: 'approved', reference: 'TEST-APPROVAL-001', approvedBy: 'Test data owner', approvedAt: '2026-09-13' } }), /snapshot approval.basis/],
    [snapshot({ observations: [observation({ approval: { ...approval, basis: 'boardroom-vote' } })] }), /approval basis/],
    [null, /snapshot must be an object/],
  ];
  for (const [value, expected] of cases) {
    const errors = validateRecordBiSnapshot(value);
    assert.ok(errors.length > 0, `expected ${expected} for ${JSON.stringify(value)?.slice(0, 80)}`);
    assert.match(errors.join('\n'), expected);
  }

  // A pending snapshot keeps a null basis: nobody has signed yet, so there is
  // no authority to attribute.
  assert.deepEqual(validateRecordBiSnapshot({
    ...snapshot({ status: 'empty', observations: [] }),
    approval: { ...approval, status: 'pending', basis: null, approvedBy: null, approvedAt: null },
  }), []);

  const ids = recordBiMetricDefinitions.map((definition) => definition.id);
  assert.equal(new Set(ids).size, ids.length, 'the schema defines the same metric twice');
  assert.ok(ids.includes('grants-awarded'));
  assert.ok(ids.includes('publications'));
});

test('the module refuses to load a snapshot that fails its own validation', async (t) => {
  const invalid = snapshot({ observations: [observation({ unit: 'EUR' })] });
  const { url, cleanup } = await compileRecordBi({ snapshot: invalid });
  t.after(cleanup);
  await assert.rejects(() => import(url), /Invalid Record BI snapshot: observations\[0\]\.unit must match annual-revenue \(USD\)/);

  const nullObservation = snapshot({ observations: [null] });
  const second = await compileRecordBi({ snapshot: nullObservation });
  t.after(second.cleanup);
  await assert.rejects(() => import(second.url), /observations\[0\] must be an object/);

  const noBasis = snapshot({ observations: [observation({ approval: { status: 'approved', reference: 'TEST-APPROVAL-001', approvedBy: 'Test data owner', approvedAt: '2026-09-13' } })] });
  const third = await compileRecordBi({ snapshot: noBasis });
  t.after(third.cleanup);
  await assert.rejects(() => import(third.url), /approval requires approved status, an approval basis/);
});

test('recordBiStatusForMetric reports not-reported, reported, and stale from the loaded snapshot', async (t) => {
  const empty = await compileRecordBi({ snapshot: snapshot({ status: 'empty', asOf: null, observations: [], approval: { ...approval, status: 'pending', basis: null, approvedBy: null, approvedAt: null } }) });
  t.after(empty.cleanup);
  const emptyModule = await import(empty.url);
  for (const definition of emptyModule.recordBiMetricDefinitions) {
    assert.equal(emptyModule.recordBiStatusForMetric(definition.id), 'not-reported');
  }

  const published = await compileRecordBi({ snapshot: snapshot() });
  t.after(published.cleanup);
  const { recordBiStatusForMetric, recordBiIsStale } = await import(published.url);

  assert.equal(recordBiStatusForMetric('annual-revenue', '2026-09-13'), 'reported');
  // `nextReviewDate` is 2027-01-01, so the same observation is stale once the
  // clock passes it — without changing the data.
  assert.equal(recordBiStatusForMetric('annual-revenue', '2027-01-02'), 'stale');
  // A metric with no observations at all is not reported, never zero.
  assert.equal(recordBiStatusForMetric('completed-research-outputs', '2026-09-13'), 'not-reported');

  assert.equal(recordBiIsStale(observation({ nextReviewDate: '2026-01-01' }), '2026-09-13'), true);
  assert.equal(recordBiIsStale(observation({ nextReviewDate: '2027-01-01' }), '2026-09-13'), false);

  const unavailable = await compileRecordBi({
    snapshot: snapshot({ observations: [observation({ value: null, unavailableReason: 'Pending release' })] }),
  });
  t.after(unavailable.cleanup);
  const unavailableModule = await import(unavailable.url);
  // An observation whose value is unavailable is not a reported zero.
  assert.equal(unavailableModule.recordBiStatusForMetric('annual-revenue', '2026-09-13'), 'not-reported');
});

// The three publication states are the point of the value-state model. A
// measured zero and an approved-but-unpublished measure are opposite claims
// about the institution, and "nothing has been approved" is a third claim
// again. If any two of them can render as the same thing, the room is lying
// about one of them.
test('a measured zero, an approved unavailability, and an unpublished measure are three distinct states', async (t) => {
  // (a) No approved snapshot: nothing is published, and that is not a zero.
  const emptySnapshot = snapshot({ status: 'empty', asOf: null, observations: [], approval: { ...approval, status: 'pending', basis: null, approvedBy: null, approvedAt: null } });
  const empty = await compileRecordBi({ snapshot: emptySnapshot });
  t.after(empty.cleanup);
  const emptyModule = await import(empty.url);
  for (const definition of emptyModule.recordBiMetricDefinitions) {
    assert.equal(emptyModule.recordBiValueStateForMetric(definition.id), 'no-snapshot', `${definition.id} must not claim a value from an empty snapshot`);
  }

  // (b) A measured, approved zero. It is a value, and it survives the
  // aggregation path as the number 0 rather than collapsing to null.
  const zeroSnapshot = snapshot({
    observations: [asOfObservation({ metricId: 'publications', value: 0, dimensions: { 'publication-type': 'journal-article' } })],
  });
  const zero = await compileRecordBi({ snapshot: zeroSnapshot });
  t.after(zero.cleanup);
  const zeroModule = await import(zero.url);
  const zeroDefinition = zeroModule.recordBiMetricDefinition('publications');
  assert.equal(zeroModule.recordBiValueStateForMetric('publications'), 'measured');
  assert.equal(zeroModule.recordBiObservationValueState(zeroSnapshot.observations[0]), 'measured');
  // A measure with no observation is still no-snapshot in the same snapshot.
  assert.equal(zeroModule.recordBiValueStateForMetric('grants-awarded'), 'no-snapshot');
  assert.notEqual(zeroModule.recordBiValueStateForMetric('grants-awarded'), zeroModule.recordBiValueStateForMetric('publications'));

  const zeroAggregate = latestMetricAggregate(zeroDefinition, zeroModule.recordBiObservations);
  assert.notEqual(zeroAggregate, null);
  assert.strictEqual(zeroAggregate.value, 0, 'a measured zero must not be aggregated into null');
  const zeroGroup = aggregateMetricObservations(zeroDefinition, zeroModule.recordBiObservations);
  assert.strictEqual(zeroGroup[0].value, 0);
  assert.equal(zeroGroup[0].unavailableReason, undefined);

  // (c) An approved observation whose value is explicitly unavailable. It is
  // a different state from (a): the institution has published a position, and
  // the position is that the figure is not available.
  const unavailableSnapshot = snapshot({
    observations: [asOfObservation({ metricId: 'publications', value: null, unavailableReason: 'No approved count' })],
  });
  const unavailable = await compileRecordBi({ snapshot: unavailableSnapshot });
  t.after(unavailable.cleanup);
  const unavailableModule = await import(unavailable.url);
  assert.equal(unavailableModule.recordBiValueStateForMetric('publications'), 'unavailable');
  assert.equal(unavailableModule.recordBiObservationValueState(unavailableSnapshot.observations[0]), 'unavailable');
  assert.notEqual(unavailableModule.recordBiValueStateForMetric('publications'), emptyModule.recordBiValueStateForMetric('publications'));

  // And an unavailable aggregate stays null instead of becoming a zero.
  const unavailableDefinition = unavailableModule.recordBiMetricDefinition('publications');
  const unavailableAggregate = latestMetricAggregate(unavailableDefinition, unavailableModule.recordBiObservations);
  assert.strictEqual(unavailableAggregate.value, null);
  assert.match(unavailableAggregate.unavailableReason, /No approved count/);
});

test('a partly published measure reports unavailable at the measure level rather than overstating', async (t) => {
  const mixed = snapshot({
    observations: [
      asOfObservation({ metricId: 'publications', value: 4, dimensions: { 'publication-type': 'journal-article' } }),
      asOfObservation({ metricId: 'publications', value: null, unavailableReason: 'Conference count not approved', dimensions: { 'publication-type': 'conference-paper' } }),
    ],
  });
  const { url, cleanup } = await compileRecordBi({ snapshot: mixed });
  t.after(cleanup);
  const { recordBiValueStateForMetric, recordBiObservationValueState } = await import(url);

  assert.equal(recordBiValueStateForMetric('publications'), 'unavailable');
  assert.equal(recordBiObservationValueState(mixed.observations[0]), 'measured');
  assert.equal(recordBiObservationValueState(mixed.observations[1]), 'unavailable');
});

test('recordBiApprovalLabel and recordBiApprovalBasisLabel render public copy for the enums', async (t) => {
  const { url, cleanup } = await compileRecordBi();
  t.after(cleanup);
  const { recordBiApprovalBasisLabel, recordBiApprovalBasisLabels, recordBiApprovalLabel, recordBiApprovalLabels } = await import(url);

  assert.deepEqual(Object.keys(recordBiApprovalLabels).sort(), ['approved', 'pending']);
  assert.equal(recordBiApprovalLabel('pending'), 'Pending approval');
  assert.equal(recordBiApprovalLabel('approved'), 'Approved');
  for (const [value, label] of Object.entries(recordBiApprovalLabels)) {
    // The raw enum must never be the public label, and the label must not
    // overstate a state the snapshot has not reached.
    assert.notEqual(label, value);
    assert.match(label, /^[A-Z]/);
  }

  // A management attestation must not be able to read as a board approval.
  assert.deepEqual(Object.keys(recordBiApprovalBasisLabels).sort(), ['board', 'external-publication', 'management']);
  assert.equal(recordBiApprovalBasisLabel('management'), 'Management attestation');
  assert.equal(recordBiApprovalBasisLabel('board'), 'Board approved');
  assert.equal(recordBiApprovalBasisLabel('external-publication'), 'External publication');
  assert.notEqual(recordBiApprovalBasisLabel('management'), recordBiApprovalBasisLabel('board'));
  assert.equal(recordBiApprovalBasisLabel(null), 'No approval basis recorded');
  for (const [value, label] of Object.entries(recordBiApprovalBasisLabels)) {
    assert.notEqual(label, value);
    assert.match(label, /^[A-Z]/);
  }

  const published = await compileRecordBi({ snapshot: snapshot() });
  t.after(published.cleanup);
  const publishedModule = await import(published.url);
  assert.equal(publishedModule.recordBiApprovalLabel(publishedModule.recordBiSnapshot.approval.status), 'Approved');
  assert.equal(publishedModule.recordBiApprovalBasisLabel(publishedModule.recordBiSnapshot.approval.basis), 'Management attestation');
});

test('recordBiMetricDefinition resolves known ids and returns undefined for unknown ones', async (t) => {
  const { url, cleanup } = await compileRecordBi();
  t.after(cleanup);
  const { recordBiMetricDefinition } = await import(url);

  const definition = recordBiMetricDefinition('annual-revenue');
  assert.equal(definition.unit, 'USD');
  assert.deepEqual([...definition.dimensions], ['source']);
  assert.equal(recordBiMetricDefinition('grants-awarded').temporalKind, 'asOf');
  assert.equal(recordBiMetricDefinition('funding-awarded'), undefined);
  assert.equal(recordBiMetricDefinition('private-donor-data'), undefined);
});

test('the registry describes a nonprofit research institute rather than a sponsor scoreboard', async (t) => {
  const { url, cleanup } = await compileRecordBi();
  t.after(cleanup);
  const { recordBiMetricDefinitions } = await import(url);

  // Every measure carries the full definitional contract. A metric without a
  // stated population and exclusion cannot be audited by a reader.
  for (const definition of recordBiMetricDefinitions) {
    for (const field of ['population', 'exclusions', 'grain', 'description']) {
      assert.equal(typeof definition[field], 'string', `${definition.id}.${field} must be a string`);
      assert.ok(definition[field].trim().length > 0, `${definition.id}.${field} must not be empty`);
    }
    assert.ok(definition.dimensions.length > 0, `${definition.id} must declare at least one dimension`);
    assert.ok(['period', 'asOf'].includes(definition.temporalKind));
    assert.ok(['currency', 'integer'].includes(definition.valueType));
  }

  // The measures a sponsor scoreboard carries and a charity does not are gone.
  const ids = recordBiMetricDefinitions.map((definition) => definition.id);
  for (const retired of ['funding-awarded', 'active-research-projects', 'active-institutional-partnerships']) {
    assert.ok(!ids.includes(retired), `${retired} describes a contractor's past performance, not a charity's position`);
  }
  assert.ok(ids.includes('contributions-received'));
});
