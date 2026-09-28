/**
 * Deferred enhancement for the Record topology.
 *
 * The authored journey graph is complete server-rendered HTML. Once the
 * post-build graph endpoint is available, this module swaps in observed
 * content edges and keeps header/footer edges behind an explicit toggle.
 * Links remain ordinary anchors, so a failed fetch, no-JS browser, or local
 * development server still has a useful journey topology.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const JOURNEY_LANE = 'Journey routes';
const LANE_WIDTH = 240;
const ROW_HEIGHT = 34;
const PAD = 16;
const palette = ['#176b8c', '#6a3fb5', '#1c7c4c', '#b25e09', '#a31f4d', '#4455aa', '#0f766e', '#8a6d00', '#5b5bd6', '#c2410c', '#047857', '#7c3aed'];

interface GraphNode {
  id: string;
  title: string;
  family: string | null;
  inInventory?: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  occurrences?: number;
  label?: string;
}

interface JourneyOverlay {
  source: string;
  target: string;
  journey: string;
  kind: 'step' | 'next-action';
  observed: 'content' | 'chrome' | null;
}

interface LinkGraphPayload {
  schemaVersion: number;
  provenance?: { routeCount?: number; documentCount?: number; generator?: string };
  summary?: { nodes?: number; contentPairs?: number; chromePairs?: number; journeyLinks?: number; observedJourneyLinks?: number };
  nodes: GraphNode[];
  contentEdges: GraphEdge[];
  chromeEdges: GraphEdge[];
  journeyOverlay: JourneyOverlay[];
}

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function preview(path: string): void {
  document.dispatchEvent(new CustomEvent('record:preview-route', { detail: { path } }));
}

function usesNativeNavigation(event: MouseEvent | KeyboardEvent, link: Element): boolean {
  const target = link.getAttribute('target');
  return event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
    || ('button' in event && event.button !== 0)
    || Boolean(target && target.toLowerCase() !== '_self') || link.hasAttribute('download');
}

function routeHref(root: HTMLElement, path: string): string {
  // Astro does not emit a <base> element. The endpoint is passed through
  // recordHref(), so its prefix is the authoritative deployment base for
  // dynamically-created node links (`/` or `/Website/`).
  const endpoint = root.dataset.graphEndpoint ?? '';
  const marker = '/record/graph.json';
  const base = endpoint.endsWith(marker) ? endpoint.slice(0, -marker.length) : '';
  return `${base}${path.startsWith('/') ? path : `/${path}`}` || '/';
}

function makeSvgElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

function graphNodes(root: HTMLElement): HTMLAnchorElement[] {
  return [...root.querySelectorAll<HTMLAnchorElement>('a[data-graph-node]')];
}

function graphNodeSet(root: HTMLElement): Set<string> {
  return new Set(graphNodes(root).map((link) => link.dataset.graphNode ?? ''));
}

function neighbourhood(root: HTMLElement, path: string): Set<string> {
  const near = new Set([path]);
  for (const edge of root.querySelectorAll<HTMLElement>('[data-graph-edge]')) {
    const layer = edge.closest<HTMLElement | SVGElement>('[data-graph-layer]');
    if (layer?.hasAttribute('hidden')) continue;
    const [source, target] = (edge.dataset.graphEdge ?? '').split(' ');
    if (source === path && target) near.add(target);
    if (target === path && source) near.add(source);
  }
  return near;
}

function dimExcept(root: HTMLElement, svg: SVGSVGElement, keep: Set<string> | null): void {
  svg.classList.toggle('is-focus', keep !== null);
  for (const link of graphNodes(root)) {
    const dim = keep !== null && !keep.has(link.dataset.graphNode ?? '');
    link.classList.toggle('is-dim', dim);
  }
}

function bindNodeInteractions(root: HTMLElement, svg: SVGSVGElement, pinned: () => string | null, applyPin: (path: string | null) => void, onFocusChange: (path: string | null) => void): void {
  for (const link of graphNodes(root)) {
    const path = link.dataset.graphNode ?? '';
    link.addEventListener('mouseenter', () => { onFocusChange(path); dimExcept(root, svg, neighbourhood(root, path)); });
    link.addEventListener('mouseleave', () => { onFocusChange(null); dimExcept(root, svg, pinned() ? neighbourhood(root, pinned()!) : null); });
    link.addEventListener('focus', () => { onFocusChange(path); dimExcept(root, svg, neighbourhood(root, path)); });
    link.addEventListener('blur', () => { onFocusChange(null); dimExcept(root, svg, pinned() ? neighbourhood(root, pinned()!) : null); });

    const visibleInventoryRow = (): HTMLTableRowElement | undefined =>
      [...document.querySelectorAll<HTMLTableRowElement>('[data-route-item]')].find((item) =>
        item.querySelector('code')?.textContent?.trim() === path
          && item.getClientRects().length > 0 && getComputedStyle(item).visibility === 'visible',
      );

    // Pointer activation previews the node while preserving modified, middle,
    // target, download, and filtered/journey-only native link behavior.
    link.addEventListener('click', (event) => {
      if (usesNativeNavigation(event, link) || !visibleInventoryRow()) return;
      event.preventDefault();
      applyPin(path);
    });
    link.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || usesNativeNavigation(event, link)) return;
      const row = visibleInventoryRow();
      if (!row) return;
      event.preventDefault();
      preview(path);
      row.querySelector<HTMLAnchorElement>('a[href]')?.focus();
      row.scrollIntoView({ block: 'nearest' });
    });
  }
}

function setHidden(element: Element | null, hidden: boolean): void {
  if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) return;
  element.toggleAttribute('hidden', hidden);
}

function layoutNodes(nodes: GraphNode[]): { lanes: string[]; positions: Map<string, { x: number; y: number }>; width: number; height: number } {
  const lanes: string[] = [];
  for (const node of nodes) {
    const lane = node.family ?? JOURNEY_LANE;
    if (!lanes.includes(lane)) lanes.push(lane);
  }
  const laneNodes = lanes.map((lane) => nodes.filter((node) => (node.family ?? JOURNEY_LANE) === lane));
  const positions = new Map<string, { x: number; y: number }>();
  laneNodes.forEach((items, laneIndex) => {
    items.forEach((node, rowIndex) => {
      positions.set(node.id, { x: PAD + laneIndex * LANE_WIDTH + 12, y: PAD + 44 + rowIndex * ROW_HEIGHT + 12 });
    });
  });
  return {
    lanes,
    positions,
    width: lanes.length * LANE_WIDTH + PAD * 2,
    height: Math.max(...laneNodes.map((items) => items.length), 1) * ROW_HEIGHT + 44 + PAD * 2,
  };
}

function drawLine(parent: SVGElement, edge: GraphEdge, positions: Map<string, { x: number; y: number }>, zone: string, style: { stroke: string; dash?: string; opacity?: string }): void {
  const from = positions.get(edge.source);
  const to = positions.get(edge.target);
  if (!from || !to) return;
  const line = makeSvgElement('line');
  line.setAttribute('x1', String(from.x));
  line.setAttribute('y1', String(from.y));
  line.setAttribute('x2', String(to.x));
  line.setAttribute('y2', String(to.y));
  line.setAttribute('stroke', style.stroke);
  line.setAttribute('stroke-width', '1.5');
  if (style.dash) line.setAttribute('stroke-dasharray', style.dash);
  if (style.opacity) line.setAttribute('opacity', style.opacity);
  line.dataset.graphEdge = `${edge.source} ${edge.target}`;
  line.dataset.graphEdgeZone = zone;
  if (edge.label) {
    const title = makeSvgElement('title');
    title.textContent = edge.label;
    line.append(title);
  }
  parent.append(line);
}

function renderLoadedGraph(root: HTMLElement, svg: SVGSVGElement, graph: LinkGraphPayload): ViewBox {
  const layout = layoutNodes(graph.nodes);
  const laneLayer = svg.querySelector<SVGGElement>('[data-graph-lanes]');
  const contentLayer = svg.querySelector<SVGGElement>('[data-graph-content-layer]');
  const journeyLayer = svg.querySelector<SVGGElement>('[data-graph-journey-layer]');
  const chromeLayer = svg.querySelector<SVGGElement>('[data-graph-chrome-layer]');
  const nodeLayer = svg.querySelector<SVGGElement>('[data-graph-nodes]');
  if (!laneLayer || !contentLayer || !journeyLayer || !chromeLayer || !nodeLayer) throw new Error('topology layers are incomplete');

  laneLayer.replaceChildren();
  layout.lanes.forEach((lane, laneIndex) => {
    const label = makeSvgElement('text');
    label.setAttribute('x', String(PAD + laneIndex * LANE_WIDTH + 12));
    label.setAttribute('y', String(PAD + 20));
    label.setAttribute('font-size', '12');
    label.setAttribute('font-weight', '700');
    label.setAttribute('fill', '#526675');
    label.textContent = lane;
    laneLayer.append(label);
  });

  contentLayer.replaceChildren();
  graph.contentEdges.forEach((edge) => drawLine(contentLayer, edge, layout.positions, 'content', { stroke: '#176b8c', opacity: '0.7' }));
  chromeLayer.replaceChildren();
  graph.chromeEdges.forEach((edge) => drawLine(chromeLayer, edge, layout.positions, 'chrome', { stroke: '#a31f4d', dash: '2 4', opacity: '0.72' }));
  journeyLayer.replaceChildren();
  graph.journeyOverlay.forEach((edge) => drawLine(journeyLayer, edge, layout.positions, 'journey', { stroke: '#7c3aed', dash: edge.kind === 'next-action' ? '5 4' : '2 3', opacity: '0.8' }));

  nodeLayer.replaceChildren();
  graph.nodes.forEach((node) => {
    const at = layout.positions.get(node.id);
    if (!at) return;
    const lane = node.family ?? JOURNEY_LANE;
    const color = palette[layout.lanes.indexOf(lane) % palette.length];
    const link = makeSvgElement('a');
    link.setAttribute('href', routeHref(root, node.id));
    link.dataset.graphNode = node.id;
    link.setAttribute('aria-label', `${node.title}, ${node.id}`);
    const title = makeSvgElement('title');
    title.textContent = `${node.title} (${node.id})`;
    const circle = makeSvgElement('circle');
    circle.setAttribute('cx', String(at.x));
    circle.setAttribute('cy', String(at.y));
    circle.setAttribute('r', '7');
    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', '#fff');
    circle.setAttribute('stroke-width', '2');
    circle.dataset.graphDot = node.id;
    const label = makeSvgElement('text');
    label.setAttribute('x', String(at.x + 13));
    label.setAttribute('y', String(at.y + 4));
    label.setAttribute('font-size', '12');
    label.setAttribute('fill', '#122535');
    label.dataset.graphLabel = node.id;
    label.textContent = node.title.length > 26 ? `${node.title.slice(0, 25)}…` : node.title;
    link.append(title, circle, label);
    nodeLayer.append(link);
  });

  svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
  svg.setAttribute('width', String(layout.width));
  svg.setAttribute('height', String(Math.min(layout.height, 560)));
  svg.setAttribute('aria-label', `Link topology: ${graph.nodes.length} stops, ${graph.contentEdges.length} observed content links, ${graph.chromeEdges.length} header/footer links, ${graph.journeyOverlay.length} journey overlay links`);

  const contentToggle = root.querySelector<HTMLInputElement>('[data-graph-content-toggle]');
  const chromeToggle = root.querySelector<HTMLInputElement>('[data-graph-chrome-toggle]');
  if (contentToggle) contentToggle.disabled = false;
  if (chromeToggle) chromeToggle.disabled = false;
  setHidden(contentLayer, contentToggle?.checked !== true);
  setHidden(chromeLayer, chromeToggle?.checked !== true);

  const summary = root.querySelector<HTMLElement>('[data-graph-description]');
  if (summary) summary.textContent = `${graph.nodes.length} built routes with ${graph.contentEdges.length} observed content links and ${graph.chromeEdges.length} observed header/footer links. Journey overlays remain labelled (${graph.journeyOverlay.length} links). Choosing a node previews the route; Enter on a node moves to its inventory-table row.`;
  const status = root.querySelector<HTMLElement>('[data-graph-status]');
  if (status) {
    status.dataset.graphState = 'loaded';
    status.textContent = `Loaded post-build link graph: ${graph.provenance?.documentCount ?? graph.nodes.length} documents, ${graph.summary?.contentPairs ?? graph.contentEdges.length} content pairs, ${graph.summary?.chromePairs ?? graph.chromeEdges.length} chrome pairs.`;
  }
  root.dataset.graphState = 'loaded';
  root.dataset.graphContentCount = String(graph.contentEdges.length);
  root.dataset.graphChromeCount = String(graph.chromeEdges.length);
  root.dataset.graphJourneyCount = String(graph.journeyOverlay.length);
  const provenance = root.querySelector<HTMLElement>('[data-graph-provenance]');
  if (provenance) {
    provenance.hidden = false;
    provenance.textContent = `Provenance: ${graph.provenance?.generator ?? 'post-build link graph'} · ${graph.nodes.length} nodes · ${graph.contentEdges.length} content pairs · ${graph.chromeEdges.length} header/footer pairs.`;
  }

  const stopList = root.querySelector<HTMLElement>('[data-graph-stop-list]');
  if (stopList) {
    stopList.replaceChildren();
    graph.nodes.forEach((node) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = routeHref(root, node.id);
      link.textContent = node.title;
      const path = document.createElement('span');
      path.className = 'text-body-secondary';
      path.textContent = ` ${node.id}${node.inInventory ? '' : ' · built ledger route'}`;
      item.append(link, path);
      stopList.append(item);
    });
  }
  const journeyList = root.querySelector<HTMLElement>('[data-graph-journey-list]');
  if (journeyList) {
    journeyList.replaceChildren();
    graph.journeyOverlay.forEach((edge) => {
      const item = document.createElement('li');
      item.dataset.graphJourney = edge.journey;
      item.textContent = `${edge.source} → ${edge.target} (${edge.journey} ${edge.kind}; ${edge.observed ? `observed ${edge.observed}` : 'journey-only'})`;
      journeyList.append(item);
    });
  }
  const titleByPath = new Map(graph.nodes.map((node) => [node.id, node.title]));
  const relationshipText = (edge: GraphEdge): string => {
    const source = titleByPath.get(edge.source) ?? edge.source;
    const target = titleByPath.get(edge.target) ?? edge.target;
    const count = edge.occurrences === undefined ? '' : ` · ${edge.occurrences} occurrence${edge.occurrences === 1 ? '' : 's'}`;
    const label = edge.label ? ` · ${edge.label}` : '';
    return `${source} (${edge.source}) → ${target} (${edge.target})${count}${label}`;
  };
  const contentList = root.querySelector<HTMLElement>('[data-graph-content-list]');
  if (contentList) {
    contentList.replaceChildren();
    graph.contentEdges.forEach((edge) => {
      const item = document.createElement('li');
      item.dataset.graphContentEdge = `${edge.source} ${edge.target}`;
      item.textContent = relationshipText(edge);
      contentList.append(item);
    });
  }
  const chromeList = root.querySelector<HTMLElement>('[data-graph-chrome-list]');
  if (chromeList) {
    chromeList.replaceChildren();
    graph.chromeEdges.forEach((edge) => {
      const item = document.createElement('li');
      item.dataset.graphChromeEdge = `${edge.source} ${edge.target}`;
      item.textContent = relationshipText(edge);
      chromeList.append(item);
    });
  }
  const observedNote = root.querySelector<HTMLElement>('[data-graph-observed-note]');
  if (observedNote) observedNote.textContent = `${graph.contentEdges.length} content relationships and ${graph.chromeEdges.length} header/footer relationships observed in the built pages.`;
  const fallbackSummary = root.querySelector<HTMLDetailsElement>('[data-graph-fallback] summary');
  if (fallbackSummary) fallbackSummary.textContent = `Topology as text (${graph.nodes.length} stops, ${graph.contentEdges.length + graph.chromeEdges.length + graph.journeyOverlay.length} observed and journey links)`;

  return { x: 0, y: 0, width: layout.width, height: layout.height };
}

function validLinkGraph(value: unknown): value is LinkGraphPayload {
  if (!value || typeof value !== 'object') return false;
  const graph = value as Partial<LinkGraphPayload>;
  return graph.schemaVersion === 2 && Array.isArray(graph.nodes) && Array.isArray(graph.contentEdges)
    && Array.isArray(graph.chromeEdges) && Array.isArray(graph.journeyOverlay)
    && graph.nodes.every((node) => typeof node?.id === 'string' && typeof node?.title === 'string');
}

async function loadObservedGraph(root: HTMLElement, svg: SVGSVGElement, setHome: (view: ViewBox) => void, bind: () => void): Promise<void> {
  const endpoint = root.dataset.graphEndpoint;
  if (!endpoint) return;
  try {
    const response = await fetch(endpoint, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`graph endpoint returned ${response.status}`);
    const payload = await response.json() as { linkGraph?: unknown };
    if (!validLinkGraph(payload.linkGraph)) throw new Error('graph endpoint has no compatible linkGraph payload');
    const home = renderLoadedGraph(root, svg, payload.linkGraph);
    setHome(home);
    bind();
    root.dispatchEvent(new CustomEvent('record:link-graph-loaded', { detail: payload.linkGraph }));
  } catch {
    root.dataset.graphState = 'journey-fallback';
    const status = root.querySelector<HTMLElement>('[data-graph-status]');
    if (status) status.textContent = 'Showing the authored journey fallback; the post-build link graph is unavailable.';
  }
}

function initGraph(root: HTMLElement): void {
  const svg = root.querySelector<SVGSVGElement>('[data-graph-svg]');
  if (!svg) return;

  let pinned: string | null = null;
  let focused: string | null = null;
  let home: ViewBox = { x: svg.viewBox.baseVal.x, y: svg.viewBox.baseVal.y, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height };
  const current = (): ViewBox => {
    const view = svg.viewBox.baseVal;
    return { x: view.x, y: view.y, width: view.width, height: view.height };
  };
  const setView = (view: ViewBox): void => svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
  const applyPin = (path: string | null): void => {
    pinned = path;
    for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-inbound-link]')) {
      if (link.dataset.inboundLink === path && path !== null) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    dimExcept(root, svg, path ? neighbourhood(root, path) : null);
    if (path) preview(path);
  };
  const refreshFocus = (): void => {
    const path = focused ?? pinned;
    dimExcept(root, svg, path ? neighbourhood(root, path) : null);
  };
  const bindNodes = (): void => bindNodeInteractions(
    root,
    svg,
    () => pinned,
    applyPin,
    (path) => { focused = path; },
  );

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && pinned) {
      event.preventDefault();
      applyPin(null);
    }
  });

  for (const row of document.querySelectorAll<HTMLAnchorElement>('[data-inbound-link]')) {
    row.addEventListener('click', (event) => {
      if (usesNativeNavigation(event, row)) return;
      const path = row.dataset.inboundLink ?? '';
      if (!graphNodeSet(root).has(path)) return;
      event.preventDefault();
      applyPin(pinned === path ? null : path);
    });
  }

  bindNodes();

  const zoom = (factor: number): void => {
    const view = current();
    const cx = view.x + view.width / 2;
    const cy = view.y + view.height / 2;
    const width = Math.min(home.width * 2, Math.max(home.width / 8, view.width * factor));
    const height = (width * home.height) / home.width;
    setView({ x: cx - width / 2, y: cy - height / 2, width, height });
  };
  root.querySelector('[data-graph-zoom-in]')?.addEventListener('click', () => zoom(0.75));
  root.querySelector('[data-graph-zoom-out]')?.addEventListener('click', () => zoom(1.33));
  root.querySelector('[data-graph-reset]')?.addEventListener('click', () => setView(home));

  const contentToggle = root.querySelector<HTMLInputElement>('[data-graph-content-toggle]');
  const chromeToggle = root.querySelector<HTMLInputElement>('[data-graph-chrome-toggle]');
  contentToggle?.addEventListener('change', () => {
    setHidden(root.querySelector('[data-graph-content-layer]'), !contentToggle.checked);
    refreshFocus();
  });
  chromeToggle?.addEventListener('change', () => {
    setHidden(root.querySelector('[data-graph-chrome-layer]'), !chromeToggle.checked);
    refreshFocus();
  });
  // Keep the layer control delegated as well: Astro can replace the SVG
  // contents after the fetch, while the checkbox remains the stable control.
  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.matches('[data-graph-content-toggle]')) {
      setHidden(root.querySelector('[data-graph-content-layer]'), !target.checked);
      refreshFocus();
    }
    if (target.matches('[data-graph-chrome-toggle]')) {
      setHidden(root.querySelector('[data-graph-chrome-layer]'), !target.checked);
      refreshFocus();
    }
  });

  let dragging: { x: number; y: number } | null = null;
  svg.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || (event.target instanceof Element && event.target.closest('a'))) return;
    dragging = { x: event.clientX, y: event.clientY };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    const view = current();
    const dx = ((dragging.x - event.clientX) / rect.width) * view.width;
    const dy = ((dragging.y - event.clientY) / rect.height) * view.height;
    dragging = { x: event.clientX, y: event.clientY };
    setView({ ...view, x: view.x + dx, y: view.y + dy });
  });
  for (const done of ['pointerup', 'pointercancel', 'pointerleave']) svg.addEventListener(done, () => { dragging = null; });

  void loadObservedGraph(root, svg, (view) => { home = view; setView(view); }, bindNodes);
}

for (const root of document.querySelectorAll<HTMLElement>('[data-route-graph]')) initGraph(root);
