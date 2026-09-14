import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { statusDefinition, RECORD_STATUSES } from '../../src/components/record/ui/status-label.mjs';
import {
  NOT_REPORTED_LABEL,
  describeValue,
  formatDisplayValue,
  valueStateOf,
} from '../../src/components/record/ui/value-state.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const uiDir = join(here, '..', '..', 'src', 'components', 'record', 'ui');
const sourceOf = (name) => readFileSync(join(uiDir, name), 'utf8');

test('a measured zero is formatted as a number, never as an absence', () => {
  assert.equal(NOT_REPORTED_LABEL, 'Not reported');
  assert.equal(formatDisplayValue(0), '0');
  assert.equal(valueStateOf(0), 'measured');
  assert.equal(formatDisplayValue(49000), '49,000');
  assert.equal(formatDisplayValue('Program service share'), 'Program service share');
  assert.equal(formatDisplayValue(true), 'Yes');
  assert.equal(formatDisplayValue(false), 'No');
});

test('missing values share one explicit label across every component', () => {
  for (const missing of [null, undefined, '']) {
    assert.equal(formatDisplayValue(missing), 'Not reported');
    assert.equal(valueStateOf(missing), 'unavailable');
  }
});

test('non-finite numbers fail loudly instead of printing as measurements', () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(() => formatDisplayValue(value), /finite or null/);
    assert.equal(valueStateOf(value), 'unavailable');
  }
});

test('describeValue keeps zero, unavailable, and stale states apart', () => {
  const zero = describeValue(0);
  assert.equal(zero.state, 'measured');
  assert.equal(zero.display, '0');
  assert.match(zero.note ?? '', /zero/i);

  const missing = describeValue(null);
  assert.equal(missing.state, 'unavailable');
  assert.equal(missing.display, 'Not reported');
  assert.equal(missing.note, null);

  const stale = describeValue(3, { stale: true, asOf: '2026-06-01' });
  assert.equal(stale.state, 'measured-stale');
  assert.equal(stale.display, '3');
  assert.match(stale.note ?? '', /2026-06-01/);

  const staleUndated = describeValue(3, { stale: true });
  assert.equal(staleUndated.state, 'measured-stale');
  assert.ok(!(staleUndated.note ?? '').includes('undefined'));

  const plain = describeValue(49000);
  assert.deepEqual(plain, { display: '49,000', state: 'measured', note: null });
});

test('every status key resolves to a labelled Bootstrap badge, never color-only', () => {
  const keys = ['verified-in-repository', 'review-required', 'not-public', 'stale', 'not-reported'];
  assert.deepEqual(Object.keys(RECORD_STATUSES).sort(), [...keys].sort());
  for (const key of keys) {
    const definition = statusDefinition(key);
    assert.ok(definition.label.length > 0, `${key} needs visible text`);
    assert.match(definition.badge, /^text-bg-(success|warning|secondary|danger|info|primary)$/);
    assert.ok(definition.description.length > 0, `${key} needs a title definition`);
  }
});

test('unknown status keys throw at build time instead of rendering a wrong color', () => {
  assert.throws(() => statusDefinition('approved'), /Unknown record status/);
  assert.throws(() => statusDefinition(''), /Unknown record status/);
});

test('RecordTable names itself, scopes headers, and scrolls in a labelled region', () => {
  const source = sourceOf('RecordTable.astro');
  assert.match(source, /<caption/, 'caption element (the table name)');
  assert.match(source, /caption.*required|requires a non-empty caption/, 'caption is a required prop');
  assert.match(source, /scope="col"/, 'column header scope');
  assert.match(source, /scope="row"/, 'row header scope');
  assert.match(source, /table-responsive/, 'Bootstrap scroll region');
  assert.match(source, /role="region"/, 'scroll region is announced');
  assert.match(source, /tabindex="0"/, 'scroll region is keyboard-reachable');
  assert.match(source, /aria-label/, 'scroll region is labelled');
  assert.match(source, /value-state\.mjs/, 'unavailable cells share the room label');
});

test('EvidencePanel composes title/date, summaries, visualization, then details', () => {
  const source = sourceOf('EvidencePanel.astro');
  assert.match(source, /<slot name="summary"/, 'summary slot before the visualization');
  assert.match(source, /<slot \/>/, 'default slot carries the RR-203 visualization');
  assert.match(source, /<slot name="details"/, 'details slot after the visualization');
  assert.match(source, /<slot name="footer"/, 'footer slot for the source note');
  assert.match(source, /class="record-panel card"/, 'Bootstrap card frame');
  assert.ok(!source.includes('<script'), 'no JavaScript: the panel reads statically and prints as blocks');
});

test('SectionHeading keys size to the outline level, not to a size utility', () => {
  const source = sourceOf('SectionHeading.astro');
  assert.match(source, /record-section__label/, 'kicker uses the shell label convention');
  assert.match(source, /record-section__lede/, 'lede uses the shell lede convention');
  assert.match(source, /level\?: 2 \| 3/, 'call sites choose the outline level');
  for (const utility of ['display-6', 'class="h3"', 'class="h2"']) {
    assert.ok(!source.includes(utility), `no forked scale via ${utility}`);
  }
});

test('SourceNote always names the source and states retrieval and limits', () => {
  const source = sourceOf('SourceNote.astro');
  assert.match(source, /Source/, 'source label');
  assert.match(source, /Retrieved/, 'retrieval date');
  assert.match(source, /Limits/, 'stated limits');
});

test('StatusPill renders the shared definition text on a Bootstrap badge', () => {
  const source = sourceOf('StatusPill.astro');
  assert.match(source, /status-label\.mjs/, 'pill reads the closed vocabulary');
  assert.match(source, /badge/, 'Bootstrap badge primitive');
  assert.match(source, /definition\.label/, 'text travels with the color');
  assert.match(source, /definition\.description/, 'full definition is exposed, not just color');
});

test('DataState carries its state token into the DOM for test assertion', () => {
  const source = sourceOf('DataState.astro');
  assert.match(source, /value-state\.mjs/, 'shares the value-state semantics');
  assert.match(source, /data-value-state/, 'state token for assertions');
  assert.match(source, /StatusPill/, 'stale and unavailable states pair with a pill');
  assert.ok(!source.includes('<script'), 'no JavaScript: the state reads statically');
});

test('MetricGrid keeps its three-state token contract', () => {
  const source = sourceOf('MetricGrid.astro');
  assert.match(source, /no-snapshot.*unavailable.*measured/, 'the three tokens travel together');
  assert.match(source, /data-record-value-state/, 'state token stays in the DOM');
});
