import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dataPath = join(repoRoot, 'src', 'data', 'record-captures.json');
const recordTsPath = join(repoRoot, 'src', 'data', 'record.ts');
const distDir = join(repoRoot, 'dist');

const read = (path) => readFileSync(path, 'utf8');
const generation = JSON.parse(read(dataPath));
const isPending = generation.generationId === 'pending-no-captures';
const entries = generation.routes ?? [];

function artifactFiles(entry) {
  return Object.values(entry.artifacts ?? {}).flatMap((artifact) => [
    ...(artifact.segments ?? []).map((segment) => segment.image),
    artifact.thumb,
  ]);
}

test('the committed capture generation carries the frozen-manifest contract fields', () => {
  assert.equal(generation.schemaVersion, 1, 'capture generation schema version');
  assert.ok(typeof generation.generationId === 'string' && generation.generationId.length > 0, 'generation has an identity');
  assert.ok('supersedes' in generation, 'generation names the generation it supersedes (null for the first)');
  assert.ok(generation.captureTool?.name === 'scripts/quality/capture-record-visuals.mjs', 'generation names its capture tool');
  assert.ok(Array.isArray(generation.captureTool?.viewports) && generation.captureTool.viewports.length > 0, 'generation records its viewports');
  assert.ok(generation.sourceBuild?.inputManifestHash, 'generation records its frozen input manifest hash');
  for (const key of ['required', 'success', 'failed', 'complete']) {
    assert.ok(key in (generation.coverage ?? {}), `coverage rolls up ${key}`);
  }
});

test('per-page status can never mislabel a failed or outdated capture as current', () => {
  for (const entry of entries) {
    assert.ok(['success', 'failed', 'stale'].includes(entry.status), `${entry.routeId} carries a known status`);
    assert.ok(entry.routeId && entry.contentHash && entry.capturedAt, `${entry.routeId} records identity, build hash, and time`);
    if (entry.status === 'success') {
      assert.equal(entry.failure, null, `${entry.routeId}: a current capture carries no failure`);
      assert.ok(!entry.depictsGeneration || entry.selfCapture === true, `${entry.routeId}: only the self-capture may depict another generation`);
      for (const viewport of generation.captureTool.viewports) {
        const artifact = entry.artifacts?.[viewport.id];
        assert.ok(Array.isArray(artifact?.segments) && artifact.segments.length > 0, `${entry.routeId}: ${viewport.id} records full-capture segments`);
        for (const segment of artifact.segments) {
          assert.ok(segment.image?.startsWith('/record/shots/') && segment.image.endsWith('.avif'), `${entry.routeId}: ${viewport.id} segment is a published AVIF path`);
          assert.ok(segment.w > 0 && segment.h > 0 && segment.h <= 16000, `${entry.routeId}: ${viewport.id} segment records decoded dimensions within the encoder limit`);
        }
        assert.ok(artifact.thumb?.startsWith('/record/shots/thumbs/') && artifact.thumb.endsWith('.avif'), `${entry.routeId}: ${viewport.id} thumbnail is a published AVIF path`);
        assert.ok(artifact.thumbW > 0 && artifact.thumbH > 0, `${entry.routeId}: ${viewport.id} records decoded thumbnail dimensions`);
        const publicFile = join(repoRoot, 'public', artifact.thumb.replace(/^\//, ''));
        assert.ok(existsSync(publicFile), `${entry.routeId}: ${viewport.id} thumbnail exists in public/`);
      }
    } else {
      const detail = entry.status === 'failed' ? entry.failure?.message : true;
      assert.ok(detail, `${entry.routeId}: a ${entry.status} capture preserves its reason`);
    }
  }
});

test('the self-capture contract pins exactly one archive page to the generation chain', () => {
  if (isPending) return;
  const selfCaptures = entries.filter((entry) => entry.selfCapture === true);
  assert.equal(selfCaptures.length, 1, 'exactly one entry is the pinned self-capture');
  assert.equal(selfCaptures[0].routeId, '/record/screens/', 'the self-capture is the archive page itself');
  if (selfCaptures[0].status === 'success') {
    assert.equal(
      selfCaptures[0].depictsGeneration,
      generation.supersedes,
      'the self-capture depicts the superseded generation, never the build that embeds it',
    );
  } else {
    assert.ok(selfCaptures[0].failure?.message, 'a failed self-capture preserves its reason');
  }
});

test('the coverage rollup agrees with the recorded routes', () => {
  const success = entries.filter((entry) => entry.status === 'success').length;
  const failed = entries.filter((entry) => entry.status === 'failed').length;
  assert.equal(generation.coverage.required, entries.length, 'required counts every recorded route');
  assert.equal(generation.coverage.success, success, 'success counts current captures');
  assert.equal(generation.coverage.failed, failed, 'failed counts recorded failures');
  assert.equal(generation.coverage.complete, failed === 0 && success === entries.length && entries.length > 0, 'complete is 100% or it is not complete');
  const ids = entries.map((entry) => entry.routeId);
  assert.equal(new Set(ids).size, ids.length, 'route IDs are unique across the generation');
});

test('the TypeScript data contract mirrors the committed generation', () => {
  const recordTs = read(recordTsPath);
  assert.ok(recordTs.includes('RecordCaptureEntry'), 'record.ts publishes the capture entry type');
  assert.ok(recordTs.includes('recordCaptureSummary'), 'record.ts publishes the endpoint rollup');
  assert.ok(recordTs.includes("from './record-captures.json'"), 'record.ts loads the committed generation');
});

test('the built archive page embeds the generation it depicts', (t) => {
  const screensHtml = join(distDir, 'record', 'screens', 'index.html');
  if (!existsSync(screensHtml)) {
    t.skip('dist/ not built in this environment; embed checked after build');
    return;
  }
  const html = read(screensHtml);
  const match = html.match(/data-capture-generation="([^"]+)"/);
  assert.ok(match, 'the archive page stamps its depicted generation into the HTML');
  assert.equal(match[1], generation.generationId, 'the built page depicts the committed generation');
  if (isPending) {
    assert.ok(html.includes('No capture generation published yet'), 'the pending page reports the absence honestly');
    return;
  }
  for (const entry of entries.filter((item) => item.status === 'success')) {
    for (const path of artifactFiles(entry)) {
      assert.ok(html.includes(path), `the archive page publishes ${entry.routeId} ${path}`);
    }
  }
});
