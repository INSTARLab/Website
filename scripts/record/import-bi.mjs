#!/usr/bin/env node

import { link, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  assertValidSnapshot,
  csvRequiredHeaders,
  csvOptionalHeaders,
  isIsoDate,
  parseCsv,
  sortSnapshot,
  validateCsvHeaders,
  validateSnapshotMetadata,
} from './bi-schema.mjs';

const usage = `Usage: node scripts/record/import-bi.mjs --input FILE [options]

Import an approved Record Room BI snapshot. JSON inputs are complete snapshots;
CSV inputs require --metadata with snapshot/source/approval metadata.

Options:
  --input FILE       CSV or JSON input (required)
  --metadata FILE    JSON metadata sidecar for CSV input (required for CSV)
  --current FILE     Current published snapshot (default: src/data/record-bi/current.json)
  --history-dir DIR  Dated snapshot directory (default: src/data/record-bi/snapshots)
  --replace          Replace an existing dated snapshot with the same identity
  --dry-run          Validate and print the normalized snapshot without writing
  --help             Show this help
`;

function parseArgs(argv) {
  const options = { replace: false, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') options.help = true;
    else if (argument === '--replace') options.replace = true;
    else if (argument === '--dry-run') options.dryRun = true;
    else if (argument.startsWith('--')) {
      const key = argument.slice(2);
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
      options[key] = value;
      index += 1;
    } else throw new Error(`Unexpected argument: ${argument}`);
  }
  return options;
}

function parseNumber(value, field, rowNumber) {
  const trimmed = value?.trim() ?? '';
  if (trimmed === '') return null;
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(trimmed)) throw new Error(`CSV row ${rowNumber}: ${field} must be a canonical decimal number or blank`);
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) throw new Error(`CSV row ${rowNumber}: ${field} must be a finite number or blank`);
  return parsed;
}

function parseDimensions(value, rowNumber) {
  if (value === undefined || value.trim() === '') return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('must be an object');
    return parsed;
  } catch (error) {
    throw new Error(`CSV row ${rowNumber}: dimensions must be a JSON object (${error.message})`);
  }
}

const csvSourceColumns = ['sourceId', 'sourceLabel', 'sourceLocator', 'sourceRetrievedAt'];
const csvApprovalColumns = ['approvalStatus', 'approvalBasis', 'approvalReference', 'approvedBy', 'approvedAt'];

/**
 * A row either inherits the sidecar source/approval metadata in full or
 * replaces it in full. A partial override would publish a provenance record
 * stitched together from two different sources that no data owner approved.
 */
function requireCompleteOverride(row, columns, group, rowNumber) {
  const missing = columns.filter((column) => !row[column]?.trim());
  if (missing.length === 0 || missing.length === columns.length) return;
  throw new Error(`CSV row ${rowNumber}: ${group} override must supply every column (${columns.join(', ')}); missing ${missing.join(', ')}`);
}

function observationFromCsv(row, rowNumber, metadata) {
  requireCompleteOverride(row, csvSourceColumns, 'source', rowNumber);
  requireCompleteOverride(row, csvApprovalColumns, 'approval', rowNumber);
  const periodStart = row.periodStart?.trim() || null;
  const periodEnd = row.periodEnd?.trim() || null;
  const period = periodStart === null && periodEnd === null ? null : { start: periodStart, end: periodEnd };
  const asOf = row.asOf?.trim() || null;
  return {
    metricId: row.metricId?.trim(),
    value: parseNumber(row.value, 'value', rowNumber),
    ...(row.unavailableReason?.trim() ? { unavailableReason: row.unavailableReason.trim() } : {}),
    unit: row.unit?.trim(),
    period,
    asOf,
    dimensions: parseDimensions(row.dimensions, rowNumber),
    source: {
      id: row.sourceId?.trim() || metadata.source.id,
      label: row.sourceLabel?.trim() || metadata.source.label,
      locator: row.sourceLocator?.trim() || metadata.source.locator,
      retrievedAt: row.sourceRetrievedAt?.trim() || metadata.source.retrievedAt,
    },
    approval: {
      status: row.approvalStatus?.trim() || metadata.approval.status,
      // A row that overrides the approval group must name who put their
      // authority behind the number, not only that someone did.
      basis: row.approvalBasis?.trim() || metadata.approval.basis,
      reference: row.approvalReference?.trim() || metadata.approval.reference,
      approvedBy: row.approvedBy?.trim() || metadata.approval.approvedBy,
      approvedAt: row.approvedAt?.trim() || metadata.approval.approvedAt,
    },
    reviewOwner: row.reviewOwner?.trim(),
    nextReviewDate: row.nextReviewDate?.trim(),
  };
}

function snapshotFromCsv(text, metadata) {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error('CSV must contain at least one observation row');
  const headerErrors = validateCsvHeaders(Object.keys(rows[0]), { required: csvRequiredHeaders, optional: csvOptionalHeaders });
  if (headerErrors.length > 0) throw new Error(headerErrors.join('; '));
  const observations = rows.map((row, index) => observationFromCsv(row, index + 2, metadata));
  return { ...metadata, observations };
}

function requireSafeSnapshotId(snapshotId) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(snapshotId)) throw new Error('snapshotId may contain only letters, numbers, dots, underscores, and hyphens');
}

function serialized(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeJsonAtomic(filePath, value) {
  const target = resolve(filePath);
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await writeFile(temporary, serialized(value), { encoding: 'utf8', flag: 'wx' });
    await rename(temporary, target);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

/**
 * History is immutable. A same-content retry is safe and idempotent; a
 * different snapshot with the same identity must use --replace explicitly.
 * The link step prevents two concurrent imports from overwriting each other.
 */
async function writeImmutableHistory(filePath, value, replace) {
  const target = resolve(filePath);
  await mkdir(dirname(target), { recursive: true });
  const payload = serialized(value);
  if (replace) {
    await writeJsonAtomic(target, value);
    return 'replaced';
  }
  const temporary = `${target}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await writeFile(temporary, payload, { encoding: 'utf8', flag: 'wx' });
    try {
      await link(temporary, target);
      return 'created';
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const existing = await readFile(target, 'utf8');
      if (existing !== payload) throw new Error(`history snapshot already exists with different contents: ${target}`);
      return 'unchanged';
    }
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

function readCsvMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('CSV metadata must be an object');
  if (Object.hasOwn(value, 'observations')) throw new Error('CSV metadata must not contain observations; observations come from the CSV rows');
  const errors = validateSnapshotMetadata(value);
  if (errors.length > 0) throw new Error(`Invalid CSV metadata: ${errors.join('; ')}`);
  return value;
}

export async function importSnapshot({ inputPath, metadataPath, currentPath = 'src/data/record-bi/current.json', historyDir = 'src/data/record-bi/snapshots', replace = false, dryRun = false }) {
  const input = await readFile(resolve(inputPath), 'utf8');
  const format = extname(inputPath).toLowerCase();
  let snapshot;
  if (format === '.csv') {
    if (!metadataPath) throw new Error('CSV input requires --metadata JSON sidecar');
    const metadata = readCsvMetadata(JSON.parse(await readFile(resolve(metadataPath), 'utf8')));
    snapshot = snapshotFromCsv(input, metadata);
  } else if (format === '.json') {
    snapshot = JSON.parse(input);
  } else {
    throw new Error(`unsupported input extension ${format || '(none)'}; use .csv or .json`);
  }

  assertValidSnapshot(snapshot);
  const normalized = sortSnapshot(snapshot);
  assertValidSnapshot(normalized);
  requireSafeSnapshotId(normalized.snapshotId);
  if (!isIsoDate(normalized.refreshedAt)) throw new Error('snapshot refreshedAt must be a valid date');
  if (dryRun) return normalized;

  const historyPath = resolve(historyDir, `${normalized.refreshedAt}-${normalized.snapshotId}.json`);
  await writeImmutableHistory(historyPath, normalized, replace);
  // History is complete before current is replaced. Atomic current writes keep
  // the prior publication intact if a filesystem error occurs.
  await writeJsonAtomic(currentPath, normalized);
  return normalized;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(usage);
    return 0;
  }
  if (!options.input) throw new Error('--input is required');
  const snapshot = await importSnapshot({ inputPath: options.input, metadataPath: options.metadata, currentPath: options.current, historyDir: options['history-dir'], replace: options.replace, dryRun: options.dryRun });
  if (options.dryRun) process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
  else process.stdout.write(`Imported ${snapshot.snapshotId} (${snapshot.observations.length} observations)\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`Record BI import failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
