/**
 * nav-graph.mjs — build-time navigation-graph derivations for `/record/nav/`.
 *
 * Pure, dependency-free functions. The Astro layer (`src/data/record.ts`
 * values in, component props out) does the wiring; `node --test` drives these
 * functions with fixtures. This split keeps the derivation unit-tested without
 * teaching the node test runner TypeScript.
 *
 * Two open teardown decisions are settled here and documented where they land:
 *
 * 1. Weak edges map to `nextAction` terminal edges. `recordGraph.edges` only
 *    carries consecutive journey-step pairs, so the "allow weak hops" toggle
 *    has a real edge set to act on: the final step of each journey into its
 *    source-defined next action. The inbound leaderboard ignores weak edges so
 *    it keeps measuring recorded content flow rather than suggested exits.
 * 2. Per-route metrics stay manifest- and graph-derived. The route ledger
 *    (`scripts/quality/route-ledger.mjs`) reads rendered `dist/` HTML, which
 *    does not exist at build time, and its measurement fields belong to the
 *    quality gate — so `page-metrics.json.ts` gains per-route rows built from
 *    `sitePageRecords` plus the indegree computed here, never ledger or SEO
 *    figures.
 *
 * No fabricated facts: every node traces to either `sitePageRecords` or a
 * journey step / next action in `recordJourneys`. Journey stops that live
 * outside the route inventory (for example `/research/current-programs/`, a
 * real `[slug]` route with no inventory row) are carried as journey-only
 * nodes with the journey's own label, never with invented metadata.
 *
 * The second half of this module (RRP-203, GitLab #28) derives the
 * actual-link graph from finished built HTML. Those functions are likewise
 * pure and dependency-free: the caller supplies `{ route, html }` documents
 * plus the route inventory, and the builder returns a versioned link graph
 * with content/chrome edge sets, a labelled journey overlay, orphans, and
 * missing-target reports. `scripts/quality/build-link-graph.mjs` runs the
 * builder over `dist/` and merges the result into `/record/graph.json`
 * without changing the compatibility `nodes`/`edges` keys above.
 */

/**
 * @typedef {object} InventoryPage
 * @property {string} path
 * @property {string} title
 * @property {string} family
 * @property {string} kind
 * @property {boolean} indexable
 */

/**
 * @typedef {object} JourneyRecord
 * @property {string} id
 * @property {string} label
 * @property {readonly {label: string, href: string}[]} steps
 * @property {{label: string, href: string}} nextAction
 */

/**
 * @typedef {object} NavNode
 * @property {string} path
 * @property {string} title inventory title, else the first journey label seen
 * @property {string | null} family null for journey-only stops
 * @property {string | null} kind null for journey-only stops
 * @property {boolean | null} indexable null for journey-only stops
 * @property {boolean} inInventory
 * @property {string[]} journeys ids of the journeys that reference this node
 */

/**
 * @typedef {object} NavEdge
 * @property {string} source
 * @property {string} target
 * @property {string} journey
 */

/**
 * @typedef {object} NavUniverse
 * @property {NavNode[]} nodes
 * @property {NavEdge[]} contentEdges consecutive journey-step pairs
 * @property {NavEdge[]} weakEdges final step into the journey next action
 */

/**
 * @typedef {object} InboundRow
 * @property {string} path
 * @property {string} title
 * @property {boolean} inInventory
 * @property {number} inbound indegree over content edges only
 * @property {string[]} journeys journey ids traversing this node, sorted
 */

/**
 * Zero-padded 1-based directory number. Width derives from the entry count so
 * the directory, the record-room sidebar, and the reference teardown agree.
 *
 * @param {number} index 1-based position in the directory order
 * @param {number} total total directory entries
 * @returns {string}
 */
export function padNumber(index, total) {
  if (!Number.isInteger(index) || index < 1) throw new TypeError('padNumber expects a 1-based integer index.');
  if (!Number.isInteger(total) || total < 1) throw new TypeError('padNumber expects a positive integer total.');
  return String(index).padStart(String(total).length, '0');
}

/**
 * Build the navigation universe: inventory nodes plus journey-only stops, with
 * content edges between consecutive steps and weak edges into next actions.
 *
 * @param {readonly InventoryPage[]} pages rows from `sitePageRecords`
 * @param {readonly JourneyRecord[]} journeys rows from `recordJourneys`
 * @returns {NavUniverse}
 */
export function buildNavUniverse(pages, journeys) {
  if (!Array.isArray(pages)) throw new TypeError('buildNavUniverse expects an array of inventory pages.');
  if (!Array.isArray(journeys)) throw new TypeError('buildNavUniverse expects an array of journey records.');

  /** @type {Map<string, NavNode>} */
  const nodes = new Map();
  for (const page of pages) {
    if (typeof page?.path !== 'string' || typeof page?.title !== 'string') {
      throw new TypeError('buildNavUniverse found an inventory page without a path and title.');
    }
    if (!nodes.has(page.path)) {
      nodes.set(page.path, {
        path: page.path,
        title: page.title,
        family: page.family ?? null,
        kind: page.kind ?? null,
        indexable: typeof page.indexable === 'boolean' ? page.indexable : null,
        inInventory: true,
        journeys: [],
      });
    }
  }

  /** @param {string} href @param {string} label @param {string} journeyId */
  const ensureJourneyNode = (href, label, journeyId) => {
    const existing = nodes.get(href);
    if (existing) {
      if (!existing.journeys.includes(journeyId)) existing.journeys.push(journeyId);
      return;
    }
    nodes.set(href, {
      path: href,
      title: label,
      family: null,
      kind: null,
      indexable: null,
      inInventory: false,
      journeys: [journeyId],
    });
  };

  /** @type {NavEdge[]} */
  const contentEdges = [];
  /** @type {NavEdge[]} */
  const weakEdges = [];

  for (const journey of journeys) {
    if (typeof journey?.id !== 'string' || !Array.isArray(journey?.steps)) {
      throw new TypeError('buildNavUniverse found a journey without an id and steps array.');
    }
    const stops = journey.steps.filter((step) => typeof step?.href === 'string');
    for (const step of stops) ensureJourneyNode(step.href, step.label ?? step.href, journey.id);
    for (let index = 0; index < stops.length - 1; index += 1) {
      contentEdges.push({ source: stops[index].href, target: stops[index + 1].href, journey: journey.id });
    }
    const last = stops[stops.length - 1];
    const next = journey.nextAction;
    if (last && typeof next?.href === 'string') {
      ensureJourneyNode(next.href, next.label ?? next.href, journey.id);
      // A self-loop (the last step already being the next action) carries no
      // routing information, so it is not recorded as an edge.
      if (next.href !== last.href) weakEdges.push({ source: last.href, target: next.href, journey: journey.id });
    }
  }

  for (const node of nodes.values()) node.journeys.sort();
  return { nodes: [...nodes.values()], contentEdges, weakEdges };
}

/**
 * Indegree leaderboard over content edges only. Weak (next-action) edges are
 * excluded by design: the ranking answers "where does recorded journey flow
 * concentrate", not "which exits do journeys suggest".
 *
 * @param {NavUniverse} universe
 * @returns {InboundRow[]} sorted by inbound descending, then path ascending
 */
export function inboundRanking(universe) {
  const nodes = new Map((universe?.nodes ?? []).map((node) => [node.path, node]));
  /** @type {Map<string, {count: number, journeys: Set<string>}>} */
  const inbound = new Map();
  for (const edge of universe?.contentEdges ?? []) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) continue;
    const entry = inbound.get(edge.target) ?? { count: 0, journeys: new Set() };
    entry.count += 1;
    entry.journeys.add(edge.journey);
    inbound.set(edge.target, entry);
  }
  return [...inbound.entries()]
    .map(([path, entry]) => ({
      path,
      title: nodes.get(path)?.title ?? path,
      inInventory: nodes.get(path)?.inInventory ?? false,
      inbound: entry.count,
      journeys: [...entry.journeys].sort(),
    }))
    .sort((left, right) => right.inbound - left.inbound || left.path.localeCompare(right.path));
}

/**
 * @typedef {object} NavAdjacency
 * @property {Map<string, string[]>} forward path to sorted next paths
 */

/**
 * @param {NavUniverse} universe
 * @param {boolean} includeWeak
 * @returns {NavAdjacency}
 */
function adjacency(universe, includeWeak) {
  /** @type {Map<string, Set<string>>} */
  const forward = new Map();
  const edges = includeWeak
    ? [...(universe?.contentEdges ?? []), ...(universe?.weakEdges ?? [])]
    : [...(universe?.contentEdges ?? [])];
  for (const edge of edges) {
    if (!forward.has(edge.source)) forward.set(edge.source, new Set());
    forward.get(edge.source)?.add(edge.target);
  }
  return { forward: new Map([...forward.entries()].map(([path, targets]) => [path, [...targets].sort()])) };
}

/**
 * Breadth-first shortest path between two stops in the recorded journey
 * graph. Never invents a route: pairs with no recorded connection report
 * `unreachable`, and unknown endpoints report `unknown`.
 *
 * @param {NavUniverse} universe
 * @param {string} from
 * @param {string} to
 * @param {{includeWeak?: boolean}} [options]
 * @returns {{status: 'same' | 'found' | 'unreachable' | 'unknown', steps?: string[], unknown?: string}}
 */
export function findNavPath(universe, from, to, options = {}) {
  const known = new Set((universe?.nodes ?? []).map((node) => node.path));
  if (!known.has(from)) return { status: 'unknown', unknown: from };
  if (!known.has(to)) return { status: 'unknown', unknown: to };
  if (from === to) return { status: 'same', steps: [from] };

  const { forward } = adjacency(universe, options.includeWeak === true);
  const previous = new Map([[from, null]]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === to) break;
    for (const next of forward.get(current ?? '') ?? []) {
      if (!previous.has(next)) {
        previous.set(next, current ?? null);
        queue.push(next);
      }
    }
  }
  if (!previous.has(to)) return { status: 'unreachable' };
  const steps = [];
  let cursor = to;
  while (cursor !== null) {
    steps.unshift(cursor);
    cursor = previous.get(cursor) ?? null;
  }
  return { status: 'found', steps };
}

/**
 * Nearest-hub fallback for unreachable pairs: the highest-indegree stop
 * reachable from `from` over content edges, mirroring the reference
 * `pathNearestHub` reverse-BFS role. Returns null when nothing is reachable.
 *
 * @param {NavUniverse} universe
 * @param {string} from
 * @returns {InboundRow | null}
 */
export function nearestHub(universe, from) {
  const known = new Set((universe?.nodes ?? []).map((node) => node.path));
  if (!known.has(from)) return null;
  const { forward } = adjacency(universe, false);
  const visited = new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const next of forward.get(current ?? '') ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  visited.delete(from);
  const candidates = inboundRanking(universe).filter((row) => visited.has(row.path));
  return candidates[0] ?? null;
}

/**
 * Actual-link graph extraction over finished built HTML (RRP-203).
 *
 * Deterministic classification rules — every href falls into exactly one
 * bucket, so two runs over the same artifact always agree:
 *
 * - Zones: `content` is the markup inside the first `<main>…</main>` element;
 *   `chrome` is everything outside it (site header plus footer combined).
 *   INSTAR mains carry different ids per layout (`main-content`,
 *   `record-main`), so the split keys on the `main` element itself, never on
 *   an id. A document with no `<main>` landmark cannot be zoned honestly: it
 *   contributes no edges and its route is reported in
 *   `provenance.unzoned`.
 * - Base: hrefs below the configured deployment base (GitLab Pages serves
 *   this site below `/Website/`) are stripped back to root-absolute route
 *   ids before comparison. Document-relative hrefs resolve against the
 *   source route's directory; leading `./`, `../`, queries, and fragments
 *   collapse to the same canonical route id.
 * - Skipped (never edges, never missing): empty hrefs, bare fragments
 *   (`#section`), `mailto:`/`tel:`/`javascript:`/`data:`/`blob:` protocols,
 *   and download/asset links (`.avif`, `.pdf`, `.css`, `.js`, …). A
 *   same-document query (`?page=2` with no path) is a self link.
 * - External: protocol-relative (`//host/…`) and absolute `http(s)` URLs
 *   whose origin differs from the site origin are excluded, never reported
 *   as missing. Same-origin absolute URLs are internal links.
 * - Self links (source route equals target route after normalization) are
 *   dropped: they carry no topology.
 * - Redirects/aliases: a document carrying a meta-refresh is an alias, not
 *   a source — its out-edges are suppressed and its route is reported in
 *   `provenance.aliases` with the redirect target. There are no alias
 *   documents in the current build; the rule exists so a future
 *   compatibility alias can never inflate the graph silently.
 * - Missing: a well-formed internal path with no route, ledger entry, or
 *   journey stop behind it is reported in `missing` with its source routes
 *   and occurrence count. Missing targets never become nodes.
 * - Occurrences versus pairs: repeated anchors (header/footer chrome
 *   repeats the same target dozens of times) count once per unique
 *   source/target/zone pair; the raw repeat count travels as `occurrences`
 *   and the first non-empty anchor text as `label`, so chrome repetition
 *   can never inflate content-connectedness.
 * - Journeys stay a labelled overlay (`journeyOverlay`): step pairs and
 *   non-self next-action pairs, each flagged `observed: 'content'`,
 *   `'chrome'`, or `null`. A journey-only pair is never presented as an
 *   observed HTML link. The self-loop next action (a journey whose last
 *   step already is its next action) carries no routing information and is
 *   not recorded, mirroring `buildNavUniverse`.
 * - Orphans: ledger pages with zero inbound *content* edges. Chrome-only
 *   linkage (footer links) does not rescue a page from orphan status, and
 *   every node keeps both inbound counters so consumers can tell
 *   footer-linked apart from truly unlinked.
 */

/**
 * Compatibility payload schema version: inventory nodes plus journey-step
 * edges, the shape `/record/graph.json` has always served.
 */
export const COMPAT_GRAPH_SCHEMA_VERSION = 1;

/**
 * Observed-link payload schema version: the `linkGraph` object built by
 * `buildLinkGraph` and merged into `/record/graph.json` post-build.
 */
export const LINK_GRAPH_SCHEMA_VERSION = 2;

/**
 * @typedef {'content' | 'chrome'} LinkZone content is inside `<main>`, chrome
 * is the site header plus footer outside it
 */

/**
 * @typedef {object} SkippedTarget
 * @property {'skipped'} kind
 * @property {'empty' | 'fragment' | 'protocol' | 'asset' | 'malformed'} reason
 */

/**
 * @typedef {object} ExternalTarget
 * @property {'external'} kind
 */

/**
 * @typedef {object} SelfTarget
 * @property {'self'} kind
 */

/**
 * @typedef {object} RoutableTarget
 * @property {'internal' | 'missing'} kind `missing` when `knownRoutes` was
 * supplied and holds no such route; `internal` otherwise
 * @property {string} route canonical trailing-slash route id (`/404.html`
 * keeps its filename id)
 */

/**
 * @typedef {SkippedTarget | ExternalTarget | SelfTarget | RoutableTarget} LinkTarget
 */

/**
 * @typedef {object} LinkTargetOptions
 * @property {string} [base] deployment subpath (`/Website/`); root when omitted
 * @property {string} [origin] site origin for same-origin absolute URLs
 * @property {Set<string>} [knownRoutes] when supplied, unknown internal paths
 * classify as `missing` instead of `internal`
 */

/**
 * @typedef {object} LinkZones
 * @property {string} header markup before `<main>`
 * @property {string} content markup inside `<main>`
 * @property {string} footer markup after `</main>`
 * @property {boolean} unzoned true when the document has no `<main>` landmark
 */

/**
 * @typedef {object} ObservedLink
 * @property {string} target canonical route id of the link target
 * @property {LinkZone} zone
 * @property {string} label first-seen anchor text (possibly empty)
 */

/**
 * @typedef {object} PageLinkExtraction
 * @property {ObservedLink[]} observations one entry per anchor occurrence
 * @property {boolean} unzoned
 * @property {string | null} alias meta-refresh redirect target, if any
 */

/**
 * @typedef {object} LinkGraphNode
 * @property {string} id canonical route id
 * @property {string} title inventory title, else the served `<title>`, else
 * the first journey label seen — never invented
 * @property {string | null} family null for journey-only and ledger-only stops
 * @property {string | null} kind null for journey-only and ledger-only stops
 * @property {boolean | null} indexable null for journey-only stops
 * @property {boolean} inLedger true for every route of the complete
 * route/capture ledger (including the noindex utility and error documents)
 * @property {boolean} inInventory true for routes of the source inventory
 * @property {string | null} aliasOf meta-refresh target for alias documents
 * @property {number} inboundContent distinct sources over content edges
 * @property {number} outboundContent distinct targets over content edges
 * @property {number} inboundChrome distinct sources over chrome edges
 * @property {number} outboundChrome distinct targets over chrome edges
 * @property {string[]} journeys ids of the journeys referencing this node
 */

/**
 * @typedef {object} LinkGraphEdge
 * @property {string} source
 * @property {string} target
 * @property {number} occurrences raw anchor repeat count behind the pair
 * @property {string} label first non-empty anchor text seen (possibly empty)
 */

/**
 * @typedef {object} JourneyOverlayLink
 * @property {string} source
 * @property {string} target
 * @property {string} journey
 * @property {'step' | 'next-action'} kind
 * @property {'content' | 'chrome' | null} observed zone of the observed pair,
 * or null for journey-only pairs with no built-HTML link
 */

/**
 * @typedef {object} MissingTarget
 * @property {string} route the unresolvable internal path
 * @property {string[]} sources sorted source routes linking at it
 * @property {number} occurrences raw anchor repeat count
 */

/**
 * @typedef {object} LinkGraphProvenance
 * @property {string} generator script plus derivation module producing this graph
 * @property {string} base deployment base the hrefs were normalized against
 * @property {string} origin site origin treated as internal
 * @property {number} routeCount ledger routes handed to the builder
 * @property {number} documentCount `{ route, html }` documents parsed
 * @property {string[]} unzoned routes whose document has no `<main>` landmark
 * @property {{route: string, target: string | null}[]} aliases alias documents
 * with their redirect targets
 * @property {string[]} undocumented inventory routes with no HTML document
 */

/**
 * @typedef {object} LinkGraphSummary
 * @property {number} nodes
 * @property {number} contentPairs unique content source/target pairs
 * @property {number} chromePairs unique chrome source/target pairs
 * @property {number} journeyLinks overlay entries (steps plus next actions)
 * @property {number} observedJourneyLinks overlay entries backed by an
 * observed HTML link
 * @property {number} orphans ledger pages with zero inbound content edges
 * @property {number} missingCount missing internal targets reported
 */

/**
 * @typedef {object} LinkGraph
 * @property {2} schemaVersion
 * @property {LinkGraphProvenance} provenance
 * @property {LinkGraphSummary} summary
 * @property {LinkGraphNode[]} nodes every ledger route plus journey-only stops
 * @property {LinkGraphEdge[]} contentEdges unique pairs observed in `<main>`
 * @property {LinkGraphEdge[]} chromeEdges unique pairs observed in header/footer
 * @property {JourneyOverlayLink[]} journeyOverlay authored journeys as labels
 * @property {string[]} orphans sorted ledger routes with no inbound content edge
 * @property {MissingTarget[]} missing sorted missing internal targets
 */

/**
 * @typedef {object} LinkPathOptions
 * @property {boolean} [includeChrome] also traverse chrome edges; content only
 * by default so header/footer repetition never invents connectedness
 */

const MAIN_OPEN_PATTERN = /<main\b[^>]*>/i;
const MAIN_CLOSE_PATTERN = /<\/main\s*>/i;
const ANCHOR_PATTERN = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const REFRESH_META_PATTERN = /<meta\b[^>]*\bhttp-equiv\s*=\s*(?:"refresh"|'refresh'|refresh)[^>]*>/i;
const ASSET_PATTERN =
  /\.(?:png|jpe?g|webp|avif|gif|svg|ico|css|js|mjs|pdf|xml|json|txt|woff2?|ttf|eot|otf|mp4|webm|map)$/i;
const PROTOCOL_PATTERN = /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/|#)/;
const SKIPPABLE_PROTOCOL_PATTERN = /^(?:mailto:|tel:|javascript:|data:|blob:|about:)/i;
const DEFAULT_ORIGIN = 'https://www.instarlab.org';

/**
 * Split a built document into header/content/footer link zones on its first
 * `<main>` element.
 *
 * @param {string} html
 * @returns {LinkZones}
 */
export function splitLinkZones(html) {
  if (typeof html !== 'string') throw new TypeError('splitLinkZones expects an HTML string.');
  const open = MAIN_OPEN_PATTERN.exec(html);
  if (!open) return { header: '', content: '', footer: '', unzoned: true };
  const openIndex = open.index ?? 0;
  const afterOpen = html.slice(openIndex + open[0].length);
  const close = MAIN_CLOSE_PATTERN.exec(afterOpen);
  if (!close) {
    return { header: html.slice(0, openIndex), content: afterOpen, footer: '', unzoned: false };
  }
  const closeIndex = close.index ?? 0;
  return {
    header: html.slice(0, openIndex),
    content: afterOpen.slice(0, closeIndex),
    footer: afterOpen.slice(closeIndex + close[0].length),
    unzoned: false,
  };
}

/**
 * Read a meta-refresh redirect target, if the document is an alias/redirect
 * document. Returns null for ordinary pages.
 *
 * @param {string} html
 * @returns {string | null}
 */
export function readAliasTarget(html) {
  if (typeof html !== 'string') throw new TypeError('readAliasTarget expects an HTML string.');
  const tag = REFRESH_META_PATTERN.exec(html)?.[0];
  if (!tag) return null;
  const content = /content\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag)?.slice(1).find(Boolean) ?? '';
  const target = /url\s*=\s*(.+)/i.exec(content)?.[1]?.trim().replace(/^["']|["';\s]+$/g, '') ?? '';
  return target === '' ? null : target;
}

/**
 * Collapse `.`/`..` segments without leaving the site root.
 *
 * @param {string} path root-absolute or relative path
 * @returns {string}
 */
function normalizePosixPath(path) {
  const absolute = path.startsWith('/');
  /** @type {string[]} */
  const stack = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
      continue;
    }
    stack.push(part);
  }
  return `${absolute ? '/' : ''}${stack.join('/')}`;
}

/**
 * @param {string} route canonical route id of the linking page
 * @returns {string} the directory relative hrefs resolve against
 */
function routeDirectory(route) {
  if (route.endsWith('/')) return route;
  const slash = route.lastIndexOf('/');
  return slash <= 0 ? '/' : route.slice(0, slash + 1);
}

/**
 * @param {string} pathname
 * @param {string} base
 * @returns {string}
 */
function stripDeployBase(pathname, base) {
  const trimmed = String(base ?? '').replace(/^\/+|\/+$/g, '');
  if (!trimmed) return pathname;
  const prefix = `/${trimmed}`;
  if (pathname === prefix) return '/';
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length) || '/';
  return pathname;
}

/**
 * Classify one href into exactly one deterministic bucket.
 *
 * @param {string} href raw href attribute value
 * @param {string} fromRoute canonical route id of the linking page
 * @param {LinkTargetOptions} [options]
 * @returns {LinkTarget}
 */
export function normalizeLinkTarget(href, fromRoute, options = {}) {
  if (typeof href !== 'string') throw new TypeError('normalizeLinkTarget expects a string href.');
  if (typeof fromRoute !== 'string' || !fromRoute.startsWith('/')) {
    throw new TypeError('normalizeLinkTarget expects fromRoute as a root-absolute route id.');
  }
  const base = typeof options?.base === 'string' ? options.base : '/';
  const origin = typeof options?.origin === 'string' ? options.origin : DEFAULT_ORIGIN;
  const knownRoutes = options?.knownRoutes;
  if (knownRoutes !== undefined && !(knownRoutes instanceof Set)) {
    throw new TypeError('normalizeLinkTarget expects knownRoutes as a Set of route ids.');
  }

  const raw = href.trim();
  if (raw === '') return { kind: 'skipped', reason: 'empty' };
  if (raw.startsWith('#')) return { kind: 'skipped', reason: 'fragment' };
  if (SKIPPABLE_PROTOCOL_PATTERN.test(raw)) return { kind: 'skipped', reason: 'protocol' };
  if (raw.startsWith('//')) return { kind: 'external' };

  let pathPart = raw;
  const scheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.exec(raw);
  if (scheme) {
    if (!/^https?:/i.test(raw)) return { kind: 'skipped', reason: 'protocol' };
    if (!origin) return { kind: 'external' };
    let url;
    try {
      url = new URL(raw);
    } catch {
      return { kind: 'skipped', reason: 'malformed' };
    }
    let siteOrigin;
    try {
      siteOrigin = new URL(origin).origin;
    } catch {
      throw new TypeError('normalizeLinkTarget expects origin as an absolute URL.');
    }
    if (url.origin !== siteOrigin) return { kind: 'external' };
    pathPart = `${url.pathname}${url.search}${url.hash}`;
  }

  const withoutFragment = pathPart.split('#', 1)[0] ?? '';
  const withoutQuery = withoutFragment.split('?', 1)[0] ?? '';
  const path = withoutQuery.trim();
  // A query-only or fragment-only reference points at the linking page itself.
  if (path === '') return { kind: 'self' };

  let pathname = stripDeployBase(path, base);
  if (!pathname.startsWith('/')) {
    pathname = normalizePosixPath(`${routeDirectory(fromRoute)}${pathname}`);
    if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  } else {
    pathname = normalizePosixPath(pathname);
  }
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }

  if (ASSET_PATTERN.test(decoded)) return { kind: 'skipped', reason: 'asset' };

  let route;
  if (decoded === '/404.html') {
    route = decoded;
  } else if (/\.html?$/i.test(decoded)) {
    // No `.html` compatibility aliases are emitted: a non-`/404.html` html
    // path is not a canonical route, so it reports as missing rather than
    // silently mapping somewhere.
    route = decoded;
  } else {
    route = decoded.endsWith('/') ? decoded : `${decoded}/`;
    if (route === '') route = '/';
  }

  if (route === fromRoute) return { kind: 'self' };
  if (knownRoutes && !knownRoutes.has(route)) return { kind: 'missing', route };
  return { kind: 'internal', route };
}

/**
 * Inner anchor text behind one ANCHOR_PATTERN match: tags stripped,
 * whitespace collapsed, capped at 80 chars. Empty when the anchor carries no
 * usable text (unclosed, or a second `<a>` opens first — bail rather than
 * misattribute).
 *
 * @param {string} zoneHtml
 * @param {number} matchEnd index just past the matched href value
 * @returns {string}
 */
function anchorText(zoneHtml, matchEnd) {
  const tagEnd = zoneHtml.indexOf('>', matchEnd);
  if (tagEnd === -1) return '';
  const rest = zoneHtml.slice(tagEnd + 1);
  const close = /<\/a\s*>/i.exec(rest);
  if (!close) return '';
  const inner = rest.slice(0, close.index ?? 0);
  if (/<a\b/i.test(inner)) return '';
  return inner
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

/**
 * Extract one page's observed link observations in zone order
 * (header, content, footer).
 *
 * @param {string} html finished built HTML of the page
 * @param {string} fromRoute canonical route id of the page
 * @param {LinkTargetOptions} [options]
 * @returns {PageLinkExtraction}
 */
export function extractPageLinks(html, fromRoute, options = {}) {
  if (typeof html !== 'string') throw new TypeError('extractPageLinks expects an HTML string.');
  if (typeof fromRoute !== 'string' || !fromRoute.startsWith('/')) {
    throw new TypeError('extractPageLinks expects fromRoute as a root-absolute route id.');
  }
  const zones = splitLinkZones(html);
  const alias = readAliasTarget(html);
  /** @type {ObservedLink[]} */
  const observations = [];
  if (!zones.unzoned) {
    for (const [zone, zoneHtml] of /** @type {[LinkZone, string][]} */ ([
      ['chrome', zones.header],
      ['content', zones.content],
      ['chrome', zones.footer],
    ])) {
      ANCHOR_PATTERN.lastIndex = 0;
      for (const match of zoneHtml.matchAll(ANCHOR_PATTERN)) {
        const href = match[1] ?? match[2] ?? match[3] ?? '';
        const target = normalizeLinkTarget(href, fromRoute, options);
        if (target.kind !== 'internal' && target.kind !== 'missing') continue;
        const matchEnd = (match.index ?? 0) + match[0].length;
        observations.push({ target: target.route, zone, label: anchorText(zoneHtml, matchEnd) });
      }
    }
  }
  return { observations, unzoned: zones.unzoned, alias };
}

/**
 * Build the versioned actual-link graph: every ledger route is a node even
 * with no edges, edges are unique observed source/target/zone pairs with
 * occurrence evidence, and authored journeys ride along as a labelled
 * overlay that never masquerades as observed links.
 *
 * @param {object} input
 * @param {readonly {path: string, title: string, family?: string | null, kind?: string | null, indexable?: boolean | null}[]} input.routes complete route/capture ledger rows
 * @param {readonly {route: string, html: string}[]} input.documents finished built HTML per route
 * @param {readonly JourneyRecord[]} [input.journeys] authored journeys for the overlay
 * @param {string} [input.base] deployment subpath hrefs normalize against
 * @param {string} [input.origin] site origin treated as internal
 * @param {string} [input.generator] provenance generator label
 * @returns {LinkGraph}
 */
export function buildLinkGraph(input) {
  const routes = input?.routes;
  const documents = input?.documents;
  if (!Array.isArray(routes)) throw new TypeError('buildLinkGraph expects an array of ledger routes.');
  if (!Array.isArray(documents)) throw new TypeError('buildLinkGraph expects an array of HTML documents.');
  const journeys = input?.journeys ?? [];
  if (!Array.isArray(journeys)) throw new TypeError('buildLinkGraph expects journeys as an array.');
  const base = input?.base ?? '/';
  const origin = input?.origin ?? DEFAULT_ORIGIN;
  const generator = input?.generator ?? 'src/components/record/nav-graph.mjs';

  /** @type {Map<string, LinkGraphNode>} */
  const nodes = new Map();
  for (const route of routes) {
    if (typeof route?.path !== 'string' || typeof route?.title !== 'string') {
      throw new TypeError('buildLinkGraph found a ledger route without a path and title.');
    }
    if (!nodes.has(route.path)) {
      nodes.set(route.path, {
        id: route.path,
        title: route.title,
        family: route.family ?? null,
        kind: route.kind ?? null,
        indexable: typeof route.indexable === 'boolean' ? route.indexable : null,
        inLedger: true,
        inInventory: true,
        aliasOf: null,
        inboundContent: 0,
        outboundContent: 0,
        inboundChrome: 0,
        outboundChrome: 0,
        journeys: [],
      });
    }
  }

  const documentsByRoute = new Map();
  for (const document of documents) {
    if (typeof document?.route !== 'string' || typeof document?.html !== 'string') {
      throw new TypeError('buildLinkGraph found a document without a route and html string.');
    }
    if (documentsByRoute.has(document.route)) {
      throw new TypeError(`buildLinkGraph found duplicate documents for route: ${document.route}`);
    }
    if (!nodes.has(document.route)) {
      throw new TypeError(`buildLinkGraph found a document outside the ledger: ${document.route}`);
    }
    documentsByRoute.set(document.route, document.html);
  }

  /** @param {string} href @param {string} label @param {string} journeyId */
  const ensureJourneyNode = (href, label, journeyId) => {
    const existing = nodes.get(href);
    if (existing) {
      if (!existing.journeys.includes(journeyId)) existing.journeys.push(journeyId);
      return;
    }
    nodes.set(href, {
      id: href,
      title: label,
      family: null,
      kind: null,
      indexable: null,
      inLedger: false,
      inInventory: false,
      aliasOf: null,
      inboundContent: 0,
      outboundContent: 0,
      inboundChrome: 0,
      outboundChrome: 0,
      journeys: [journeyId],
    });
  };

  /** @type {Map<string, LinkGraphEdge>} */
  const contentPairs = new Map();
  /** @type {Map<string, LinkGraphEdge>} */
  const chromePairs = new Map();
  /** @type {Map<string, {sources: Set<string>, occurrences: number}>} */
  const missingByRoute = new Map();
  /** @type {string[]} */
  const unzoned = [];
  /** @type {{route: string, target: string | null}[]} */
  const aliases = [];
  /** @type {string[]} */
  const undocumented = [];

  const targetOptions = { base, origin };
  for (const node of nodes.values()) {
    if (!node.inLedger) continue;
    const html = documentsByRoute.get(node.id);
    if (html === undefined) {
      undocumented.push(node.id);
      continue;
    }
    const extraction = extractPageLinks(html, node.id, targetOptions);
    if (extraction.unzoned) {
      unzoned.push(node.id);
      continue;
    }
    if (extraction.alias !== null) {
      const aliasClassification = normalizeLinkTarget(extraction.alias, node.id, targetOptions);
      node.aliasOf =
        aliasClassification.kind === 'internal' || aliasClassification.kind === 'missing'
          ? aliasClassification.route
          : extraction.alias;
      aliases.push({ route: node.id, target: node.aliasOf });
      continue;
    }
    for (const observation of extraction.observations) {
      if (!nodes.has(observation.target)) {
        const entry = missingByRoute.get(observation.target) ?? { sources: new Set(), occurrences: 0 };
        entry.sources.add(node.id);
        entry.occurrences += 1;
        missingByRoute.set(observation.target, entry);
        continue;
      }
      const zonePairs = observation.zone === 'content' ? contentPairs : chromePairs;
      const key = `${node.id} ${observation.target}`;
      const existing = zonePairs.get(key);
      if (existing) {
        existing.occurrences += 1;
        if (!existing.label && observation.label) existing.label = observation.label;
      } else {
        zonePairs.set(key, {
          source: node.id,
          target: observation.target,
          occurrences: 1,
          label: observation.label,
        });
      }
    }
  }

  // Journey hrefs that name no ledger page become honestly-labelled
  // journey-only nodes here, so overlay endpoints always resolve — exactly
  // like buildNavUniverse, and never with invented metadata.
  for (const journey of journeys) {
    if (typeof journey?.id !== 'string' || !Array.isArray(journey?.steps)) {
      throw new TypeError('buildLinkGraph found a journey without an id and steps array.');
    }
    for (const step of journey.steps) {
      if (typeof step?.href === 'string') ensureJourneyNode(step.href, step.label ?? step.href, journey.id);
    }
    const next = journey.nextAction;
    if (typeof next?.href === 'string') ensureJourneyNode(next.href, next.label ?? next.href, journey.id);
  }

  const byPairKey = (/** @type {Map<string, LinkGraphEdge>} */ zonePairs) =>
    [...zonePairs.values()].sort((left, right) =>
      left.source.localeCompare(right.source) || left.target.localeCompare(right.target),
    );
  const contentEdges = byPairKey(contentPairs);
  const chromeEdges = byPairKey(chromePairs);

  /** @param {string} source @param {string} target @returns {'content' | 'chrome' | null} */
  const observedZone = (source, target) => {
    if (contentPairs.has(`${source} ${target}`)) return 'content';
    if (chromePairs.has(`${source} ${target}`)) return 'chrome';
    return null;
  };

  /** @type {JourneyOverlayLink[]} */
  const journeyOverlay = [];
  for (const journey of journeys) {
    const stops = journey.steps.filter((step) => typeof step?.href === 'string');
    for (let index = 0; index < stops.length - 1; index += 1) {
      const source = stops[index].href;
      const target = stops[index + 1]?.href ?? '';
      journeyOverlay.push({ source, target, journey: journey.id, kind: 'step', observed: observedZone(source, target) });
    }
    const last = stops[stops.length - 1];
    const next = journey.nextAction;
    if (last && typeof next?.href === 'string' && next.href !== last.href) {
      journeyOverlay.push({
        source: last.href,
        target: next.href,
        journey: journey.id,
        kind: 'next-action',
        observed: observedZone(last.href, next.href),
      });
    }
  }

  /** @type {Map<string, Set<string>>} */
  const inboundContentSources = new Map();
  /** @type {Map<string, Set<string>>} */
  const outboundContentTargets = new Map();
  /** @type {Map<string, Set<string>>} */
  const inboundChromeSources = new Map();
  /** @type {Map<string, Set<string>>} */
  const outboundChromeTargets = new Map();
  const tally = (/** @type {LinkGraphEdge[]} */ edges, inbound, outbound) => {
    for (const edge of edges) {
      if (!inbound.has(edge.target)) inbound.set(edge.target, new Set());
      inbound.get(edge.target)?.add(edge.source);
      if (!outbound.has(edge.source)) outbound.set(edge.source, new Set());
      outbound.get(edge.source)?.add(edge.target);
    }
  };
  tally(contentEdges, inboundContentSources, outboundContentTargets);
  tally(chromeEdges, inboundChromeSources, outboundChromeTargets);
  for (const node of nodes.values()) {
    node.inboundContent = inboundContentSources.get(node.id)?.size ?? 0;
    node.outboundContent = outboundContentTargets.get(node.id)?.size ?? 0;
    node.inboundChrome = inboundChromeSources.get(node.id)?.size ?? 0;
    node.outboundChrome = outboundChromeTargets.get(node.id)?.size ?? 0;
    node.journeys.sort();
  }

  const orphans = [...nodes.values()]
    .filter((node) => node.inLedger && node.inboundContent === 0)
    .map((node) => node.id)
    .sort();
  const missing = [...missingByRoute.entries()]
    .map(([route, entry]) => ({ route, sources: [...entry.sources].sort(), occurrences: entry.occurrences }))
    .sort((left, right) => left.route.localeCompare(right.route));

  const orderedNodes = [...nodes.values()].sort((left, right) => left.id.localeCompare(right.id));
  unzoned.sort();
  undocumented.sort();
  aliases.sort((left, right) => left.route.localeCompare(right.route));

  return {
    schemaVersion: LINK_GRAPH_SCHEMA_VERSION,
    provenance: {
      generator,
      base,
      origin,
      routeCount: routes.length,
      documentCount: documents.length,
      unzoned,
      aliases,
      undocumented,
    },
    summary: {
      nodes: orderedNodes.length,
      contentPairs: contentEdges.length,
      chromePairs: chromeEdges.length,
      journeyLinks: journeyOverlay.length,
      observedJourneyLinks: journeyOverlay.filter((link) => link.observed !== null).length,
      orphans: orphans.length,
      missingCount: missing.length,
    },
    nodes: orderedNodes,
    contentEdges,
    chromeEdges,
    journeyOverlay,
    orphans,
    missing,
  };
}

/**
 * @typedef {object} LinkInboundRow
 * @property {string} path
 * @property {string} title
 * @property {boolean} inInventory
 * @property {number} inbound distinct source pages over content edges only
 * @property {number} occurrences raw content anchor count into the page
 */

/**
 * Indegree leaderboard over content edges only. Chrome (header/footer)
 * repetition is excluded by design: the ranking answers "where does observed
 * body-content linking concentrate", mirroring how `inboundRanking` ignores
 * weak next-action edges.
 *
 * @param {LinkGraph} linkGraph
 * @returns {LinkInboundRow[]} sorted by inbound descending, then occurrences
 * descending, then path ascending
 */
export function linkInboundRanking(linkGraph) {
  const nodes = new Map((linkGraph?.nodes ?? []).map((node) => [node.id, node]));
  /** @type {Map<string, {sources: Set<string>, occurrences: number}>} */
  const inbound = new Map();
  for (const edge of linkGraph?.contentEdges ?? []) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) continue;
    const entry = inbound.get(edge.target) ?? { sources: new Set(), occurrences: 0 };
    entry.sources.add(edge.source);
    entry.occurrences += edge.occurrences;
    inbound.set(edge.target, entry);
  }
  return [...inbound.entries()]
    .map(([path, entry]) => ({
      path,
      title: nodes.get(path)?.title ?? path,
      inInventory: nodes.get(path)?.inInventory ?? false,
      inbound: entry.sources.size,
      occurrences: entry.occurrences,
    }))
    .sort(
      (left, right) =>
        right.inbound - left.inbound || right.occurrences - left.occurrences || left.path.localeCompare(right.path),
    );
}

/**
 * Breadth-first shortest path over observed links. Content edges carry the
 * search by default; pass `includeChrome: true` to also traverse
 * header/footer links — the same opt-in shape as `findNavPath`'s
 * `includeWeak`. Never invents a route: pairs with no observed connection
 * report `unreachable`, and unknown endpoints report `unknown`.
 *
 * @param {LinkGraph} linkGraph
 * @param {string} from
 * @param {string} to
 * @param {LinkPathOptions} [options]
 * @returns {{status: 'same' | 'found' | 'unreachable' | 'unknown', steps?: string[], unknown?: string}}
 */
export function findLinkPath(linkGraph, from, to, options = {}) {
  const known = new Set((linkGraph?.nodes ?? []).map((node) => node.id));
  if (!known.has(from)) return { status: 'unknown', unknown: from };
  if (!known.has(to)) return { status: 'unknown', unknown: to };
  if (from === to) return { status: 'same', steps: [from] };

  /** @type {Map<string, Set<string>>} */
  const forward = new Map();
  const edges =
    options?.includeChrome === true
      ? [...(linkGraph?.contentEdges ?? []), ...(linkGraph?.chromeEdges ?? [])]
      : [...(linkGraph?.contentEdges ?? [])];
  for (const edge of edges) {
    if (!forward.has(edge.source)) forward.set(edge.source, new Set());
    forward.get(edge.source)?.add(edge.target);
  }
  const previous = new Map([[from, null]]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === to) break;
    for (const next of [...(forward.get(current ?? '') ?? [])].sort()) {
      if (!previous.has(next)) {
        previous.set(next, current ?? null);
        queue.push(next);
      }
    }
  }
  if (!previous.has(to)) return { status: 'unreachable' };
  const steps = [];
  let cursor = to;
  while (cursor !== null) {
    steps.unshift(cursor);
    cursor = previous.get(cursor) ?? null;
  }
  return { status: 'found', steps };
}

/**
 * Nearest-hub fallback over content edges: the highest-indegree page
 * reachable from `from`, mirroring `nearestHub`. Returns null when nothing
 * is reachable.
 *
 * @param {LinkGraph} linkGraph
 * @param {string} from
 * @returns {LinkInboundRow | null}
 */
export function nearestLinkHub(linkGraph, from) {
  const known = new Set((linkGraph?.nodes ?? []).map((node) => node.id));
  if (!known.has(from)) return null;
  /** @type {Map<string, Set<string>>} */
  const forward = new Map();
  for (const edge of linkGraph?.contentEdges ?? []) {
    if (!forward.has(edge.source)) forward.set(edge.source, new Set());
    forward.get(edge.source)?.add(edge.target);
  }
  const visited = new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const next of forward.get(current ?? '') ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  visited.delete(from);
  const candidates = linkInboundRanking(linkGraph).filter((row) => visited.has(row.path));
  return candidates[0] ?? null;
}

