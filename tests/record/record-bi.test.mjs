import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assertValidSnapshot,
  CEO_ATTESTATION_REFERENCE,
  CEO_ATTESTED_ZERO_METRIC_IDS,
  metricDefinitions,
  parseCsv,
  validateCeoAttestedZeros,
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
  basis: 'management',
  reference: 'TEST-APPROVAL-001',
  approvedBy: 'Test data owner',
  approvedAt: '2026-09-13',
};

function observation(overrides = {}) {
  return {
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
  };
}

/** The as-of counterpart, for measures whose grain is a cumulative date. */
function asOfObservation(overrides = {}) {
  return observation({
    metricId: 'publications',
    value: 0,
    unit: 'publications',
    period: null,
    asOf: '2026-09-13',
    dimensions: { 'publication-type': 'journal-article' },
    ...overrides,
  });
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

test('the production snapshot defines the nonprofit metric registry and publishes from it', async () => {
  assert.deepEqual(metricDefinitions.map((metric) => metric.id), [
    'grants-awarded',
    'contributions-received',
    'annual-revenue',
    'publications',
    'completed-research-outputs',
    'datasets-released',
    'technology-transfers',
  ]);
  const current = JSON.parse(await readFile('src/data/record-bi/current.json', 'utf8'));
  assert.deepEqual(validateSnapshot(current), []);
  assert.equal(current.status, 'published');
  assert.equal(current.approval.status, 'approved');
  // The approval basis is part of the published contract: a management
  // attestation must not be able to read as a board resolution.
  assert.equal(current.approval.basis, 'management');
  assert.ok(current.observations.length > 0);
});

test('the shipped snapshot publishes measured zeros and explicit unavailability, never one as the other', async () => {
  const current = JSON.parse(await readFile('src/data/record-bi/current.json', 'utf8'));
  const rowsFor = (metricId) => current.observations.filter((entry) => entry.metricId === metricId);

  // A measured zero is a number. If an edit ever turns one of these into a
  // null, the page silently starts publishing "Not reported" instead of "0",
  // which is the opposite claim about the institution.
  for (const metricId of ['grants-awarded', 'publications']) {
    const rows = rowsFor(metricId);
    assert.ok(rows.length > 0, `${metricId} has no published observation`);
    for (const row of rows) {
      assert.equal(row.value, 0, `${metricId} must publish a measured zero`);
      assert.equal(row.unavailableReason, undefined, `${metricId} must not carry an unavailable reason for a measured zero`);
    }
  }

  // An approved observation with no value says why. The reason is the whole
  // difference between this state and an unpublished measure.
  const unavailable = current.observations.filter((entry) => entry.value === null);
  assert.ok(unavailable.length > 0, 'the snapshot no longer exercises the unavailable state');
  for (const row of unavailable) {
    assert.equal(typeof row.unavailableReason, 'string');
    assert.ok(row.unavailableReason.trim().length > 0);
  }

  // And no other measure is quietly asserted as zero.
  for (const row of current.observations) {
    if (row.value === 0) assert.ok(['grants-awarded', 'publications'].includes(row.metricId), `${row.metricId} publishes a zero that no approver attested`);
  }
});

test('valid observations require approved provenance and preserve zero as a measured value', () => {
  const valid = snapshot({ observations: [observation({ value: 0 })] });
  assert.doesNotThrow(() => assertValidSnapshot(valid));
  assert.deepEqual(validateSnapshot(valid), []);

  // The same for a cumulative as-of measure, and the value must survive
  // validation as the number zero rather than being normalised to null.
  const asOfZero = snapshot({ observations: [asOfObservation()] });
  assert.deepEqual(validateSnapshot(asOfZero), []);
  assert.strictEqual(asOfZero.observations[0].value, 0);

  // An approved observation without a basis is not approved provenance.
  const noBasis = snapshot({ observations: [observation({ approval: { ...approval, basis: undefined } })] });
  assert.match(validateSnapshot(noBasis).join('\n'), /approval basis/);
});

test('validation rejects unknown data, duplicate periods, mismatched units, and fractional counts', () => {
  const unknown = snapshot({ observations: [observation({ metricId: 'private-donor-data' })] });
  assert.match(validateSnapshot(unknown).join('\n'), /metricId is unknown/);

  const duplicate = snapshot({ observations: [observation(), observation()] });
  assert.match(validateSnapshot(duplicate).join('\n'), /duplicates another observation/);

  const mismatched = snapshot({ observations: [observation({ unit: 'EUR' })] });
  assert.match(validateSnapshot(mismatched).join('\n'), /unit must match/);

  const fractional = snapshot({ observations: [asOfObservation({ value: 1.5 })] });
  assert.match(validateSnapshot(fractional).join('\n'), /must be an integer/);

  const unsupported = snapshot({ privateField: 'must not be published' });
  assert.match(validateSnapshot(unsupported).join('\n'), /unsupported properties/);
});

test('CSV parsing handles quoted fields and produces a deterministic equivalent snapshot', async () => {
  const parsed = parseCsv('metricId,value,unit,periodStart,periodEnd,asOf,dimensions,unavailableReason,reviewOwner,nextReviewDate\nannual-revenue,125000,USD,2026-01-01,2026-06-30,,"{""source"":""contributions""}",,"Test data owner",2027-01-01\n');
  assert.equal(parsed[0].metricId, 'annual-revenue');
  assert.equal(parsed[0].dimensions, '{"source":"contributions"}');
  assert.match(validateCsvHeaders(['metricId', 'unknown']).join('\n'), /unsupported headers/);
  assert.throws(() => parseCsv('metricId,value\n"unterminated,1\n'), /unterminated/);
  assert.throws(() => parseCsv('metricId,value\n"quoted"tail,1\n'), /after a closing quote/);

  const directory = await mkdtemp(join(tmpdir(), 'record-bi-'));
  try {
    const inputPath = join(directory, 'observations.csv');
    const metadataPath = join(directory, 'metadata.json');
    const currentPath = join(directory, 'current.json');
    const historyDir = join(directory, 'history');
    await writeFile(inputPath, 'metricId,value,unit,periodStart,periodEnd,asOf,dimensions,unavailableReason,reviewOwner,nextReviewDate\nannual-revenue,125000,USD,2026-01-01,2026-06-30,,"{""source"":""contributions""}",,"Test data owner",2027-01-01\n');
    await writeFile(metadataPath, JSON.stringify(snapshot({ observations: undefined })));
    const imported = await importSnapshot({ inputPath, metadataPath, currentPath, historyDir });
    assert.deepEqual(imported.observations, [observation()]);
    assert.deepEqual(JSON.parse(await readFile(currentPath, 'utf8')).observations, [observation()]);
    const retried = await importSnapshot({ inputPath, metadataPath, currentPath, historyDir });
    assert.deepEqual(retried, imported, 'retrying the same immutable snapshot is idempotent');

    await writeFile(inputPath, 'metricId,value,unit,periodStart,periodEnd,asOf,dimensions,unavailableReason,reviewOwner,nextReviewDate\nannual-revenue,125001,USD,2026-01-01,2026-06-30,,"{""source"":""contributions""}",,"Test data owner",2027-01-01\n');
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

test('a CSV row must override source and approval metadata completely or not at all', async () => {
  const header = 'metricId,value,unit,periodStart,periodEnd,asOf,dimensions,unavailableReason,reviewOwner,nextReviewDate,sourceId,sourceLabel,sourceLocator,sourceRetrievedAt,approvalStatus,approvalBasis,approvalReference,approvedBy,approvedAt';
  const fields = ['annual-revenue', '125000', 'USD', '2026-01-01', '2026-06-30', '', '{"source":"contributions"}', '', 'Test data owner', '2027-01-01'];
  const columns = { sourceId: 10, sourceLabel: 11, sourceLocator: 12, sourceRetrievedAt: 13, approvalStatus: 14, approvalBasis: 15, approvalReference: 16, approvedBy: 17, approvedAt: 18 };
  const row = (overrides) => {
    const cells = [...fields, '', '', '', '', '', '', '', '', ''];
    for (const [column, value] of Object.entries(overrides)) cells[columns[column]] = value;
    return cells.join(',');
  };

  const directory = await mkdtemp(join(tmpdir(), 'record-bi-partial-'));
  try {
    const inputPath = join(directory, 'observations.csv');
    const metadataPath = join(directory, 'metadata.json');
    const currentPath = join(directory, 'current.json');
    const historyDir = join(directory, 'history');
    await writeFile(metadataPath, JSON.stringify(snapshot({ observations: undefined })));

    // A lone source id or a lone approval reference would otherwise be stitched
    // to the sidecar label/locator/dates, publishing a source that never existed.
    await writeFile(inputPath, `${header}\n${row({ sourceId: 'SRC-TEST-002' })}\n`);
    await assert.rejects(() => importSnapshot({ inputPath, metadataPath, currentPath, historyDir }), /source override must supply every column/);

    await writeFile(inputPath, `${header}\n${row({ approvalReference: 'TEST-APPROVAL-002' })}\n`);
    await assert.rejects(() => importSnapshot({ inputPath, metadataPath, currentPath, historyDir }), /approval override must supply every column/);

    // An override that names the reference and the approver but not the basis
    // would publish a signed number with nobody's authority attached to it.
    await writeFile(inputPath, `${header}\n${row({ approvalStatus: 'approved', approvalReference: 'TEST-APPROVAL-002', approvedBy: 'Second data owner', approvedAt: '2026-09-13' })}\n`);
    await assert.rejects(() => importSnapshot({ inputPath, metadataPath, currentPath, historyDir }), /approval override must supply every column/);

    // Supplying nothing inherits the sidecar for the whole row.
    const inheritedPath = join(directory, 'inherited.csv');
    const inheritedMetadataPath = join(directory, 'inherited.metadata.json');
    await writeFile(inheritedPath, `${header}\n${row({})}\n`);
    await writeFile(inheritedMetadataPath, JSON.stringify(snapshot({ snapshotId: 'test-inherited', observations: undefined })));
    const inherited = await importSnapshot({ inputPath: inheritedPath, metadataPath: inheritedMetadataPath, currentPath, historyDir });
    assert.deepEqual(inherited.observations[0].source, source);
    assert.deepEqual(inherited.observations[0].approval, approval);

    // Supplying everything replaces the sidecar for the whole row.
    const overriddenSource = { id: 'SRC-TEST-002', label: 'Second approved aggregate', locator: 'https://example.test/second.csv', retrievedAt: '2026-09-13' };
    const overriddenApproval = { status: 'approved', basis: 'board', reference: 'TEST-APPROVAL-002', approvedBy: 'Second data owner', approvedAt: '2026-09-13' };
    const overriddenPath = join(directory, 'overridden.csv');
    const overriddenMetadataPath = join(directory, 'overridden.metadata.json');
    await writeFile(overriddenPath, `${header}\n${row({
      sourceId: overriddenSource.id,
      sourceLabel: overriddenSource.label,
      sourceLocator: overriddenSource.locator,
      sourceRetrievedAt: overriddenSource.retrievedAt,
      approvalStatus: overriddenApproval.status,
      approvalBasis: overriddenApproval.basis,
      approvalReference: overriddenApproval.reference,
      approvedBy: overriddenApproval.approvedBy,
      approvedAt: overriddenApproval.approvedAt,
    })}\n`);
    await writeFile(overriddenMetadataPath, JSON.stringify(snapshot({ snapshotId: 'test-overridden', observations: undefined })));
    const overridden = await importSnapshot({ inputPath: overriddenPath, metadataPath: overriddenMetadataPath, currentPath, historyDir });
    assert.deepEqual(overridden.observations[0].source, overriddenSource);
    assert.deepEqual(overridden.observations[0].approval, overriddenApproval);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
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

test('the shipped snapshot keeps the CEO-attested zero pin and the blocked-domain register reconciles to it', async () => {
  // The pin is the software half of RR-208 honesty: two measured zeros, no
  // other zeros, every null carrying its reason. The blocked-domain register
  // is the documentation half: seven domains with an owner and a next action.
  assert.deepEqual([...CEO_ATTESTED_ZERO_METRIC_IDS].sort(), ['grants-awarded', 'publications']);
  assert.equal(CEO_ATTESTATION_REFERENCE, 'CEO-ATTESTATION-2026-09-13');

  const current = JSON.parse(await readFile('src/data/record-bi/current.json', 'utf8'));
  assert.deepEqual(validateCeoAttestedZeros(current), []);

  const blocked = JSON.parse(await readFile('src/data/record-bi/blocked-domains.json', 'utf8'));
  assert.deepEqual(blocked.domains.map((entry) => entry.id), [
    'active-projects',
    'active-partnerships',
    'contributions',
    'revenue',
    'outputs',
    'datasets',
    'transfers',
  ]);
  const metricIds = new Set(metricDefinitions.map((metric) => metric.id));
  for (const entry of blocked.domains) {
    assert.equal(typeof entry.label, 'string');
    assert.ok(entry.label.trim().length > 0);
    // The owner is a role the snapshot already attests, never a personal
    // name no source supports.
    assert.equal(entry.owner, 'Chief Executive Officer, INSTAR Lab Inc.');
    assert.ok(entry.nextAction.trim().length > 0, `${entry.id} must name its exact next action`);
    assert.ok(entry.missingDependency.trim().length > 0, `${entry.id} must name its exact missing dependency`);
    assert.ok(['unavailable', 'no-snapshot'].includes(entry.state), `${entry.id} has an unknown blocked state`);
    if (entry.metricId === null) {
      // Domains with no approved definition stay no-snapshot: nothing has
      // been approved, so there is nothing to report.
      assert.equal(entry.state, 'no-snapshot');
      assert.ok(!current.observations.some((row) => row.metricId === entry.id), `${entry.id} must not appear as a metric`);
    } else {
      assert.ok(metricIds.has(entry.metricId), `${entry.id} points at an unknown metric ${entry.metricId}`);
      assert.equal(entry.state, 'unavailable');
      const rows = current.observations.filter((row) => row.metricId === entry.metricId);
      assert.ok(rows.length > 0, `${entry.metricId} must have an approved unavailable observation`);
      for (const row of rows) {
        assert.equal(row.value, null, `${entry.metricId} must stay Not reported, never zero`);
        assert.ok(row.unavailableReason.trim().length > 0);
      }
    }
    // A blocked domain never carries a value. The register is JSON data, so
    // the absence of a value field is the assertion.
    assert.ok(!Object.hasOwn(entry, 'value'), `${entry.id} must not carry a value`);
  }

  // And the two measured measures are not blocked: each publishes its
  // CEO-attested zero.
  for (const metricId of CEO_ATTESTED_ZERO_METRIC_IDS) {
    assert.ok(!blocked.domains.some((entry) => entry.metricId === metricId), `${metricId} is measured and must not be blocked`);
    const rows = current.observations.filter((row) => row.metricId === metricId);
    assert.ok(rows.length > 0);
    for (const row of rows) assert.strictEqual(row.value, 0);
  }
});

test('the CEO pin rejects a flipped zero, a stray zero, and a missing reason', () => {
  const current = {
    schemaVersion: 1,
    snapshotId: 'test-pin',
    status: 'published',
    asOf: '2026-09-13',
    refreshedAt: '2026-09-13',
    source,
    approval,
    observations: [
      observation({ metricId: 'grants-awarded', value: 0, unit: 'USD', period: null, asOf: '2026-09-13', dimensions: { 'funder-type': 'federal' }, approval: { ...approval, reference: CEO_ATTESTATION_REFERENCE } }),
      observation({ metricId: 'publications', value: 0, unit: 'publications', period: null, asOf: '2026-09-13', dimensions: { 'publication-type': 'journal-article' }, approval: { ...approval, reference: CEO_ATTESTATION_REFERENCE } }),
      observation({ value: null, unavailableReason: 'No approved figure' }),
    ],
  };
  assert.deepEqual(validateCeoAttestedZeros(current), []);

  // A measured zero flipped to null silently becomes Not reported.
  assert.match(
    validateCeoAttestedZeros({ ...current, observations: current.observations.map((row) => (row.metricId === 'grants-awarded' ? { ...row, value: null, unavailableReason: 'Lost' } : row)) }).join('\n'),
    /grants-awarded must publish a measured zero/,
  );
  // A zero on a blocked measure states something no approver said.
  assert.match(
    validateCeoAttestedZeros({ ...current, observations: current.observations.map((row) => (row.metricId === 'annual-revenue' ? { ...row, value: 0 } : row)) }).join('\n'),
    /publishes a zero that no approver attested/,
  );
  // A null without its reason is a silence, not a position.
  assert.match(
    validateCeoAttestedZeros({ ...current, observations: current.observations.map((row) => (row.metricId === 'annual-revenue' ? { ...row, unavailableReason: '  ' } : row)) }).join('\n'),
    /requires a non-empty unavailable reason/,
  );
});

test('CSV rows reject honest-state confusion with the row number attached', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'record-bi-honest-'));
  try {
    const metadataPath = join(directory, 'metadata.json');
    const currentPath = join(directory, 'current.json');
    const historyDir = join(directory, 'history');
    await writeFile(metadataPath, JSON.stringify(snapshot({ observations: undefined })));
    const header = 'metricId,value,unit,periodStart,periodEnd,asOf,dimensions,unavailableReason,reviewOwner,nextReviewDate';

    // A blank value without a reason would publish a silence as if it were a
    // position. The importer names the CSV row; the snapshot validator can
    // only name an observation index.
    const blankPath = join(directory, 'blank.csv');
    await writeFile(blankPath, `${header}\nannual-revenue,,USD,2026-01-01,2026-06-30,,"{""source"":""contributions""}",,"Test data owner",2027-01-01\n`);
    await assert.rejects(() => importSnapshot({ inputPath: blankPath, metadataPath, currentPath, historyDir }), /CSV row 2: unavailableReason is required when value is blank/);

    // A measured value carrying a reason would let a number read as
    // unavailable. Zero included: a measured zero must stand alone.
    const reasonedPath = join(directory, 'reasoned.csv');
    await writeFile(reasonedPath, `${header}\nannual-revenue,125000,USD,2026-01-01,2026-06-30,,"{""source"":""contributions""}","Has a value but also a reason","Test data owner",2027-01-01\n`);
    await assert.rejects(() => importSnapshot({ inputPath: reasonedPath, metadataPath, currentPath, historyDir }), /CSV row 2: unavailableReason is only allowed when value is blank/);

    const zeroReasonedPath = join(directory, 'zero-reasoned.csv');
    await writeFile(zeroReasonedPath, `${header}\nannual-revenue,0,USD,2026-01-01,2026-06-30,,"{""source"":""contributions""}","Zero with a reason","Test data owner",2027-01-01\n`);
    await assert.rejects(() => importSnapshot({ inputPath: zeroReasonedPath, metadataPath, currentPath, historyDir }), /unavailableReason is only allowed when value is blank/);

    // An empty dimension value would publish a grain the definition never
    // declared.
    const dimensionPath = join(directory, 'dimension.csv');
    await writeFile(dimensionPath, `${header}\nannual-revenue,125000,USD,2026-01-01,2026-06-30,,"{""source"":""""}",,"Test data owner",2027-01-01\n`);
    await assert.rejects(() => importSnapshot({ inputPath: dimensionPath, metadataPath, currentPath, historyDir }), /dimensions\.source must be a non-empty string/);

    // The honest paths still import: a measured value alone, and a blank
    // value with its reason.
    const measuredPath = join(directory, 'measured.csv');
    const measuredMetadataPath = join(directory, 'measured.metadata.json');
    await writeFile(measuredPath, `${header}\nannual-revenue,125000,USD,2026-01-01,2026-06-30,,"{""source"":""contributions""}",,"Test data owner",2027-01-01\n`);
    await writeFile(measuredMetadataPath, JSON.stringify(snapshot({ snapshotId: 'test-honest-measured', observations: undefined })));
    const measured = await importSnapshot({ inputPath: measuredPath, metadataPath: measuredMetadataPath, currentPath, historyDir });
    assert.equal(measured.observations[0].value, 125000);

    const unavailablePath = join(directory, 'unavailable.csv');
    await writeFile(unavailablePath, `${header}\nannual-revenue,,USD,2026-01-01,2026-06-30,,"{""source"":""contributions""}","No approved figure","Test data owner",2027-01-01\n`);
    const unavailableMetadataPath = join(directory, 'unavailable.metadata.json');
    await writeFile(unavailableMetadataPath, JSON.stringify(snapshot({ snapshotId: 'test-honest-unavailable', observations: undefined })));
    const unavailable = await importSnapshot({ inputPath: unavailablePath, metadataPath: unavailableMetadataPath, currentPath, historyDir });
    assert.equal(unavailable.observations[0].value, null);
    assert.match(unavailable.observations[0].unavailableReason, /No approved figure/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
