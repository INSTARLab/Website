/**
 * route-path.ts — deferred enhancement for the RouteFinder.
 *
 * Selects, checkbox, and result region are server-rendered; the recorded
 * edge lists travel in the embedded JSON blob. This module runs the same
 * breadth-first search as `nav-graph.mjs` against those edges (duplicated
 * deliberately: the shared module cannot type the embedded JSON without a
 * build-time codegen step, and the logic is twelve lines). Unreachable pairs
 * name the journeys searched and offer the nearest hub; nothing is invented.
 */

interface FinderGraph {
  nodes: Array<{ path: string; title: string }>;
  contentEdges: Array<{ source: string; target: string; journey: string }>;
  weakEdges: Array<{ source: string; target: string; journey: string }>;
  journeys: Array<{ id: string; label: string }>;
}

function findPath(graph: FinderGraph, from: string, to: string, includeWeak: boolean): string[] | null {
  if (from === to) return [from];
  const forward = new Map<string, Set<string>>();
  const edges = includeWeak ? [...graph.contentEdges, ...graph.weakEdges] : graph.contentEdges;
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
  let graph: FinderGraph = { nodes: [], contentEdges: [], weakEdges: [], journeys: [] };
  try {
    graph = JSON.parse(dataEl?.textContent ?? '') as FinderGraph;
  } catch {
    return;
  }
  const base = (() => {
    const attr = document.querySelector('base')?.getAttribute('href') ?? '/';
    return attr.endsWith('/') ? attr.slice(0, -1) : attr;
  })();
  const titles = new Map(graph.nodes.map((node) => [node.path, node.title]));
  const journeyNames = graph.journeys.map((journey) => journey.label).join(', ');
  const form = root.querySelector<HTMLFormElement>('[data-finder-form]');
  const fromEl = root.querySelector<HTMLSelectElement>('[data-finder-from]');
  const toEl = root.querySelector<HTMLSelectElement>('[data-finder-to]');
  const weakEl = root.querySelector<HTMLInputElement>('[data-finder-weak]');
  const result = root.querySelector<HTMLElement>('[data-finder-result]');
  const emptyHint = 'Choose two stops and select Find. The recorded steps appear here as links; Esc clears the result.';
  if (!form || !fromEl || !toEl || !result) return;

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
    const steps = findPath(graph, from, to, includeWeak);
    if (steps) {
      const via = includeWeak ? ' (including next-action exits)' : '';
      renderSteps(
        steps.length === 1
          ? `Start and destination are the same stop: ${titles.get(from) ?? from}.`
          : `Recorded path from ${titles.get(from) ?? from} to ${titles.get(to) ?? to}: ${steps.length - 1} step${steps.length === 2 ? '' : 's'}${via}.`,
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
    paragraph.textContent = `No recorded path from ${titles.get(from) ?? from} to ${titles.get(to) ?? to} across ${graph.journeys.length} journeys (${journeyNames}).`;
    result.append(paragraph);
    const hub = nearestHub(graph, from);
    if (hub) {
      const suggestion = document.createElement('p');
      suggestion.className = 'small text-body-secondary mb-0';
      suggestion.textContent = `Nearest hub reachable from the start: ${hub.title} (${hub.path}), with ${hub.inbound} inbound journey step${hub.inbound === 1 ? '' : 's'}. `;
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
}

for (const root of document.querySelectorAll<HTMLElement>('[data-route-finder]')) initFinder(root);
