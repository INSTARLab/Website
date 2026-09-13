import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import metricSchema from '../../src/data/record-bi/schema.json' with { type: 'json' };

const metricKeys = ['id', 'domain', 'label', 'description', 'valueType', 'unit', 'aggregation', 'dimensions', 'grain', 'temporalKind', 'population', 'exclusions'];
const sourceKeys = ['id', 'label', 'locator', 'retrievedAt'];
const approvalKeys = ['status', 'reference', 'approvedBy', 'approvedAt'];
const snapshotKeys = ['schemaVersion', 'snapshotId', 'status', 'asOf', 'refreshedAt', 'source', 'approval', 'observations', 'note'];
const observationKeys = ['metricId', 'value', 'unavailableReason', 'unit', 'period', 'asOf', 'dimensions', 'source', 'approval', 'reviewOwner', 'nextReviewDate'];
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const csvRequiredHeaders = Object.freeze(['metricId', 'value', 'unit', 'periodStart', 'periodEnd', 'asOf', 'dimensions', 'unavailableReason', 'reviewOwner', 'nextReviewDate']);
export const csvOptionalHeaders = Object.freeze(['sourceId', 'sourceLabel', 'sourceLocator', 'sourceRetrievedAt', 'approvalStatus', 'approvalReference', 'approvedBy', 'approvedAt']);

const requiredString = (value) => typeof value === 'string' && value.trim().length > 0;
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const hasOnlyKeys = (value, keys) => isPlainObject(value) && Object.keys(value).every((key) => keys.includes(key));
const compareDate = (left, right) => left.localeCompare(right);
const dimensionsKey = (dimensions) => Object.entries(dimensions ?? {}).sort(([left], [right]) => left.localeCompare(right));

export function isIsoDate(value) {
  if (typeof value !== 'string' || !isoDatePattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export const metricDefinitions = Object.freeze(metricSchema.metrics.map((metric) => Object.freeze({
  ...metric,
  dimensions: Object.freeze([...metric.dimensions]),
  requiredDimensions: Object.freeze([...metric.dimensions]),
})));
const metricById = new Map(metricDefinitions.map((metric) => [metric.id, metric]));

function validateMetricDefinition(metric, index) {
  const prefix = `metrics[${index}]`;
  const errors = [];
  if (!isPlainObject(metric)) return [`${prefix} must be an object`];
  if (!hasOnlyKeys(metric, metricKeys)) errors.push(`${prefix} contains unsupported properties`);
  for (const field of ['id', 'domain', 'label', 'description', 'unit', 'grain', 'population', 'exclusions']) {
    if (!requiredString(metric[field])) errors.push(`${prefix}.${field} is required`);
  }
  if (!['currency', 'integer'].includes(metric.valueType)) errors.push(`${prefix}.valueType must be currency or integer`);
  if (!['sum', 'count'].includes(metric.aggregation)) errors.push(`${prefix}.aggregation must be sum or count`);
  if (!['period', 'asOf'].includes(metric.temporalKind)) errors.push(`${prefix}.temporalKind must be period or asOf`);
  if (!Array.isArray(metric.dimensions) || metric.dimensions.length === 0 || metric.dimensions.some((dimension) => !requiredString(dimension))) errors.push(`${prefix}.dimensions must contain one or more non-empty names`);
  else if (new Set(metric.dimensions).size !== metric.dimensions.length) errors.push(`${prefix}.dimensions must be unique`);
  return errors;
}

export function validateMetricSchema(schema = metricSchema) {
  if (!isPlainObject(schema) || !Array.isArray(schema.metrics)) return ['metric schema must contain a metrics array'];
  const errors = [];
  schema.metrics.forEach((metric, index) => errors.push(...validateMetricDefinition(metric, index)));
  const ids = schema.metrics.map((metric) => metric?.id).filter((id) => typeof id === 'string');
  if (new Set(ids).size !== ids.length) errors.push('metric ids must be unique');
  return errors;
}

const metricSchemaErrors = validateMetricSchema();
if (metricSchemaErrors.length > 0) throw new Error(`Invalid Record BI metric schema: ${metricSchemaErrors.join('; ')}`);

export function observationKey(observation) {
  return JSON.stringify({ metricId: observation.metricId, period: observation.period ?? null, asOf: observation.asOf ?? null, dimensions: dimensionsKey(observation.dimensions) });
}

function validateSource(source, prefix, errors) {
  if (!isPlainObject(source)) {
    errors.push(`${prefix} is required`);
    return;
  }
  if (!hasOnlyKeys(source, sourceKeys)) errors.push(`${prefix} contains unsupported properties`);
  for (const field of ['id', 'label', 'locator']) if (!requiredString(source[field])) errors.push(`${prefix}.${field} is required`);
  if (!isIsoDate(source.retrievedAt)) errors.push(`${prefix}.retrievedAt must be a valid YYYY-MM-DD date`);
}

function validateApproval(approval, prefix, errors, { observation = false, published = false } = {}) {
  if (!isPlainObject(approval)) {
    errors.push(`${prefix} is required`);
    return;
  }
  if (!hasOnlyKeys(approval, approvalKeys)) errors.push(`${prefix} contains unsupported properties`);
  if (!['pending', 'approved'].includes(approval.status)) errors.push(`${prefix}.status must be pending or approved`);
  if (!requiredString(approval.reference)) errors.push(`${prefix}.reference is required`);
  if (approval.approvedBy !== null && approval.approvedBy !== undefined && !requiredString(approval.approvedBy)) errors.push(`${prefix}.approvedBy must be null or a string`);
  if (approval.approvedAt !== null && approval.approvedAt !== undefined && !isIsoDate(approval.approvedAt)) errors.push(`${prefix}.approvedAt must be null or a valid YYYY-MM-DD date`);
  if (published && (approval.status !== 'approved' || !requiredString(approval.approvedBy) || !isIsoDate(approval.approvedAt))) errors.push(`${prefix} requires approved status, approver, and approvedAt for a published snapshot`);
  if (observation && (approval.status !== 'approved' || !requiredString(approval.approvedBy) || !isIsoDate(approval.approvedAt))) errors.push(`${prefix} requires approved status, reference, approver, approvedAt, and no unsupported properties`);
}

function validatePeriod(period, prefix, errors) {
  if (!isPlainObject(period) || !hasOnlyKeys(period, ['start', 'end']) || !isIsoDate(period.start) || !isIsoDate(period.end) || period.start > period.end) {
    errors.push(`${prefix} must contain an ordered start and end date`);
    return false;
  }
  return true;
}

function sameDimensions(left, right) {
  return JSON.stringify(dimensionsKey(left)) === JSON.stringify(dimensionsKey(right));
}

/** Validate CSV sidecar metadata without requiring its eventual observations. */
export function validateSnapshotMetadata(snapshot, { allowObservations = false } = {}) {
  const errors = [];
  if (!isPlainObject(snapshot)) return ['snapshot metadata must be an object'];
  const allowedKeys = allowObservations ? snapshotKeys : snapshotKeys.filter((key) => key !== 'observations');
  if (!hasOnlyKeys(snapshot, allowedKeys)) errors.push('snapshot metadata contains unsupported properties');
  if (snapshot.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!requiredString(snapshot.snapshotId)) errors.push('snapshotId is required');
  if (!['empty', 'published'].includes(snapshot.status)) errors.push('status must be empty or published');
  if (snapshot.note !== undefined && typeof snapshot.note !== 'string') errors.push('note must be a string when provided');
  if (!isIsoDate(snapshot.refreshedAt)) errors.push('refreshedAt must be a valid YYYY-MM-DD date');
  if (snapshot.asOf !== null && snapshot.asOf !== undefined && !isIsoDate(snapshot.asOf)) errors.push('asOf must be null or a valid YYYY-MM-DD date');
  validateSource(snapshot.source, 'snapshot.source', errors);
  validateApproval(snapshot.approval, 'snapshot.approval', errors, { published: snapshot.status === 'published' });
  if (isIsoDate(snapshot.asOf) && isIsoDate(snapshot.refreshedAt) && compareDate(snapshot.asOf, snapshot.refreshedAt) > 0) errors.push('snapshot.asOf cannot be later than refreshedAt');
  if (isIsoDate(snapshot.source?.retrievedAt) && isIsoDate(snapshot.refreshedAt) && compareDate(snapshot.source.retrievedAt, snapshot.refreshedAt) > 0) errors.push('snapshot.source.retrievedAt cannot be later than refreshedAt');
  if (isIsoDate(snapshot.approval?.approvedAt) && isIsoDate(snapshot.refreshedAt) && compareDate(snapshot.approval.approvedAt, snapshot.refreshedAt) > 0) errors.push('snapshot.approval.approvedAt cannot be later than refreshedAt');
  return errors;
}

/** Validate the complete publication contract shared by the importer and route data. */
export function validateSnapshot(snapshot) {
  const errors = [...metricSchemaErrors, ...validateSnapshotMetadata(snapshot, { allowObservations: true })];
  if (!isPlainObject(snapshot)) return errors;

  if (!Array.isArray(snapshot.observations)) {
    errors.push('observations must be an array');
    return errors;
  }
  const seen = new Set();
  const observations = [];
  snapshot.observations.forEach((observation, index) => {
    const prefix = `observations[${index}]`;
    if (!isPlainObject(observation)) {
      errors.push(`${prefix} must be an object`);
      return;
    }
    observations.push(observation);
    if (!hasOnlyKeys(observation, observationKeys)) errors.push(`${prefix} contains unsupported properties`);
    const definition = metricById.get(observation.metricId);
    if (!definition) errors.push(`${prefix}.metricId is unknown`);
    if (observation.value !== null && (typeof observation.value !== 'number' || !Number.isFinite(observation.value) || observation.value < 0)) errors.push(`${prefix}.value must be a non-negative number or null`);
    if (definition?.valueType === 'integer' && observation.value !== null && (typeof observation.value !== 'number' || !Number.isInteger(observation.value))) errors.push(`${prefix}.value must be an integer for ${definition.id}`);
    if (observation.value === null && !requiredString(observation.unavailableReason)) errors.push(`${prefix}.unavailableReason is required when value is null`);
    if (observation.value !== null && observation.unavailableReason !== undefined) errors.push(`${prefix}.unavailableReason is only allowed when value is null`);
    if (!requiredString(observation.unit)) errors.push(`${prefix}.unit is required`);
    if (definition && observation.unit !== definition.unit) errors.push(`${prefix}.unit must match ${definition.id} (${definition.unit})`);
    const hasPeriod = observation.period !== null && observation.period !== undefined;
    const hasAsOf = observation.asOf !== null && observation.asOf !== undefined;
    if (hasPeriod) validatePeriod(observation.period, `${prefix}.period`, errors);
    if (hasAsOf && !isIsoDate(observation.asOf)) errors.push(`${prefix}.asOf must be null or a valid YYYY-MM-DD date`);
    if (definition?.temporalKind === 'period' && (!hasPeriod || hasAsOf)) errors.push(`${prefix} requires period and asOf must be null for ${definition.id}`);
    if (definition?.temporalKind === 'asOf' && (hasPeriod || !hasAsOf)) errors.push(`${prefix} requires asOf and period must be null for ${definition.id}`);
    if (!definition && !hasPeriod && !hasAsOf) errors.push(`${prefix} requires period or asOf`);
    if (!isPlainObject(observation.dimensions)) {
      errors.push(`${prefix}.dimensions must be an object`);
    } else if (definition) {
      const actualKeys = Object.keys(observation.dimensions).sort();
      const expectedKeys = [...definition.requiredDimensions].sort();
      if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) errors.push(`${prefix}.dimensions must contain exactly: ${expectedKeys.join(', ')}`);
      for (const [key, value] of Object.entries(observation.dimensions)) {
        if (!definition.requiredDimensions.includes(key)) errors.push(`${prefix}.dimensions contains unsupported key ${key}`);
        if (!requiredString(value)) errors.push(`${prefix}.dimensions.${key} must be a non-empty string`);
      }
    }
    validateSource(observation.source, `${prefix}.source`, errors);
    validateApproval(observation.approval, `${prefix}.approval`, errors, { observation: true });
    if (!requiredString(observation.reviewOwner)) errors.push(`${prefix}.reviewOwner is required`);
    if (!isIsoDate(observation.nextReviewDate)) errors.push(`${prefix}.nextReviewDate must be a valid YYYY-MM-DD date`);
    if (isIsoDate(observation.nextReviewDate) && isIsoDate(snapshot.refreshedAt) && compareDate(observation.nextReviewDate, snapshot.refreshedAt) < 0) errors.push(`${prefix}.nextReviewDate cannot be earlier than snapshot.refreshedAt`);
    const key = observationKey(observation);
    if (seen.has(key)) errors.push(`${prefix} duplicates another observation for the same metric, temporal key, and dimensions`);
    seen.add(key);
    if (isIsoDate(observation.source?.retrievedAt) && isIsoDate(snapshot.refreshedAt) && compareDate(observation.source.retrievedAt, snapshot.refreshedAt) > 0) errors.push(`${prefix}.source.retrievedAt cannot be later than snapshot.refreshedAt`);
    if (isIsoDate(observation.approval?.approvedAt) && isIsoDate(snapshot.refreshedAt) && compareDate(observation.approval.approvedAt, snapshot.refreshedAt) > 0) errors.push(`${prefix}.approval.approvedAt cannot be later than snapshot.refreshedAt`);
    if (isIsoDate(observation.period?.end) && isIsoDate(snapshot.refreshedAt) && compareDate(observation.period.end, snapshot.refreshedAt) > 0) errors.push(`${prefix}.period.end cannot be later than snapshot.refreshedAt`);
    if (isIsoDate(observation.asOf) && isIsoDate(snapshot.refreshedAt) && compareDate(observation.asOf, snapshot.refreshedAt) > 0) errors.push(`${prefix}.asOf cannot be later than snapshot.refreshedAt`);
  });

  // A period metric's grain is an exclusive partition: identical dimensions
  // cannot have overlapping reporting windows, even when their dates differ.
  for (let leftIndex = 0; leftIndex < observations.length; leftIndex += 1) {
    const left = observations[leftIndex];
    const definition = metricById.get(left.metricId);
    if (definition?.temporalKind !== 'period' || !isPlainObject(left.period) || !isPlainObject(left.dimensions)) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < observations.length; rightIndex += 1) {
      const right = observations[rightIndex];
      if (right.metricId !== left.metricId || !isPlainObject(right.period) || !sameDimensions(left.dimensions, right.dimensions)) continue;
      if (left.period.start <= right.period.end && right.period.start <= left.period.end) errors.push(`observations[${rightIndex}] overlaps observations[${leftIndex}] at the ${definition.grain} grain`);
    }
  }

  if (snapshot.status === 'empty' && snapshot.observations.length > 0) errors.push('empty snapshots cannot contain observations');
  if (snapshot.status === 'published' && snapshot.observations.length === 0) errors.push('published snapshots require at least one observation');
  return errors;
}

export function assertValidSnapshot(snapshot) {
  const errors = validateSnapshot(snapshot);
  if (errors.length > 0) throw new Error(`Invalid Record BI snapshot: ${errors.join('; ')}`);
  return snapshot;
}

export function validateCsvHeaders(headers, { required = csvRequiredHeaders, optional = csvOptionalHeaders } = {}) {
  const normalized = headers.map((header) => String(header).trim());
  const errors = [];
  if (normalized.some((header) => !header)) errors.push('CSV headers must not be empty');
  if (new Set(normalized).size !== normalized.length) errors.push('CSV headers must be unique');
  const allowed = new Set([...required, ...optional]);
  const unknown = normalized.filter((header) => !allowed.has(header));
  if (unknown.length > 0) errors.push(`CSV contains unsupported headers: ${unknown.join(', ')}`);
  const missing = required.filter((header) => !normalized.includes(header));
  if (missing.length > 0) errors.push(`CSV is missing required headers: ${missing.join(', ')}`);
  return errors;
}

/** Parse RFC 4180-style CSV while rejecting malformed quoting and schema drift. */
export function parseCsv(text) {
  const input = String(text).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  let quoteClosed = false;
  const pushRow = () => {
    row.push(cell);
    if (row.some((value) => value.trim() !== '')) rows.push(row);
    row = [];
    cell = '';
    quoteClosed = false;
  };
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '\0') throw new Error('CSV contains a NUL character');
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        quoteClosed = true;
      } else {
        cell += character;
      }
    } else if (quoteClosed) {
      if (character === ',') {
        row.push(cell);
        cell = '';
        quoteClosed = false;
      } else if (character === '\n') {
        pushRow();
      } else if (character === '\r') {
        if (input[index + 1] === '\n') index += 1;
        pushRow();
      } else if (!/[ \t]/.test(character)) {
        throw new Error('CSV contains characters after a closing quote');
      }
    } else if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n') {
      pushRow();
    } else if (character === '\r') {
      if (input[index + 1] === '\n') index += 1;
      pushRow();
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field');
  if (cell.length > 0 || row.length > 0 || quoteClosed) pushRow();
  if (rows.length === 0) throw new Error('CSV must contain a header row');
  const headers = rows[0].map((header) => header.trim());
  const headerErrors = validateCsvHeaders(headers, { required: [], optional: headers });
  if (headerErrors.length > 0) throw new Error(headerErrors.join('; '));
  return rows.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) throw new Error(`CSV row ${rowIndex + 2} has ${values.length} fields; expected ${headers.length}`);
    return Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex]]));
  });
}

export function sortSnapshot(snapshot) {
  const observations = snapshot.observations.map((observation) => ({ ...observation, dimensions: Object.fromEntries(dimensionsKey(observation.dimensions)) })).sort((left, right) => observationKey(left).localeCompare(observationKey(right)));
  return { schemaVersion: 1, snapshotId: snapshot.snapshotId, status: snapshot.status, asOf: snapshot.asOf ?? null, refreshedAt: snapshot.refreshedAt, source: snapshot.source, approval: snapshot.approval, observations, ...(snapshot.note ? { note: snapshot.note } : {}) };
}

export async function readJsonFile(filePath) {
  return JSON.parse(await readFile(resolve(filePath), 'utf8'));
}
