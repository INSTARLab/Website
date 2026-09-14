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
