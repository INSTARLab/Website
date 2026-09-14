/**
 * Runtime coverage for `src/data/record-bi/index.ts`.
 *
 * That module had none. It is TypeScript with two JSON imports, so Node cannot
 * import it directly (`--experimental-strip-types` is not compiled into every
 * Node build, and even where it is, a bare `./current.json` import needs an
 * import attribute in ESM). Its three exported functions were therefore only
 * ever executed at Astro build time, with `tsc --noEmit` as the real gate — and
 * `tsc` cannot see a runtime `TypeError` on `observations: [null]`, which is
 * exactly how one survived until a review wave found it.
 *
 * This harness closes that gap without touching the source file: it reads
 * `index.ts`, points the two JSON imports at absolute file URLs with the import
 * attribute Node requires, transforms the TypeScript away with Vite's own Oxc
 * transform (the same transformer the site builds through), writes the result
 * to a scratch directory, and imports it. `recordBiStatusForMetric` and
 * `recordBiIsStale` read the module-level snapshot, so the harness can
 * substitute a snapshot to exercise the branches the production empty snapshot
 * never reaches.
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
  reference: 'TEST-APPROVAL-001',
  approvedBy: 'Test data owner',
  approvedAt: '2026-09-13',
};

const observation = (overrides = {}) => ({
  metricId: 'funding-awarded',
  value: 125000,
  unit: 'USD',
  period: { start: '2026-01-01', end: '2026-06-30' },
  asOf: null,
  dimensions: { category: 'federal' },
  source,
  approval,
  reviewOwner: 'Test data owner',
  nextReviewDate: '2027-01-01',
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
  // The real snapshot is still empty and still awaiting approval. This is the
  // module's import-time assertion, executed rather than type-checked.
  assert.equal(module.recordBiSnapshot.status, 'empty');
  assert.deepEqual(module.recordBiObservations, []);
  assert.equal(module.recordBiSnapshot.approval.status, 'pending');
  assert.equal(module.recordBiSnapshot.approval.reference, 'RR-208-PENDING');
  assert.deepEqual(module.validateRecordBiSnapshot(module.recordBiSnapshot), []);
  assert.equal(module.recordBiSnapshot.schemaVersion, 1);
  assert.equal(module.recordBiMetricDefinitions.length, 4);
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

  const cases = [
    [snapshot({ observations: [observation({ metricId: 'private-donor-data' })] }), /metricId is unknown/],
    [snapshot({ observations: [observation(), observation()] }), /duplicates another observation/],
    [snapshot({ observations: [observation({ unit: 'EUR' })] }), /unit must match/],
    [snapshot({ privateField: 'must not be published' }), /unsupported properties/],
    [snapshot({ schemaVersion: 2 }), /schemaVersion must be 1/],
    [snapshot({ status: 'published', observations: [] }), /published snapshots require at least one observation/],
    [snapshot({ status: 'empty', observations: [observation()] }), /empty snapshots cannot contain observations/],
    [snapshot({ observations: [observation({ value: null })] }), /unavailableReason is required/],
    [snapshot({ observations: [observation({ metricId: 'active-research-projects', unit: 'projects', value: 1.5, period: null, asOf: '2026-09-13', dimensions: { domain: 'computing', status: 'active' } })] }), /must be an integer/],
    [snapshot({ observations: [observation(), observation({ period: { start: '2026-06-15', end: '2026-07-15' }, value: 25 })] }), /overlaps/],
    [snapshot({ refreshedAt: '2026-06-01' }), /later than snapshot/],
    [null, /snapshot must be an object/],
  ];
  for (const [value, expected] of cases) {
    const errors = validateRecordBiSnapshot(value);
    assert.ok(errors.length > 0, `expected ${expected} for ${JSON.stringify(value)?.slice(0, 80)}`);
    assert.match(errors.join('\n'), expected);
  }

  // The one legitimate empty shape: a pending snapshot with nothing in it.
  assert.deepEqual(validateRecordBiSnapshot({
    ...snapshot({ status: 'empty', observations: [] }),
    approval: { ...approval, status: 'pending', approvedBy: null, approvedAt: null },
  }), []);

  const ids = recordBiMetricDefinitions.map((definition) => definition.id);
  assert.equal(new Set(ids).size, ids.length, 'the schema defines the same metric twice');
  assert.ok(ids.includes('funding-awarded'));
});

test('the module refuses to load a snapshot that fails its own validation', async (t) => {
  const invalid = snapshot({ observations: [observation({ unit: 'EUR' })] });
  const { url, cleanup } = await compileRecordBi({ snapshot: invalid });
  t.after(cleanup);
  await assert.rejects(() => import(url), /Invalid Record BI snapshot: observations\[0\]\.unit must match funding-awarded \(USD\)/);

  const nullObservation = snapshot({ observations: [null] });
  const second = await compileRecordBi({ snapshot: nullObservation });
  t.after(second.cleanup);
  await assert.rejects(() => import(second.url), /observations\[0\] must be an object/);
});

test('recordBiStatusForMetric reports not-reported, reported, and stale from the loaded snapshot', async (t) => {
  const empty = await compileRecordBi();
  t.after(empty.cleanup);
  const emptyModule = await import(empty.url);
  for (const definition of emptyModule.recordBiMetricDefinitions) {
    assert.equal(emptyModule.recordBiStatusForMetric(definition.id), 'not-reported');
  }

  const published = await compileRecordBi({ snapshot: snapshot() });
  t.after(published.cleanup);
  const { recordBiStatusForMetric, recordBiIsStale } = await import(published.url);

  assert.equal(recordBiStatusForMetric('funding-awarded', '2026-09-13'), 'reported');
  // `nextReviewDate` is 2027-01-01, so the same observation is stale once the
  // clock passes it — without changing the data.
  assert.equal(recordBiStatusForMetric('funding-awarded', '2027-01-02'), 'stale');
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
  assert.equal(unavailableModule.recordBiStatusForMetric('funding-awarded', '2026-09-13'), 'not-reported');
});

test('recordBiApprovalLabel renders public copy for the approval enum', async (t) => {
  const { url, cleanup } = await compileRecordBi();
  t.after(cleanup);
  const { recordBiApprovalLabel, recordBiApprovalLabels } = await import(url);

  assert.deepEqual(Object.keys(recordBiApprovalLabels).sort(), ['approved', 'pending']);
  assert.equal(recordBiApprovalLabel('pending'), 'Pending approval');
  assert.equal(recordBiApprovalLabel('approved'), 'Approved');
  for (const [value, label] of Object.entries(recordBiApprovalLabels)) {
    // The raw enum must never be the public label, and the label must not
    // overstate a state the snapshot has not reached.
    assert.notEqual(label, value);
    assert.match(label, /^[A-Z]/);
  }

  const published = await compileRecordBi({ snapshot: snapshot() });
  t.after(published.cleanup);
  const publishedModule = await import(published.url);
  assert.equal(publishedModule.recordBiApprovalLabel(publishedModule.recordBiSnapshot.approval.status), 'Approved');
});

test('recordBiMetricDefinition resolves known ids and returns undefined for unknown ones', async (t) => {
  const { url, cleanup } = await compileRecordBi();
  t.after(cleanup);
  const { recordBiMetricDefinition } = await import(url);

  const definition = recordBiMetricDefinition('funding-awarded');
  assert.equal(definition.unit, 'USD');
  assert.deepEqual([...definition.dimensions], ['category']);
  assert.equal(recordBiMetricDefinition('private-donor-data'), undefined);
});
