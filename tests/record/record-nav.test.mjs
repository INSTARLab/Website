import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNavUniverse,
  findNavPath,
  inboundRanking,
  nearestHub,
  padNumber,
} from '../../src/components/record/nav-graph.mjs';

const pages = [
  { path: '/record/nav/', title: 'Site map', family: 'Public record', kind: 'record', indexable: true },
  { path: '/record/federal/', title: 'Federal record', family: 'Public record', kind: 'record', indexable: true },
  { path: '/contact-us/', title: 'Contact', family: 'Core', kind: 'core', indexable: true },
  { path: '/mission/', title: 'Mission', family: 'Core', kind: 'core', indexable: false },
];

const journeys = [
  {
    id: 'program-officer',
    label: 'Program officer',
    steps: [
      { label: 'Current programs', href: '/research/current-programs/' },
      { label: 'Facilities', href: '/research/facilities/' },
      { label: 'Federal posture', href: '/record/federal/' },
    ],
    nextAction: { label: 'Discuss a requirement', href: '/contact-us/' },
  },
  {
    id: 'supporter',
    label: 'Supporter',
    steps: [
      { label: 'Mission', href: '/mission/' },
      { label: 'Current programs', href: '/research/current-programs/' },
    ],
    nextAction: { label: 'Explore ways to support', href: '/community/support/' },
  },
];

test('the universe keeps every inventory page and names journey-only stops honestly', () => {
  const universe = buildNavUniverse(pages, journeys);
  const byPath = new Map(universe.nodes.map((node) => [node.path, node]));

  for (const page of pages) {
    assert.equal(byPath.get(page.path)?.inInventory, true);
    assert.equal(byPath.get(page.path)?.title, page.title);
  }

  // Journey-only stops carry the journey's own label and no invented metadata.
  const programs = byPath.get('/research/current-programs/');
  assert.equal(programs?.inInventory, false);
  assert.equal(programs?.title, 'Current programs');
  assert.equal(programs?.family, null);
  assert.equal(programs?.indexable, null);
  assert.deepEqual(programs?.journeys, ['program-officer', 'supporter']);

  // The next-action terminal is a weak edge, not a content edge.
  assert.ok(universe.weakEdges.some((edge) => edge.source === '/record/federal/' && edge.target === '/contact-us/'));
  assert.ok(!universe.contentEdges.some((edge) => edge.target === '/contact-us/'));

  // Every edge endpoint resolves to a node — the finder can never name a stop
  // it cannot describe.
  const known = new Set(universe.nodes.map((node) => node.path));
  for (const edge of [...universe.contentEdges, ...universe.weakEdges]) {
    assert.ok(known.has(edge.source), `edge source without a node: ${edge.source}`);
    assert.ok(known.has(edge.target), `edge target without a node: ${edge.target}`);
  }
});

test('the inbound ranking counts content flow and ignores next-action exits', () => {
  const universe = buildNavUniverse(pages, journeys);
  const ranking = inboundRanking(universe);
  const byPath = new Map(ranking.map((row) => [row.path, row]));

  assert.equal(byPath.get('/research/current-programs/')?.inbound, 1);
  assert.deepEqual(byPath.get('/research/current-programs/')?.journeys, ['supporter']);
  assert.equal(byPath.get('/research/facilities/')?.inbound, 1);
  // The most-traversed stop sorts first.
  assert.ok(ranking[0].inbound >= ranking[1].inbound);
  // The next-action exit must not inflate the contact page's inbound count.
  assert.equal(byPath.get('/contact-us/'), undefined);
  assert.equal(byPath.get('/community/support/'), undefined);
});

test('the finder returns shortest recorded paths and explicit dead ends', () => {
  const universe = buildNavUniverse(pages, journeys);

  const direct = findNavPath(universe, '/mission/', '/research/current-programs/');
  assert.equal(direct.status, 'found');
  assert.deepEqual(direct.steps, ['/mission/', '/research/current-programs/']);

  const multi = findNavPath(universe, '/mission/', '/record/federal/');
  assert.equal(multi.status, 'found');
  assert.deepEqual(multi.steps, ['/mission/', '/research/current-programs/', '/research/facilities/', '/record/federal/']);

  // The next-action hop is invisible until the caller opts into weak edges.
  assert.equal(findNavPath(universe, '/record/federal/', '/contact-us/').status, 'unreachable');
  const weak = findNavPath(universe, '/record/federal/', '/contact-us/', { includeWeak: true });
  assert.equal(weak.status, 'found');
  assert.deepEqual(weak.steps, ['/record/federal/', '/contact-us/']);

  assert.deepEqual(findNavPath(universe, '/mission/', '/mission/'), { status: 'same', steps: ['/mission/'] });
  assert.equal(findNavPath(universe, '/contact-us/', '/mission/').status, 'unreachable');
  assert.deepEqual(findNavPath(universe, '/nope/', '/mission/'), { status: 'unknown', unknown: '/nope/' });
});

test('the nearest hub names the best-connected stop reachable from the start', () => {
  const universe = buildNavUniverse(pages, journeys);
  const hub = nearestHub(universe, '/mission/');
  // Reachable: current-programs (inbound 1), facilities (inbound 1), federal
  // (inbound 1). The tie breaks on path order, and the start itself is never
  // its own hub.
  assert.ok(hub);
  assert.notEqual(hub.path, '/mission/');
  assert.equal(hub.inbound, 1);
  assert.equal(nearestHub(universe, '/contact-us/'), null);
  assert.equal(nearestHub(universe, '/nope/'), null);
});

test('directory numbers are zero-padded to the entry count', () => {
  assert.equal(padNumber(1, 9), '1');
  assert.equal(padNumber(1, 64), '01');
  assert.equal(padNumber(64, 64), '64');
  assert.equal(padNumber(7, 120), '007');
  assert.throws(() => padNumber(0, 10), /1-based/);
  assert.throws(() => padNumber(1, 0), /positive/);
});

test('invalid inputs fail loudly instead of producing a quiet wrong graph', () => {
  // @ts-expect-error — deliberate misuse under test
  assert.throws(() => buildNavUniverse(null, []), /array of inventory pages/);
  assert.throws(() => buildNavUniverse([{ title: 'No path' }], []), /without a path/);
  assert.throws(() => buildNavUniverse([], [{ steps: [] }]), /without an id/);
});
