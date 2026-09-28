/**
 * route-path.ts — deferred enhancement for the RouteFinder.
 *
 * Selects, checkbox, and result region are server-rendered; the recorded
 * edge lists travel in the embedded JSON blob. This module runs the same
 * breadth-first search as `nav-graph.mjs` against those edges (duplicated
 * deliberately: the shared module cannot type the embedded JSON without a
 * build-time codegen step, and the logic is twelve lines). Unreachable pairs
 * name the journeys searched and offer the nearest hub; nothing is invented.
 *
 * Edge-semantics contract (shared with `findLinkPath` in `nav-graph.mjs`):
 * content edges carry every search by default; chrome (header/footer) edges
 * only join when the caller opts in, so chrome repetition can never invent
 * connectedness. Weak next-action edges keep their own existing opt-in.
 */

interface FinderGraph {
  nodes: Array<{ path: string; title: string; family?: string | null; inInventory?: boolean }>;
  contentEdges: Array<{ source: string; target: string; journey?: string }>;
  weakEdges: Array<{ source: string; target: string; journey?: string }>;
  /** Observed header/footer pairs. Excluded unless the caller passes includeChrome. */
  chromeEdges?: Array<{ source: string; target: string }>;
  journeys: Array<{ id: string; label: string }>;
}

function observedEdges(graph: FinderGraph, includeWeak: boolean, includeChrome: boolean): Array<{ source: string; target: string }> {
  return [
    ...graph.contentEdges,
    ...(includeChrome ? (graph.chromeEdges ?? []) : []),
    ...(includeWeak ? graph.weakEdges : []),
  ];
}

function findPath(graph: FinderGraph, from: string, to: string, includeWeak: boolean, includeChrome = false): string[] | null {
  const known = new Set(graph.nodes.map((node) => node.path));
  if (!known.has(from) || !known.has(to)) return null;
  if (from === to) return [from];
  const forward = new Map<string, Set<string>>();
  const edges = observedEdges(graph, includeWeak, includeChrome);
  for (const edge of edges) {
    if (!forward.has(edge.source)) forward.set(edge.source, new Set());
    forward.get(edge.source)?.add(edge.target);
  }
  const previous = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift() ?? '';
    if (current === to) break;
    for (const next of [...(forward.get(current) ?? [])].sort()) {
      if (!previous.has(next)) {
        previous.set(next, current);
        queue.push(next);
      }
    }
  }
  if (!previous.has(to)) return null;
  const steps: string[] = [];
  let cursor: string | null = to;
  while (cursor !== null) {
    steps.unshift(cursor);
    cursor = previous.get(cursor) ?? null;
  }
  return steps;
}

function nearestHub(graph: FinderGraph, from: string): { path: string; title: string; inbound: number } | null {
  const forward = new Map<string, Set<string>>();
  for (const edge of graph.contentEdges) {
    if (!forward.has(edge.source)) forward.set(edge.source, new Set());
    forward.get(edge.source)?.add(edge.target);
  }
  const visited = new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift() ?? '';
    for (const next of forward.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  visited.delete(from);
  const inbound = new Map<string, number>();
  for (const edge of graph.contentEdges) {
    if (visited.has(edge.target)) inbound.set(edge.target, (inbound.get(edge.target) ?? 0) + 1);
  }
  let best: { path: string; title: string; inbound: number } | null = null;
  for (const node of graph.nodes) {
    const count = inbound.get(node.path) ?? 0;
    if (count === 0) continue;
    if (!best || count > best.inbound || (count === best.inbound && node.path < best.path)) {
      best = { path: node.path, title: node.title, inbound: count };
    }
  }
  return best;
}

function initFinder(root: HTMLElement): void {
  const dataEl = root.querySelector<HTMLScriptElement>('[data-finder-graph]');
  let graph: FinderGraph = { nodes: [], contentEdges: [], weakEdges: [], chromeEdges: [], journeys: [] };
  try {
    graph = JSON.parse(dataEl?.textContent ?? '') as FinderGraph;
  } catch {
    return;
  }
  const base = (() => {
    // Astro does not emit a <base> element. The endpoint URL is produced by
    // recordHref(), so its prefix is the authoritative deployment base for
    // result links (`/` or `/Website/`).
    const endpoint = root.dataset.finderEndpoint ?? '';
    const marker = '/record/graph.json';
    if (endpoint.endsWith(marker)) return endpoint.slice(0, -marker.length);
    const attr = document.querySelector('base')?.getAttribute('href') ?? '/';
    return attr.endsWith('/') ? attr.slice(0, -1) : attr;
  })();
  let titles = new Map(graph.nodes.map((node) => [node.path, node.title]));
  const journeyNames = graph.journeys.map((journey) => journey.label).join(', ');
  let graphSource: 'journey' | 'observed' = 'journey';
  const form = root.querySelector<HTMLFormElement>('[data-finder-form]');
  const fromEl = root.querySelector<HTMLSelectElement>('[data-finder-from]');
  const toEl = root.querySelector<HTMLSelectElement>('[data-finder-to]');
  const weakEl = root.querySelector<HTMLInputElement>('[data-finder-weak]');
  const chromeEl = root.querySelector<HTMLInputElement>('[data-finder-chrome]');
  const result = root.querySelector<HTMLElement>('[data-finder-result]');
  const source = root.querySelector<HTMLElement>('[data-finder-source]');
  const emptyHint = 'Choose two stops and select Find. The recorded steps appear here as links; Esc clears the result.';
  if (!form || !fromEl || !toEl || !result) return;

  const renderOptions = (selectedFrom: string, selectedTo: string): void => {
    const inventory = graph.nodes.filter((node) => node.inInventory !== false);
    const journeyOnly = graph.nodes.filter((node) => node.inInventory === false);
    const group = (label: string, entries: typeof graph.nodes): HTMLOptGroupElement => {
      const element = document.createElement('optgroup');
      element.label = label;
      for (const node of entries) {
        const option = document.createElement('option');
        option.value = node.path;
        option.textContent = `${node.title} — ${node.path}`;
        element.append(option);
      }
      return element;
    };
    fromEl.replaceChildren(group('Site inventory', inventory));
    toEl.replaceChildren(group('Site inventory', inventory));
    if (journeyOnly.length > 0) {
      fromEl.append(group('Built ledger routes', journeyOnly));
      toEl.append(group('Built ledger routes', journeyOnly));
    }
    fromEl.value = graph.nodes.some((node) => node.path === selectedFrom) ? selectedFrom : (graph.nodes[0]?.path ?? '');
    toEl.value = graph.nodes.some((node) => node.path === selectedTo) ? selectedTo : (graph.nodes.find((node) => node.path === '/record/federal/')?.path ?? graph.nodes.at(-1)?.path ?? '');
  };

  const renderSteps = (summary: string, steps: string[]): void => {
    result.innerHTML = '';
    const paragraph = document.createElement('p');
    paragraph.className = 'fw-semibold mb-2';
    paragraph.tabIndex = -1;
    paragraph.dataset.finderSummary = '';
    paragraph.textContent = summary;
    const list = document.createElement('ol');
    list.className = 'mb-0';
    for (const path of steps) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = base + path;
      link.textContent = `${titles.get(path) ?? path} (${path})`;
      item.append(link);
      list.append(item);
    }
    result.append(paragraph, list);
    paragraph.focus({ preventScroll: true });
  };

  const run = (): void => {
    const from = fromEl.value;
    const to = toEl.value;
    const includeWeak = weakEl?.checked === true;
    const includeChrome = chromeEl?.checked === true;
    const steps = findPath(graph, from, to, includeWeak, includeChrome);
    if (steps) {
      const via = [includeWeak ? 'next-action exits' : '', includeChrome ? 'header/footer links' : ''].filter(Boolean);
      const viaLabel = via.length > 0 ? ` (including ${via.join(' and ')})` : '';
      const sourceLabel = graphSource === 'observed' ? 'Observed content path' : 'Recorded journey path';
      renderSteps(
        steps.length === 1
          ? `Start and destination are the same stop: ${titles.get(from) ?? from}.`
          : `${sourceLabel} from ${titles.get(from) ?? from} to ${titles.get(to) ?? to}: ${steps.length - 1} step${steps.length === 2 ? '' : 's'}${viaLabel}.`,
        steps,
      );
      document.dispatchEvent(new CustomEvent('record:preview-route', { detail: { path: to } }));
      return;
    }
    result.innerHTML = '';
    const paragraph = document.createElement('p');
    paragraph.className = 'fw-semibold mb-2';
    paragraph.tabIndex = -1;
    paragraph.dataset.finderSummary = '';
    paragraph.textContent = graphSource === 'observed'
      ? `No observed content path from ${titles.get(from) ?? from} to ${titles.get(to) ?? to}${includeChrome ? ' with the selected header/footer links' : ''} across ${graph.contentEdges.length} observed content relationships.`
      : `No recorded path from ${titles.get(from) ?? from} to ${titles.get(to) ?? to} across ${graph.journeys.length} authored journeys (${journeyNames}).`;
    result.append(paragraph);
    const hub = nearestHub(graph, from);
    if (hub) {
      const suggestion = document.createElement('p');
      suggestion.className = 'small text-body-secondary mb-0';
      suggestion.textContent = graphSource === 'observed'
        ? `Nearest content hub reachable from the start: ${hub.title} (${hub.path}), with ${hub.inbound} inbound content relationship${hub.inbound === 1 ? '' : 's'}. `
        : `Nearest hub reachable from the start: ${hub.title} (${hub.path}), with ${hub.inbound} inbound journey step${hub.inbound === 1 ? '' : 's'}. `;
      const link = document.createElement('a');
      link.href = base + hub.path;
      link.textContent = 'Preview the hub';
      link.addEventListener('click', (event) => {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent('record:preview-route', { detail: { path: hub.path } }));
      });
      suggestion.append(link);
      result.append(suggestion);
    }
    paragraph.focus({ preventScroll: true });
  };

  const clear = (): void => {
    result.innerHTML = '';
    const paragraph = document.createElement('p');
    paragraph.className = 'small text-body-secondary mb-0';
    paragraph.textContent = emptyHint;
    result.append(paragraph);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run();
  });
  root.querySelector('[data-finder-clear]')?.addEventListener('click', clear);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      clear();
      fromEl.focus();
    }
  });

  const endpoint = root.dataset.finderEndpoint;
  if (endpoint) {
    void (async () => {
      try {
        const response = await fetch(endpoint, { headers: { accept: 'application/json' } });
        if (!response.ok) throw new Error(`graph endpoint returned ${response.status}`);
        const payload = await response.json() as { linkGraph?: { schemaVersion?: number; nodes?: Array<{ id: string; title: string; family?: string | null; inInventory?: boolean }>; contentEdges?: FinderGraph['contentEdges']; chromeEdges?: Array<{ source: string; target: string }>; journeyOverlay?: Array<{ source: string; target: string; journey: string; kind: 'step' | 'next-action' }> } };
        const observed = payload.linkGraph;
        if (!observed || observed.schemaVersion !== 2 || !Array.isArray(observed.nodes) || !Array.isArray(observed.contentEdges) || !Array.isArray(observed.chromeEdges)) throw new Error('graph endpoint has no compatible linkGraph payload');
        graph = {
          nodes: observed.nodes.map((node) => ({ path: node.id, title: node.title, family: node.family, inInventory: node.inInventory })),
          contentEdges: observed.contentEdges,
          chromeEdges: observed.chromeEdges,
          // The compatibility journey manifest remains the source for weak
          // next-action exits; observed journey links are labels, not paths.
          weakEdges: graph.weakEdges,
          journeys: graph.journeys,
        };
        graphSource = 'observed';
        titles = new Map(graph.nodes.map((node) => [node.path, node.title]));
        renderOptions(fromEl.value, toEl.value);
        if (chromeEl) chromeEl.disabled = false;
        if (source) source.textContent = `Loaded post-build link graph: ${graph.nodes.length} nodes, ${observed.contentEdges.length} observed content pairs, ${observed.chromeEdges.length} observed header/footer pairs. Content is searched by default.`;
        root.dataset.finderState = 'loaded';
        root.dataset.finderContentCount = String(observed.contentEdges.length);
        root.dataset.finderChromeCount = String(observed.chromeEdges.length);
        root.dataset.finderJourneyFallback = 'retained';
      } catch {
        root.dataset.finderState = 'journey-fallback';
        if (source) source.textContent = 'Using the authored journey graph; the post-build link graph is unavailable.';
      }
    })();
  }
}

for (const root of document.querySelectorAll<HTMLElement>('[data-route-finder]')) initFinder(root);
