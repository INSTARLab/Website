import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const contractPath = join(repoRoot, 'plan', 'record-parity-contract.md');
const recordDataPath = join(repoRoot, 'src', 'data', 'record.ts');
const recordPagesDir = join(repoRoot, 'src', 'pages', 'record');
const distDir = join(repoRoot, 'dist');

const read = (path) => readFileSync(path, 'utf8');

function ledgerRows(contract) {
  const pattern = /^\| (\d+) \| `([^`]+)` \| `([^`]+)` \| (\w+) \| (yes|no) \| (yes|no) \|/gm;
  return [...contract.matchAll(pattern)].map((match) => ({
    index: Number(match[1]),
    routeId: match[2],
    file: match[3],
    kind: match[4],
    inSitemap: match[5] === 'yes',
    inGraph: match[6] === 'yes',
  }));
}

function recordTsRoutes(recordTs) {
  return [...recordTs.matchAll(/route\('(\/record\/[^']*)'/g)].map((match) => match[1]);
}

function recordTsGeneratedFiles(recordTs) {
  const block = recordTs.match(/generatedFiles:\s*\[([\s\S]*?)\]/);
  if (!block) return [];
  return [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function sectionValue(contract, label) {
  const pattern = new RegExp(`\\| ${label} \\| (\\d+) \\|`);
  const match = contract.match(pattern);
  return match ? Number(match[1]) : null;
}

test('the parity contract pins the reference and records the dated hashes', () => {
  const contract = read(contractPath);
  assert.ok(
    contract.includes('926cb86e62266ad756bf2df329e88571e5961fc8'),
    'contract pins the Ravonics source commit',
  );
  for (const hash of [
    '63e8d3cf4bebcf73dd5989d4d3b23c7d76d55e3bb8b7efcb0129e28f71aacbaf',
    '4d2208dd7b7023e20c6ecb5bcc87da286054764bdb33f47bb8445923db59c04c',
    '319b9d3ba756e5b91559cd396eba05be648baa2eb1eb9c75fc4a16e15f83970b',
    'd06a3a72c8e94c2671b769fae29b4764681176d3b6f584c43966a260823ad3a6',
    '862db14332a52afdf456fe9c9775e8ec2afc34fbc38ec3f7ef90ac27599c0caf',
  ]) {
    assert.ok(contract.includes(hash), `contract records dated-dist hash ${hash.slice(0, 12)}…`);
  }
  for (const heading of [
    'Parity matrix',
    'Component reuse',
    'Route identity contract',
    'Derived-count reconciliation',
    'Canonical HTML route ledger',
    'Planning-file reconciliation',
  ]) {
    assert.ok(contract.includes(heading), `contract covers ${heading}`);
  }
});

test('ledger record rows match the route source, not a hardcoded list', () => {
  const contract = read(contractPath);
  const recordTs = read(recordDataPath);
  const rows = ledgerRows(contract);
  assert.ok(rows.length > 0, 'contract carries a machine-readable ledger table');

  const routes = recordTsRoutes(recordTs);
  const recordRows = rows.filter((row) => row.kind === 'record').map((row) => row.routeId);
  assert.deepEqual(
    [...recordRows].sort(),
    [...new Set(routes)].sort(),
    'every ledger record row is a recordRoutes entry and vice versa',
  );

  const declared = sectionValue(contract, 'Record HTML routes');
  assert.equal(declared, routes.length, 'declared Record-route count is derived from recordRoutes');
});

test('ledger route IDs are stable join keys', () => {
  const contract = read(contractPath);
  const rows = ledgerRows(contract);
  const ids = rows.map((row) => row.routeId);
  assert.equal(new Set(ids).size, ids.length, 'route IDs are unique across the ledger');
  for (const row of rows) {
    const okShape = row.routeId === '/404.html' || /^\/([a-z0-9-]+\/)*$/.test(row.routeId);
    assert.ok(okShape, `route ID has the canonical shape: ${row.routeId}`);
  }
  const kinds = new Set(rows.map((row) => row.kind));
  for (const kind of kinds) {
    assert.ok(['page', 'record', 'error', 'utility', 'alias'].includes(kind), `known ledger class: ${kind}`);
  }
  const errorRows = rows.filter((row) => row.kind === 'error');
  assert.ok(errorRows.length >= 1, 'the error document is an explicit ledger row, not an exclusion');
});

test('JSON endpoint files agree with the generated-files contract', () => {
  const recordTs = read(recordDataPath);
  const generated = recordTsGeneratedFiles(recordTs).sort();
  assert.ok(generated.length > 0, 'recordMeta.generatedFiles declares the endpoints');
  const endpointFiles = readdirSync(recordPagesDir)
    .filter((name) => name.endsWith('.json.ts'))
    .map((name) => `/record/${name.slice(0, -'.ts'.length)}`)
    .sort();
  assert.deepEqual(endpointFiles, generated, 'endpoint source files match generatedFiles');
  const declared = sectionValue(contractPath ? read(contractPath) : '', 'Record JSON endpoints');
  assert.equal(declared, generated.length, 'declared endpoint count is derived from generatedFiles');
});

test('ledger totals agree with the built artifact when dist is present', (t) => {
  const graphPath = join(distDir, 'record', 'graph.json');
  if (!existsSync(graphPath)) {
    t.skip('dist/ not built in this environment; dist-derived counts checked after build');
    return;
  }
  const contract = read(contractPath);
  const rows = ledgerRows(contract);
  const graph = JSON.parse(read(graphPath));
  const declaredNodes = sectionValue(contract, 'Inventory nodes');
  const declaredEdges = sectionValue(contract, 'Journey edges');
  assert.equal(declaredNodes, graph.nodes.length, 'declared node count matches dist graph');
  assert.equal(declaredEdges, graph.edges.length, 'declared edge count matches dist graph');
  const inGraph = rows.filter((row) => row.inGraph).length;
  assert.equal(inGraph, graph.nodes.length, 'ledger graph membership matches the built graph');
});
