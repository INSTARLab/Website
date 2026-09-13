import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assertValidSnapshot,
  metricDefinitions,
  parseCsv,
  validateCsvHeaders,
  validateSnapshot,
} from '../../scripts/record/bi-schema.mjs';
import { importSnapshot } from '../../scripts/record/import-bi.mjs';

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

function observation(overrides = {}) {
  return {
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
  };
}

function snapshot(overrides = {}) {
  return {
    schemaVersion: 1,
    snapshotId: 'test-2026-09-13',
    status: 'published',
    asOf: '2026-09-13',
    refreshedAt: '2026-09-13',
    source,
    approval,
    observations: [observation()],
    ...overrides,
  };
}

test('the production empty snapshot contract exposes four defined metrics', async () => {
  assert.deepEqual(metricDefinitions.map((metric) => metric.id), [
    'funding-awarded',
    'active-research-projects',
    'completed-research-outputs',
    'active-institutional-partnerships',
  ]);
  const current = JSON.parse(await readFile('src/data/record-bi/current.json', 'utf8'));
  assert.deepEqual(validateSnapshot(current), []);
  assert.equal(current.status, 'empty');
  assert.deepEqual(current.observations, []);
});

test('valid observations require approved provenance and preserve zero as a measured value', () => {
  const valid = snapshot({ observations: [observation({ value: 0 })] });
  assert.doesNotThrow(() => assertValidSnapshot(valid));
  assert.deepEqual(validateSnapshot(valid), []);
});

test('validation rejects unknown data, duplicate periods, mismatched units, and fractional counts', () => {
  const unknown = snapshot({ observations: [observation({ metricId: 'private-donor-data' })] });
  assert.match(validateSnapshot(unknown).join('\n'), /metricId is unknown/);

  const duplicate = snapshot({ observations: [observation(), observation()] });
  assert.match(validateSnapshot(duplicate).join('\n'), /duplicates another observation/);

  const mismatched = snapshot({ observations: [observation({ unit: 'EUR' })] });
  assert.match(validateSnapshot(mismatched).join('\n'), /unit must match/);

  const fractional = snapshot({ observations: [observation({ metricId: 'active-research-projects', unit: 'projects', value: 1.5, period: null, asOf: '2026-09-13', dimensions: { domain: 'computing', status: 'active' } })] });
  assert.match(validateSnapshot(fractional).join('\n'), /must be an integer/);

  const unsupported = snapshot({ privateField: 'must not be published' });
  assert.match(validateSnapshot(unsupported).join('\n'), /unsupported properties/);
});

test('CSV parsing handles quoted fields and produces a deterministic equivalent snapshot', async () => {
  const parsed = parseCsv('metricId,value,unit,periodStart,periodEnd,asOf,dimensions,unavailableReason,reviewOwner,nextReviewDate\nfunding-awarded,125000,USD,2026-01-01,2026-06-30,,"{""category"":""federal""}",,"Test data owner",2027-01-01\n');
  assert.equal(parsed[0].metricId, 'funding-awarded');
  assert.equal(parsed[0].dimensions, '{"category":"federal"}');
  assert.match(validateCsvHeaders(['metricId', 'unknown']).join('\n'), /unsupported headers/);
  assert.throws(() => parseCsv('metricId,value\n"unterminated,1\n'), /unterminated/);
  assert.throws(() => parseCsv('metricId,value\n"quoted"tail,1\n'), /after a closing quote/);

  const directory = await mkdtemp(join(tmpdir(), 'record-bi-'));
  try {
    const inputPath = join(directory, 'observations.csv');
    const metadataPath = join(directory, 'metadata.json');
    const currentPath = join(directory, 'current.json');
    const historyDir = join(directory, 'history');
    await writeFile(inputPath, 'metricId,value,unit,periodStart,periodEnd,asOf,dimensions,unavailableReason,reviewOwner,nextReviewDate\nfunding-awarded,125000,USD,2026-01-01,2026-06-30,,"{""category"":""federal""}",,"Test data owner",2027-01-01\n');
    await writeFile(metadataPath, JSON.stringify(snapshot({ observations: undefined })));
    const imported = await importSnapshot({ inputPath, metadataPath, currentPath, historyDir });
    assert.deepEqual(imported.observations, [observation()]);
    assert.deepEqual(JSON.parse(await readFile(currentPath, 'utf8')).observations, [observation()]);
    const retried = await importSnapshot({ inputPath, metadataPath, currentPath, historyDir });
    assert.deepEqual(retried, imported, 'retrying the same immutable snapshot is idempotent');

    await writeFile(inputPath, 'metricId,value,unit,periodStart,periodEnd,asOf,dimensions,unavailableReason,reviewOwner,nextReviewDate\nfunding-awarded,125001,USD,2026-01-01,2026-06-30,,"{""category"":""federal""}",,"Test data owner",2027-01-01\n');
    await assert.rejects(() => importSnapshot({ inputPath, metadataPath, currentPath, historyDir }), /different contents/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('validation enforces metric grain, temporal kind, chronology, and exclusive periods', () => {
  const missingDimension = snapshot({ observations: [observation({ dimensions: {} })] });
  assert.match(validateSnapshot(missingDimension).join('\n'), /must contain exactly/);

  const wrongTemporal = snapshot({ observations: [observation({ period: null, asOf: '2026-06-30' })] });
  assert.match(validateSnapshot(wrongTemporal).join('\n'), /requires period/);

  const future = snapshot({ refreshedAt: '2026-06-01', observations: [observation()] });
  assert.match(validateSnapshot(future).join('\n'), /later than snapshot/);

  const overlap = snapshot({ observations: [
    observation(),
    observation({ period: { start: '2026-06-15', end: '2026-07-15' }, value: 25 }),
  ] });
  assert.match(validateSnapshot(overlap).join('\n'), /overlaps/);
});

test('invalid imports leave the current snapshot untouched', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'record-bi-invalid-'));
  try {
    const inputPath = join(directory, 'invalid.json');
    const currentPath = join(directory, 'current.json');
    const historyDir = join(directory, 'history');
    await writeFile(currentPath, '{"sentinel":true}\n');
    await writeFile(inputPath, JSON.stringify(snapshot({ observations: [observation({ unit: 'not-a-unit' })] })));
    await assert.rejects(() => importSnapshot({ inputPath, currentPath, historyDir }), /unit must match/);
    assert.equal(await readFile(currentPath, 'utf8'), '{"sentinel":true}\n');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
