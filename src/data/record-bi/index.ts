import metricSchema from './schema.json';
import currentSnapshot from './current.json';

export type RecordBiDomain =
  | 'funding'
  | 'research-projects'
  | 'research-outputs'
  | 'institutional-partnerships';

export type RecordBiValueType = 'currency' | 'integer';
export type RecordBiAggregation = 'sum' | 'count';
export type RecordBiSnapshotStatus = 'empty' | 'published';
export type RecordBiApprovalStatus = 'pending' | 'approved';
export type RecordBiMetricState = 'not-reported' | 'reported' | 'stale';
export type RecordBiTemporalKind = 'period' | 'asOf';

export interface RecordBiMetricDefinition {
  readonly id: string;
  readonly domain: RecordBiDomain;
  readonly label: string;
  readonly description: string;
  readonly valueType: RecordBiValueType;
  readonly unit: string;
  readonly aggregation: RecordBiAggregation;
  readonly dimensions: readonly string[];
  readonly grain: string;
  readonly temporalKind: RecordBiTemporalKind;
  readonly population: string;
  readonly exclusions: string;
}

export interface RecordBiSource {
  readonly id: string;
  readonly label: string;
  readonly locator: string;
  readonly retrievedAt: string;
}

export interface RecordBiApproval {
  readonly status: RecordBiApprovalStatus;
  readonly reference: string;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
}

export interface RecordBiPeriod {
  readonly start: string;
  readonly end: string;
}

export interface RecordBiObservation {
  readonly metricId: string;
  readonly value: number | null;
  readonly unavailableReason?: string;
  readonly unit: string;
  readonly period: RecordBiPeriod | null;
  readonly asOf: string | null;
  readonly dimensions: Readonly<Record<string, string>>;
  readonly source: RecordBiSource;
  readonly approval: Required<RecordBiApproval>;
  readonly reviewOwner: string;
  readonly nextReviewDate: string;
}

export interface RecordBiSnapshot {
  readonly schemaVersion: 1;
  readonly snapshotId: string;
  readonly status: RecordBiSnapshotStatus;
  readonly asOf: string | null;
  readonly refreshedAt: string;
  readonly source: RecordBiSource;
  readonly approval: RecordBiApproval;
  readonly observations: readonly RecordBiObservation[];
  readonly note?: string;
}

const definitions = metricSchema.metrics as readonly RecordBiMetricDefinition[];
const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
const snapshot = currentSnapshot as RecordBiSnapshot;

const hasOnlyKeys = (value: object, keys: readonly string[]): boolean => Object.keys(value).every((key) => keys.includes(key));

const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

const observationKey = (observation: RecordBiObservation): string => JSON.stringify({
  metricId: observation.metricId,
  period: observation.period,
  asOf: observation.asOf,
  dimensions: Object.entries(observation.dimensions).sort(([left], [right]) => left.localeCompare(right)),
});

/**
 * Validate a snapshot at the publication boundary. An empty snapshot may
 * remain pending; observations themselves must always carry approved source
 * and review metadata.
 */
export function validateRecordBiSnapshot(value: unknown): readonly string[] {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') return ['snapshot must be an object'];

  const candidate = value as Partial<RecordBiSnapshot>;
  if (!hasOnlyKeys(candidate, ['schemaVersion', 'snapshotId', 'status', 'asOf', 'refreshedAt', 'source', 'approval', 'observations', 'note'])) errors.push('snapshot contains unsupported properties');
  if (candidate.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (typeof candidate.snapshotId !== 'string' || !candidate.snapshotId.trim()) errors.push('snapshotId is required');
  if (candidate.status !== 'empty' && candidate.status !== 'published') errors.push('status must be empty or published');
  if (candidate.note !== undefined && typeof candidate.note !== 'string') errors.push('note must be a string when provided');
  if (!isIsoDate(candidate.refreshedAt)) errors.push('refreshedAt must be a valid YYYY-MM-DD date');
    if (candidate.asOf !== null && candidate.asOf !== undefined && !isIsoDate(candidate.asOf)) errors.push('asOf must be null or a valid YYYY-MM-DD date');
  if (isIsoDate(candidate.asOf) && isIsoDate(candidate.refreshedAt) && candidate.asOf > candidate.refreshedAt) errors.push('asOf cannot be later than refreshedAt');

  const source = candidate.source;
  if (!source || typeof source !== 'object') {
    errors.push('snapshot source metadata is required');
  } else {
    if (!hasOnlyKeys(source, ['id', 'label', 'locator', 'retrievedAt'])) errors.push('snapshot source contains unsupported properties');
    if (typeof source.id !== 'string' || !source.id.trim()) errors.push('snapshot source.id is required');
    if (typeof source.label !== 'string' || !source.label.trim()) errors.push('snapshot source.label is required');
    if (typeof source.locator !== 'string' || !source.locator.trim()) errors.push('snapshot source.locator is required');
    if (!isIsoDate(source.retrievedAt)) errors.push('snapshot source.retrievedAt must be a valid YYYY-MM-DD date');
    if (isIsoDate(source.retrievedAt) && isIsoDate(candidate.refreshedAt) && source.retrievedAt > candidate.refreshedAt) errors.push('snapshot source.retrievedAt cannot be later than refreshedAt');
  }

  const approval = candidate.approval;
  if (!approval || typeof approval !== 'object') {
    errors.push('snapshot approval metadata is required');
  } else {
    if (!hasOnlyKeys(approval, ['status', 'reference', 'approvedBy', 'approvedAt'])) errors.push('snapshot approval contains unsupported properties');
    if (approval.status !== 'pending' && approval.status !== 'approved') errors.push('snapshot approval.status must be pending or approved');
    if (typeof approval.reference !== 'string' || !approval.reference.trim()) errors.push('snapshot approval.reference is required');
    if (approval.approvedBy !== null && approval.approvedBy !== undefined && typeof approval.approvedBy !== 'string') errors.push('snapshot approval.approvedBy must be null or a string');
    if (approval.approvedAt !== null && approval.approvedAt !== undefined && !isIsoDate(approval.approvedAt)) errors.push('snapshot approval.approvedAt must be null or a valid YYYY-MM-DD date');
    if (isIsoDate(approval.approvedAt) && isIsoDate(candidate.refreshedAt) && approval.approvedAt > candidate.refreshedAt) errors.push('snapshot approval.approvedAt cannot be later than refreshedAt');
    if (candidate.status === 'published' && (approval.status !== 'approved' || !approval.approvedBy || !approval.approvedAt)) errors.push('published snapshots require approved approval metadata');
  }

  if (!Array.isArray(candidate.observations)) {
    errors.push('observations must be an array');
    return errors;
  }

  const seen = new Set<string>();
  candidate.observations.forEach((entry, index) => {
    const prefix = `observations[${index}]`;
    if (!entry || typeof entry !== 'object') {
      errors.push(`${prefix} must be an object`);
      return;
    }
    const observation = entry as Partial<RecordBiObservation>;
    if (!hasOnlyKeys(observation, ['metricId', 'value', 'unavailableReason', 'unit', 'period', 'asOf', 'dimensions', 'source', 'approval', 'reviewOwner', 'nextReviewDate'])) errors.push(`${prefix} contains unsupported properties`);
    const definition = typeof observation.metricId === 'string' ? definitionById.get(observation.metricId) : undefined;
    if (!definition) errors.push(`${prefix}.metricId is unknown`);
    if (observation.value !== null && (typeof observation.value !== 'number' || !Number.isFinite(observation.value) || observation.value < 0)) errors.push(`${prefix}.value must be a non-negative number or null`);
    if (definition?.valueType === 'integer' && observation.value !== null && (typeof observation.value !== 'number' || !Number.isInteger(observation.value))) errors.push(`${prefix}.value must be an integer for ${definition.id}`);
    if (observation.value === null && (typeof observation.unavailableReason !== 'string' || !observation.unavailableReason.trim())) errors.push(`${prefix}.unavailableReason is required when value is null`);
    if (observation.value !== null && observation.unavailableReason !== undefined) errors.push(`${prefix}.unavailableReason is only allowed when value is null`);
    if (definition && observation.unit !== definition.unit) errors.push(`${prefix}.unit must match ${definition.id} (${definition.unit})`);
    if (typeof observation.unit !== 'string' || !observation.unit.trim()) errors.push(`${prefix}.unit is required`);
    if (observation.period !== null && observation.period !== undefined) {
      if (!observation.period || !hasOnlyKeys(observation.period, ['start', 'end']) || !isIsoDate(observation.period.start) || !isIsoDate(observation.period.end) || observation.period.start > observation.period.end) errors.push(`${prefix}.period must contain an ordered start and end date`);
    }
    if (observation.asOf !== null && observation.asOf !== undefined && !isIsoDate(observation.asOf)) errors.push(`${prefix}.asOf must be null or a valid YYYY-MM-DD date`);
    const hasPeriod = observation.period !== null && observation.period !== undefined;
    const hasAsOf = observation.asOf !== null && observation.asOf !== undefined;
    if (definition?.temporalKind === 'period' && (!hasPeriod || hasAsOf)) errors.push(`${prefix} requires period and asOf must be null for ${definition.id}`);
    if (definition?.temporalKind === 'asOf' && (hasPeriod || !hasAsOf)) errors.push(`${prefix} requires asOf and period must be null for ${definition.id}`);
    if (!definition && !hasPeriod && !hasAsOf) errors.push(`${prefix} requires period or asOf`);
    if (!observation.dimensions || typeof observation.dimensions !== 'object' || Array.isArray(observation.dimensions)) {
      errors.push(`${prefix}.dimensions must be an object`);
    } else if (definition) {
      const dimensionKeys = Object.keys(observation.dimensions);
      const expectedKeys = [...definition.dimensions].sort();
      if (JSON.stringify(dimensionKeys.sort()) !== JSON.stringify(expectedKeys)) errors.push(`${prefix}.dimensions must contain exactly: ${expectedKeys.join(', ')}`);
      if (dimensionKeys.some((key) => !definition.dimensions.includes(key))) errors.push(`${prefix}.dimensions contains an unsupported key`);
      if (dimensionKeys.some((key) => typeof observation.dimensions?.[key] !== 'string' || !observation.dimensions[key].trim())) errors.push(`${prefix}.dimensions values must be non-empty strings`);
    }
    const observationSource = observation.source;
    if (!observationSource || typeof observationSource !== 'object' || !hasOnlyKeys(observationSource, ['id', 'label', 'locator', 'retrievedAt']) || typeof observationSource.id !== 'string' || typeof observationSource.label !== 'string' || typeof observationSource.locator !== 'string' || !isIsoDate(observationSource.retrievedAt)) errors.push(`${prefix}.source requires id, label, locator, retrievedAt, and no unsupported properties`);
    const observationApproval = observation.approval;
    if (!observationApproval || typeof observationApproval !== 'object' || !hasOnlyKeys(observationApproval, ['status', 'reference', 'approvedBy', 'approvedAt']) || observationApproval.status !== 'approved' || typeof observationApproval.reference !== 'string' || !observationApproval.reference.trim() || typeof observationApproval.approvedBy !== 'string' || !observationApproval.approvedBy.trim() || !isIsoDate(observationApproval.approvedAt)) errors.push(`${prefix}.approval requires approved status, reference, approver, approvedAt, and no unsupported properties`);
    if (typeof observation.reviewOwner !== 'string' || !observation.reviewOwner.trim()) errors.push(`${prefix}.reviewOwner is required`);
    if (!isIsoDate(observation.nextReviewDate)) errors.push(`${prefix}.nextReviewDate must be a valid YYYY-MM-DD date`);
    if (isIsoDate(observation.nextReviewDate) && isIsoDate(candidate.refreshedAt) && observation.nextReviewDate < candidate.refreshedAt) errors.push(`${prefix}.nextReviewDate cannot be earlier than snapshot.refreshedAt`);

    if (observation.dimensions && typeof observation.dimensions === 'object' && !Array.isArray(observation.dimensions)) {
      const key = observationKey(observation as RecordBiObservation);
      if (seen.has(key)) errors.push(`${prefix} duplicates another observation for the same metric, period, and dimensions`);
      seen.add(key);
    }
    if (isIsoDate(observation.source?.retrievedAt) && isIsoDate(candidate.refreshedAt) && observation.source.retrievedAt > candidate.refreshedAt) errors.push(`${prefix}.source.retrievedAt cannot be later than snapshot.refreshedAt`);
    if (isIsoDate(observation.approval?.approvedAt) && isIsoDate(candidate.refreshedAt) && observation.approval.approvedAt > candidate.refreshedAt) errors.push(`${prefix}.approval.approvedAt cannot be later than snapshot.refreshedAt`);
    if (isIsoDate(observation.period?.end) && isIsoDate(candidate.refreshedAt) && observation.period.end > candidate.refreshedAt) errors.push(`${prefix}.period.end cannot be later than snapshot.refreshedAt`);
    if (isIsoDate(observation.asOf) && isIsoDate(candidate.refreshedAt) && observation.asOf > candidate.refreshedAt) errors.push(`${prefix}.asOf cannot be later than snapshot.refreshedAt`);
  });

  for (let leftIndex = 0; leftIndex < candidate.observations.length; leftIndex += 1) {
    const left = candidate.observations[leftIndex];
    if (!left || typeof left !== 'object') continue;
    const definition = definitionById.get(left.metricId);
    if (definition?.temporalKind !== 'period' || !left.period || typeof left.period !== 'object' || !left.dimensions || typeof left.dimensions !== 'object') continue;
    for (let rightIndex = leftIndex + 1; rightIndex < candidate.observations.length; rightIndex += 1) {
      const right = candidate.observations[rightIndex];
      if (!right || typeof right !== 'object') continue;
      if (right.metricId !== left.metricId || !right.period || typeof right.period !== 'object' || JSON.stringify(Object.entries(left.dimensions).sort()) !== JSON.stringify(Object.entries(right.dimensions).sort())) continue;
      if (left.period.start <= right.period.end && right.period.start <= left.period.end) errors.push(`observations[${rightIndex}] overlaps observations[${leftIndex}] at the ${definition.grain} grain`);
    }
  }

  if (candidate.status === 'empty' && candidate.observations.length > 0) errors.push('empty snapshots cannot contain observations');
  if (candidate.status === 'published' && candidate.observations.length === 0) errors.push('published snapshots require at least one observation');
  return errors;
}

const validationErrors = validateRecordBiSnapshot(snapshot);
if (validationErrors.length > 0) throw new Error(`Invalid Record BI snapshot: ${validationErrors.join('; ')}`);

export const recordBiMetricDefinitions = definitions;
export const recordBiSnapshot = snapshot;
export const recordBiObservations = snapshot.observations;

export function recordBiMetricDefinition(metricId: string): RecordBiMetricDefinition | undefined {
  return definitionById.get(metricId);
}

export function recordBiIsStale(observation: RecordBiObservation, today = new Date().toISOString().slice(0, 10)): boolean {
  return observation.nextReviewDate < today;
}

/**
 * Public copy for the snapshot approval enum.
 *
 * `current.json` stores the machine value (`pending` / `approved`). Rendering
 * that value directly puts the raw enum in a public sentence — /record/federal/
 * printed "Snapshot approval: pending" — which is an operator's word, not a
 * reader's. The labels neither overstate nor understate the state: a pending
 * snapshot is not approved, and it is not "Not reported" either, because the
 * approval itself is what is outstanding.
 *
 * This is presentation only. The underlying data, the enum values, and the
 * CSV export (which carries the raw value for the operator holding the file)
 * are unchanged.
 */
export const recordBiApprovalLabels: Readonly<Record<RecordBiApprovalStatus, string>> = {
  pending: 'Pending approval',
  approved: 'Approved',
};

export function recordBiApprovalLabel(status: RecordBiApprovalStatus): string {
  return recordBiApprovalLabels[status];
}

export function recordBiStatusForMetric(metricId: string, today = new Date().toISOString().slice(0, 10)): RecordBiMetricState {
  const observations = recordBiObservations.filter((observation) => observation.metricId === metricId);
  if (observations.length === 0) return 'not-reported';
  const reported = observations.filter((observation) => observation.value !== null);
  if (reported.length === 0) return 'not-reported';
  return reported.every((observation) => recordBiIsStale(observation, today)) ? 'stale' : 'reported';
}

export const recordBi = {
  schemaVersion: 1 as const,
  snapshot: recordBiSnapshot,
  metrics: recordBiMetricDefinitions,
  observations: recordBiObservations,
} as const;
