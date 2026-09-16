import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMPAT_GRAPH_SCHEMA_VERSION,
  LINK_GRAPH_SCHEMA_VERSION,
  buildLinkGraph,
  extractPageLinks,
  findLinkPath,
  linkInboundRanking,
  nearestLinkHub,
  normalizeLinkTarget,
  readAliasTarget,
  splitLinkZones,
} from '../../src/components/record/nav-graph.mjs';

const HOME_HTML = [
  '<header>',
  '<a href="/about/">About</a>',
  '<a href="/about/">About again</a>',
  '<a href="https://www.instarlab.org/research/">Research absolute</a>',
  '</header>',
  '<main id="main-content">',
  '<a href="research/">Research relative</a>',
  '<a href="/research/?utm=x#team">Research query and fragment</a>',
  '<a href="/about/">About in body</a>',
  '<a href="/missing-page/">Gone</a>',
  '<a href="#main-content">Skip link</a>',
  '<a href="mailto:info@instarlab.org">Email</a>',
  '<a href="tel:9292292917">Call</a>',
  '<a href="https://example.com/">Off-site</a>',
  '<a href="/docs/paper.pdf">Paper download</a>',
  '<a href="/">Home self link</a>',
  '</main>',
  '<footer><a href="/about/">About in footer</a><a href="/contact-us/">Contact</a></footer>',
].join('');

const ABOUT_HTML = '<header></header><main><a href="/">Home</a></main><footer></footer>';
const RESEARCH_HTML = '<header></header><main><p>No outgoing links.</p></main><footer></footer>';
const ALIAS_HTML =
  '<head><meta http-equiv="refresh" content="0; url=/about/"></head><main><a href="/">Home</a></main>';
const NO_MAIN_HTML = '<div><a href="/">Home without a landmark</a></div>';

const routes = [
  { path: '/', title: 'Home', family: 'Home', kind: 'core', indexable: true },
  { path: '/about/', title: 'About', family: 'Core', kind: 'core', indexable: true },
  { path: '/research/', title: 'Research', family: 'Research', kind: 'section', indexable: true },
  { path: '/contact-us/', title: 'Contact', family: 'Core', kind: 'core', indexable: true },
  { path: '/lonely/', title: 'Lonely', family: 'Core', kind: 'core', indexable: true },
];

const documents = [
  { route: '/', html: HOME_HTML },
  { route: '/about/', html: ABOUT_HTML },
  { route: '/research/', html: RESEARCH_HTML },
];

const journeys = [
  {
    id: 'supporter',
    label: 'Supporter',
    steps: [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about/' },
    ],
    nextAction: { label: 'Nowhere yet', href: '/nowhere/' },
  },
];

test('schema versions pin the compatibility and observed payloads apart', () => {
  assert.equal(COMPAT_GRAPH_SCHEMA_VERSION, 1);
  assert.equal(LINK_GRAPH_SCHEMA_VERSION, 2);
});

test('zones split on the main element, never on an id', () => {
  const zones = splitLinkZones('<header>H</header><main class="record-main">C</main><footer>F</footer>');
  assert.equal(zones.header, '<header>H</header>');
  assert.equal(zones.content, 'C');
  assert.equal(zones.footer, '<footer>F</footer>');
  assert.equal(zones.unzoned, false);

  const unzoned = splitLinkZones(NO_MAIN_HTML);
  assert.equal(unzoned.unzoned, true);
  assert.equal(unzoned.content, '');
  assert.throws(() => splitLinkZones(null), /HTML string/);
});

test('alias documents expose their redirect target', () => {
  assert.equal(readAliasTarget(ALIAS_HTML), '/about/');
  assert.equal(readAliasTarget(HOME_HTML), null);
  assert.equal(readAliasTarget('<meta http-equiv="refresh" content="0">'), null);
});

test('href normalization covers relative, absolute, base, fragments and skips', () => {
  // Document-relative hrefs resolve against the source route directory.
  assert.deepEqual(normalizeLinkTarget('research/', '/').kind, 'internal');
  assert.equal(normalizeLinkTarget('research/', '/').route, '/research/');
  assert.equal(normalizeLinkTarget('../../about/', '/research/deep/').route, '/about/');
  // Root-absolute, same-origin absolute, and query/fragment variants collapse.
  assert.equal(normalizeLinkTarget('/about/', '/').route, '/about/');
  assert.equal(normalizeLinkTarget('https://www.instarlab.org/about/', '/').route, '/about/');
  assert.equal(normalizeLinkTarget('/research/?utm=x#team', '/').route, '/research/');
  // The GitLab Pages project base strips back to root route ids.
  assert.equal(normalizeLinkTarget('/Website/about/', '/', { base: '/Website/' }).route, '/about/');
  assert.equal(normalizeLinkTarget('/Website/', '/about/', { base: '/Website/' }).route, '/');
  // Fragments, protocols, assets, and self links never become edges.
  assert.deepEqual(normalizeLinkTarget('#main-content', '/'), { kind: 'skipped', reason: 'fragment' });
  assert.deepEqual(normalizeLinkTarget('mailto:a@b.c', '/'), { kind: 'skipped', reason: 'protocol' });
  assert.deepEqual(normalizeLinkTarget('tel:9292292917', '/'), { kind: 'skipped', reason: 'protocol' });
  assert.deepEqual(normalizeLinkTarget('/docs/paper.pdf', '/'), { kind: 'skipped', reason: 'asset' });
  assert.deepEqual(normalizeLinkTarget('/', '/'), { kind: 'self' });
  assert.deepEqual(normalizeLinkTarget('?page=2', '/'), { kind: 'self' });
  // Off-origin absolute URLs are external; unknown internal paths report missing.
  assert.deepEqual(normalizeLinkTarget('https://example.com/', '/'), { kind: 'external' });
  assert.deepEqual(normalizeLinkTarget('//example.com/x', '/'), { kind: 'external' });
  const known = new Set(routes.map((route) => route.path));
  assert.deepEqual(normalizeLinkTarget('/about/', '/', { knownRoutes: known }), {
    kind: 'internal',
    route: '/about/',
  });
  assert.deepEqual(normalizeLinkTarget('/missing-page/', '/', { knownRoutes: known }), {
    kind: 'missing',
    route: '/missing-page/',
  });
  // The host error document keeps its filename id; other .html paths are not
  // canonical routes and report as missing rather than mapping somewhere.
  assert.equal(normalizeLinkTarget('/404.html', '/', { knownRoutes: known }).route, '/404.html');
  assert.deepEqual(normalizeLinkTarget('/about.html', '/', { knownRoutes: known }).kind, 'missing');
  assert.throws(() => normalizeLinkTarget('/about/', 'about/'), /root-absolute/);
  assert.throws(() => normalizeLinkTarget(null, '/'), /string href/);
});

test('page extraction keeps zones, labels, and occurrence order', () => {
  const extraction = extractPageLinks(HOME_HTML, '/');
  assert.equal(extraction.unzoned, false);
  assert.equal(extraction.alias, null);
  const content = extraction.observations.filter((link) => link.zone === 'content');
  const chrome = extraction.observations.filter((link) => link.zone === 'chrome');
  // Content: research x2 (relative + query/fragment), about, missing. Skips,
  // protocols, downloads, externals, and the self link contribute nothing.
  assert.deepEqual(
    content.map((link) => link.target),
    ['/research/', '/research/', '/about/', '/missing-page/'],
  );
  assert.equal(content[0]?.label, 'Research relative');
  // Chrome: header about x2 + absolute research, footer about + contact.
  assert.equal(chrome.length, 5);
  assert.ok(chrome.every((link) => typeof link.label === 'string' && link.label.length > 0));

  const unzoned = extractPageLinks(NO_MAIN_HTML, '/research/');
  assert.equal(unzoned.unzoned, true);
  assert.deepEqual(unzoned.observations, []);
});

test('the graph keeps every ledger route, flags orphans, and reports missing targets', () => {
  const graph = buildLinkGraph({ routes, documents, journeys });
  assert.equal(graph.schemaVersion, 2);
  assert.deepEqual(
    graph.nodes.map((node) => node.id),
    ['/', '/about/', '/contact-us/', '/lonely/', '/nowhere/', '/research/'],
  );

  // Orphan status measures inbound *content* edges: /lonely/ is unlinked
  // everywhere, while /contact-us/ is footer-linked yet still a content
  // orphan — chrome repetition never rescues content-connectedness.
  assert.deepEqual(graph.orphans, ['/contact-us/', '/lonely/']);
  const lonely = graph.nodes.find((node) => node.id === '/lonely/');
  assert.equal(lonely?.inLedger, true);
  assert.equal(lonely?.inboundContent, 0);
  const contact = graph.nodes.find((node) => node.id === '/contact-us/');
  assert.equal(contact?.inboundChrome, 1);
  assert.equal(contact?.inboundContent, 0);

  // The broken target is reported with sources, never a node.
  assert.deepEqual(graph.missing, [{ route: '/missing-page/', sources: ['/'], occurrences: 1 }]);
  assert.ok(!graph.nodes.some((node) => node.id === '/missing-page/'));

  // Unique pairs carry occurrence evidence: header/footer repetition of
  // /about/ collapses to one chrome pair with three occurrences.
  const chromeAbout = graph.chromeEdges.find((edge) => edge.source === '/' && edge.target === '/about/');
  assert.equal(chromeAbout?.occurrences, 3);
  assert.equal(chromeAbout?.label, 'About');
  const contentAbout = graph.contentEdges.find((edge) => edge.source === '/' && edge.target === '/about/');
  assert.equal(contentAbout?.occurrences, 1);
  // Query/fragment variants collapse onto the same content pair with evidence.
  const research = graph.contentEdges.find((edge) => edge.source === '/' && edge.target === '/research/');
  assert.equal(research?.occurrences, 2);
  assert.equal(research?.label, 'Research relative');

  // Journeys ride along as a labelled overlay, never as observed links.
  assert.deepEqual(graph.journeyOverlay, [
    { source: '/', target: '/about/', journey: 'supporter', kind: 'step', observed: 'content' },
    { source: '/about/', target: '/nowhere/', journey: 'supporter', kind: 'next-action', observed: null },
  ]);
  const nowhere = graph.nodes.find((node) => node.id === '/nowhere/');
  assert.equal(nowhere?.inLedger, false);
  assert.equal(nowhere?.inInventory, false);
  assert.equal(nowhere?.title, 'Nowhere yet');
  assert.deepEqual(nowhere?.journeys, ['supporter']);

  // Per-node zone counters agree with the edge sets.
  const home = graph.nodes.find((node) => node.id === '/');
  assert.equal(home?.outboundContent, 2);
  assert.equal(home?.outboundChrome, 3);
  assert.equal(graph.summary.contentPairs, graph.contentEdges.length);
  assert.equal(graph.summary.chromePairs, graph.chromeEdges.length);
  assert.equal(graph.summary.observedJourneyLinks, 1);
  assert.equal(graph.provenance.routeCount, routes.length);
  assert.equal(graph.provenance.documentCount, documents.length);
  assert.deepEqual(graph.provenance.unzoned, []);
});

test('alias and unzoned documents contribute no out-edges', () => {
  const graph = buildLinkGraph({
    routes: [...routes, { path: '/old/', title: 'Old', family: 'Core', kind: 'core', indexable: true }],
    documents: [
      ...documents,
      { route: '/old/', html: ALIAS_HTML },
      { route: '/lonely/', html: NO_MAIN_HTML },
    ],
    journeys: [],
  });
  assert.ok(!graph.contentEdges.some((edge) => edge.source === '/old/'));
  assert.ok(!graph.chromeEdges.some((edge) => edge.source === '/old/'));
  assert.deepEqual(graph.provenance.aliases, [{ route: '/old/', target: '/about/' }]);
  assert.deepEqual(graph.provenance.unzoned, ['/lonely/']);
  const old = graph.nodes.find((node) => node.id === '/old/');
  assert.equal(old?.aliasOf, '/about/');
});

test('undocumented inventory routes stay visible with no out-edges', () => {
  const graph = buildLinkGraph({ routes, documents, journeys: [] });
  assert.deepEqual(graph.provenance.undocumented, ['/contact-us/', '/lonely/']);
  // /contact-us/ is chrome-linked from home but has no document here: it
  // keeps its inbound chrome counter, emits nothing, and stays a content
  // orphan because orphan status measures observed inbound content edges.
  const contact = graph.nodes.find((node) => node.id === '/contact-us/');
  assert.equal(contact?.outboundContent, 0);
  assert.equal(contact?.outboundChrome, 0);
  assert.ok(graph.orphans.includes('/contact-us/'));
});

test('self-loop next actions record no overlay edge', () => {
  const graph = buildLinkGraph({
    routes,
    documents,
    journeys: [
      {
        id: 'loop',
        label: 'Loop',
        steps: [{ label: 'About', href: '/about/' }],
        nextAction: { label: 'About', href: '/about/' },
      },
    ],
  });
  assert.deepEqual(graph.journeyOverlay, []);
});

test('the inbound ranking counts content flow and ignores chrome repetition', () => {
  const graph = buildLinkGraph({ routes, documents, journeys });
  const ranking = linkInboundRanking(graph);
  const byPath = new Map(ranking.map((row) => [row.path, row]));
  // /about/ is chrome-linked three times but content-linked once, from one
  // source: chrome repetition must not inflate connectedness.
  assert.equal(byPath.get('/about/')?.inbound, 1);
  assert.equal(byPath.get('/about/')?.occurrences, 1);
  assert.equal(byPath.get('/contact-us/'), undefined);
  assert.ok(ranking[0].inbound >= ranking[ranking.length - 1].inbound);
});

test('observed pathfinding defaults to content with a chrome opt-in', () => {
  const graph = buildLinkGraph({ routes, documents, journeys });
  assert.deepEqual(findLinkPath(graph, '/', '/'), { status: 'same', steps: ['/'] });
  assert.deepEqual(findLinkPath(graph, '/', '/about/'), { status: 'found', steps: ['/', '/about/'] });
  // /contact-us/ is chrome-only from home: unreachable by default, one hop
  // with the chrome opt-in — the content/chrome distinction the acceptance
  // criteria require of every route-path calculation.
  assert.equal(findLinkPath(graph, '/', '/contact-us/').status, 'unreachable');
  assert.deepEqual(findLinkPath(graph, '/', '/contact-us/', { includeChrome: true }), {
    status: 'found',
    steps: ['/', '/contact-us/'],
  });
  assert.deepEqual(findLinkPath(graph, '/', '/nope/'), { status: 'unknown', unknown: '/nope/' });
  assert.equal(findLinkPath(graph, '/research/', '/contact-us/').status, 'unreachable');

  const hub = nearestLinkHub(graph, '/about/');
  assert.ok(hub);
  assert.notEqual(hub.path, '/about/');
  assert.equal(nearestLinkHub(graph, '/research/'), null);
  assert.equal(nearestLinkHub(graph, '/nope/'), null);
});

test('invalid inputs fail loudly instead of producing a quiet wrong graph', () => {
  // @ts-expect-error — deliberate misuse under test
  assert.throws(() => buildLinkGraph(null), /array of ledger routes/);
  assert.throws(() => buildLinkGraph({ routes, documents: [{ route: '/' }] }), /route and html/);
  assert.throws(
    () =>
      buildLinkGraph({
        routes,
        documents: [...documents, { route: '/outside/', html: ABOUT_HTML }],
      }),
    /outside the ledger/,
  );
  assert.throws(
    () =>
      buildLinkGraph({
        routes,
        documents: [...documents, { route: '/', html: ABOUT_HTML }],
      }),
    /duplicate documents/,
  );
  assert.throws(() => buildLinkGraph({ routes, documents, journeys: [{ steps: [] }] }), /without an id/);
});
